// src/routes/rooms.js
const { Router } = require("express");
const { PrismaClient, ReservationStatus } = require("@prisma/client");
const { z, ZodError } = require("zod");
const { authRequired, requireRole } = require("../middlewares/auth");

const prisma = new PrismaClient();
const r = Router();

/* =========================
   Constantes / Helpers
========================= */

// Estados que bloquean una habitación (igual que en bookings)
const BLOCKING = [
  ReservationStatus.PENDING,
  ReservationStatus.PAID,
  ReservationStatus.CONFIRMED,
  ReservationStatus.CHECKED_IN,
];

// Rango de fechas válido
function validRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return !isNaN(s) && !isNaN(e) && s < e;
}

/* =========================
   Schemas
========================= */

const baseRoomSchema = z.object({
  name: z.string().min(2, "Nombre demasiado corto"),
  capacity: z.coerce.number().int().min(1, "Capacidad mínima 1"),
  pricePerNight: z.coerce.number().nonnegative("Precio inválido"),
  description: z.string().optional(),
  imageUrl: z
    .string()
    .url("URL de imagen inválida")
    .optional()
    .or(z.literal("").optional()),
  isActive: z.boolean().optional(),
});

const createSchema = baseRoomSchema;
const updateSchemaAdmin = baseRoomSchema.partial();
const updateSchemaOperator = z.object({
  isActive: z.boolean(),
});

const availabilityQuery = z.object({
  start: z.string(),
  end: z.string(),
});

/* =========================
   GET /rooms (público)
========================= */

r.get("/", async (req, res, next) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const where = {
      ...(q && { name: { contains: q, mode: "insensitive" } }),
      isActive: true,
    };

    const rooms = await prisma.room.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        capacity: true,
        pricePerNight: true,
        imageUrl: true,
        description: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json(rooms);
  } catch (err) {
    next(err);
  }
});

/* =========================
   GET /rooms/availability/search
========================= */

r.get("/availability/search", async (req, res, next) => {
  try {
    const { start, end } = availabilityQuery.parse(req.query);

    if (!validRange(start, end)) {
      return res.status(400).json({ error: "Rango de fechas inválido" });
    }

    const s = new Date(start);
    const e = new Date(end);

    // Habitaciones ocupadas en ese rango
    const busy = await prisma.reservation.findMany({
      where: {
        status: { in: BLOCKING },
        AND: [{ checkIn: { lt: e } }, { checkOut: { gt: s } }],
      },
      select: { roomId: true },
      distinct: ["roomId"],
    });

    const busyIds = busy.map((b) => b.roomId);

    // Habitaciones disponibles y activas
    const available = await prisma.room.findMany({
      where: {
        id: { notIn: busyIds },
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        capacity: true,
        pricePerNight: true,
        imageUrl: true,
        description: true,
        isActive: true,
      },
    });

    res.json({ data: available, meta: { start, end } });
  } catch (e) {
    if (e instanceof ZodError) {
      return res
        .status(400)
        .json({ error: e.issues[0]?.message || "Datos inválidos" });
    }
    next(e);
  }
});

/* =========================
   GET /rooms/:id (detalle)
========================= */

r.get("/:id", async (req, res, next) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: String(req.params.id) },
      select: {
        id: true,
        name: true,
        capacity: true,
        pricePerNight: true,
        imageUrl: true,
        description: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!room) {
      return res.status(404).json({ error: "Habitación no encontrada" });
    }

    res.json(room);
  } catch (err) {
    next(err);
  }
});

/* =========================
   POST /rooms (ADMIN)
========================= */

r.post("/", authRequired, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);

    const room = await prisma.room.create({
      data: body,
    });

    res.status(201).json(room);
  } catch (err) {
    if (err instanceof ZodError) {
      return res
        .status(400)
        .json({ error: err.issues[0]?.message || "Datos inválidos" });
    }
    next(err);
  }
});

/* =========================
   PUT /rooms/:id (ADMIN)
========================= */

r.put("/:id", authRequired, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const data = updateSchemaAdmin.parse(req.body);

    const room = await prisma.room.update({
      where: { id: String(req.params.id) },
      data,
    });

    res.json(room);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Habitación no encontrada" });
    }
    if (err instanceof ZodError) {
      return res
        .status(400)
        .json({ error: err.issues[0]?.message || "Datos inválidos" });
    }
    next(err);
  }
});

/* =========================
   PATCH /rooms/:id (ADMIN / OPERATOR)
   - ADMIN: puede tocar cualquier campo parcial
   - OPERATOR: solo isActive (abrir/cerrar)
========================= */

r.patch(
  "/:id",
  authRequired,
  requireRole("ADMIN", "OPERATOR"),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);

      let data;
      if (req.user.role === "OPERATOR") {
        // Operador solo puede abrir/cerrar habitación
        data = updateSchemaOperator.parse(req.body);
      } else {
        // Admin puede modificar cualquier campo parcial
        data = updateSchemaAdmin.parse(req.body);
      }

      const room = await prisma.room.update({
        where: { id },
        data,
      });

      res.json(room);
    } catch (err) {
      if (err.code === "P2025") {
        return res.status(404).json({ error: "Habitación no encontrada" });
      }
      if (err instanceof ZodError) {
        return res
          .status(400)
          .json({ error: err.issues[0]?.message || "Datos inválidos" });
      }
      next(err);
    }
  }
);

/* =========================
   DELETE /rooms/:id (ADMIN)
========================= */

r.delete(
  "/:id",
  authRequired,
  requireRole("ADMIN"),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const today = new Date();

      // No permitir eliminar si hay reservas futuras o activas
      const active = await prisma.reservation.count({
        where: {
          roomId: id,
          status: { in: BLOCKING },
          checkOut: { gt: today },
        },
      });

      if (active > 0) {
        return res.status(400).json({
          error: "No se puede eliminar: hay reservas activas o futuras",
        });
      }

      await prisma.room.delete({ where: { id } });
      res.json({ ok: true });
    } catch (err) {
      if (err.code === "P2025") {
        return res.status(404).json({ error: "Habitación no encontrada" });
      }
      next(err);
    }
  }
);

module.exports = r;
