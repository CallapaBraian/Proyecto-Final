// src/routes/contact.js
const { Router } = require("express");
const { PrismaClient, InquiryStatus } = require("@prisma/client");
const { z, ZodError } = require("zod");
const { authRequired, requireRole } = require("../middlewares/auth");

const prisma = new PrismaClient();
const r = Router();

/* ============================================================
   ZOD SCHEMAS
============================================================ */
const createInquirySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6).optional().nullable(),
  subject: z.string().min(3),
  message: z.string().min(10),
});

const updateStatusSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "ANSWERED", "CLOSED"]),
});

const respondToInquirySchema = z.object({
  response: z.string().min(5),
});

/* ============================================================
   POST /contact
   Crear una nueva consulta (PÚBLICA, sin autenticación)
============================================================ */
r.post("/", async (req, res) => {
  try {
    const data = createInquirySchema.parse(req.body);

    const inquiry = await prisma.inquiry.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        message: data.message,
        status: InquiryStatus.NEW,
      },
    });

    return res.status(201).json({
      message: "Consulta recibida. Te contactaremos pronto.",
      data: inquiry,
    });
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({ error: e.issues[0]?.message });
    }
    console.error("❌ Error POST /contact", e);
    return res.status(500).json({ error: "Error al guardar consulta" });
  }
});

/* ============================================================
   GET /contact
   Listar consultas (ADMIN/OPERATOR)
   Filtros: status, page, pageSize
============================================================ */
r.get(
  "/",
  authRequired,
  requireRole("ADMIN", "OPERATOR"),
  async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page || "1", 10));
      const pageSize = Math.min(200, parseInt(req.query.pageSize || "20", 10));
      const skip = (page - 1) * pageSize;

      const where = {};
      if (req.query.status) where.status = String(req.query.status);

      const [items, total] = await Promise.all([
        prisma.inquiry.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        prisma.inquiry.count({ where }),
      ]);

      return res.json({ meta: { total, page, pageSize }, data: items });
    } catch (e) {
      console.error("❌ Error GET /contact", e);
      return res.status(500).json({ error: "Error al listar consultas" });
    }
  }
);

/* ============================================================
   GET /contact/:id
   Obtener una consulta específica (ADMIN/OPERATOR)
============================================================ */
r.get("/:id", authRequired, requireRole("ADMIN", "OPERATOR"), async (req, res) => {
  try {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!inquiry) {
      return res.status(404).json({ error: "Consulta no encontrada" });
    }

    return res.json({ data: inquiry });
  } catch (e) {
    console.error("❌ Error GET /contact/:id", e);
    return res.status(500).json({ error: "Error al obtener consulta" });
  }
});

/* ============================================================
   PATCH /contact/:id/status
   Cambiar estado (NEW → IN_PROGRESS → ANSWERED → CLOSED)
   (ADMIN/OPERATOR)
============================================================ */
r.patch(
  "/:id/status",
  authRequired,
  requireRole("ADMIN", "OPERATOR"),
  async (req, res) => {
    try {
      const { status } = updateStatusSchema.parse(req.body);

      const updated = await prisma.inquiry.update({
        where: { id: req.params.id },
        data: {
          status,
          assignedTo: req.user.id, // Asignar el operador que la responde
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return res.json({
        message: "Estado actualizado",
        data: updated,
      });
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({ error: "Estado inválido" });
      }
      if (e?.code === "P2025") {
        return res.status(404).json({ error: "Consulta no encontrada" });
      }
      console.error("❌ Error PATCH /contact/:id/status", e);
      return res.status(500).json({ error: "Error al actualizar estado" });
    }
  }
);

/* ============================================================
   PATCH /contact/:id/response
   Responder a una consulta (agregar respuesta + marcar como ANSWERED)
   (ADMIN/OPERATOR)
============================================================ */
r.patch(
  "/:id/response",
  authRequired,
  requireRole("ADMIN", "OPERATOR"),
  async (req, res) => {
    try {
      const { response } = respondToInquirySchema.parse(req.body);

      const updated = await prisma.inquiry.update({
        where: { id: req.params.id },
        data: {
          response,
          respondedAt: new Date(),
          status: InquiryStatus.ANSWERED,
          assignedTo: req.user.id,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return res.json({
        message: "Respuesta enviada",
        data: updated,
      });
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({ error: "Respuesta inválida (mínimo 5 caracteres)" });
      }
      if (e?.code === "P2025") {
        return res.status(404).json({ error: "Consulta no encontrada" });
      }
      console.error("❌ Error PATCH /contact/:id/response", e);
      return res.status(500).json({ error: "Error al responder consulta" });
    }
  }
);

/* ============================================================
   GET /contact/stats
   Resumen de consultas (ADMIN/OPERATOR)
============================================================ */
r.get(
  "/stats/summary",
  authRequired,
  requireRole("ADMIN", "OPERATOR"),
  async (req, res) => {
    try {
      const [newCount, inProgress, answered, closed] = await Promise.all([
        prisma.inquiry.count({ where: { status: InquiryStatus.NEW } }),
        prisma.inquiry.count({ where: { status: InquiryStatus.IN_PROGRESS } }),
        prisma.inquiry.count({ where: { status: InquiryStatus.ANSWERED } }),
        prisma.inquiry.count({ where: { status: InquiryStatus.CLOSED } }),
      ]);

      return res.json({
        data: {
          new: newCount,
          inProgress,
          answered,
          closed,
          total: newCount + inProgress + answered + closed,
        },
      });
    } catch (e) {
      console.error("❌ Error GET /contact/stats", e);
      return res.status(500).json({ error: "Error al obtener estadísticas" });
    }
  }
);

module.exports = r;
