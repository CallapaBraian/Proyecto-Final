// src/routes/admin.js
const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { z, ZodError } = require("zod");
const { authRequired, requireRole } = require("../middlewares/auth");

const prisma = new PrismaClient();
const r = Router();

// Todo lo de admin requiere token y rol (ADMIN u OPERATOR)
r.use(authRequired, requireRole("ADMIN", "OPERATOR"));

/**
 * GET /admin/reservations
 * Filtros: status, roomId, userId, page, pageSize
 */
r.get("/reservations", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(200, parseInt(req.query.pageSize || "50", 10));
    const skip = (page - 1) * pageSize;

    const where = {};
    if (req.query.status) where.status = String(req.query.status);
    if (req.query.roomId) where.roomId = String(req.query.roomId);
    if (req.query.userId) where.userId = String(req.query.userId);

    const [items, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          room: {
            select: {
              id: true,
              name: true,
              capacity: true,
              pricePerNight: true,
              imageUrl: true,
            },
          },
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.reservation.count({ where }),
    ]);

    res.json({ meta: { total, page, pageSize }, items });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /admin/reservations/:id/status
 * Cambiar estado con transiciones válidas
 */
r.put("/reservations/:id/status", async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum([
        "PENDING",
        "CONFIRMED",
        "CHECKED_IN",
        "CHECKED_OUT",
        "CANCELED",
      ]),
    });
    const { status } = schema.parse(req.body);

    const current = await prisma.reservation.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!current) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    const transitions = {
      PENDING: ["CONFIRMED", "CANCELED"],
      CONFIRMED: ["CHECKED_IN", "CANCELED"],
      CHECKED_IN: ["CHECKED_OUT"],
      CHECKED_OUT: [],
      CANCELED: [],
    };
    if (!transitions[current.status].includes(status)) {
      return res.status(400).json({
        error: `Transición inválida ${current.status} → ${status}`,
      });
    }

    const updated = await prisma.reservation.update({
      where: { id: String(req.params.id) },
      data: { status },
      include: {
        room: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ data: updated });
  } catch (e) {
    if (e instanceof ZodError) {
      const msg = e.issues[0]?.message || "Datos inválidos";
      return res.status(400).json({ error: msg });
    }
    next(e);
  }
});

/**
 * POST /admin/rooms
 * Crear habitación
 */
r.post("/rooms", async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      capacity: z.coerce.number().int().min(1),
      pricePerNight: z.coerce.number().nonnegative(),
      description: z.string().optional().nullable(),
      imageUrl: z
        .string()
        .url()
        .optional()
        .nullable()
        .or(z.literal("").optional()),
    });
    const data = schema.parse(req.body);

    const created = await prisma.room.create({ data });
    res.status(201).json({ data: created });
  } catch (e) {
    if (e instanceof ZodError) {
      const msg = e.issues[0]?.message || "Datos inválidos";
      return res.status(400).json({ error: msg });
    }
    next(e);
  }
});

/**
 * PUT /admin/rooms/:id
 * Actualizar habitación
 */
r.put("/rooms/:id", async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      capacity: z.coerce.number().int().min(1).optional(),
      pricePerNight: z.coerce.number().nonnegative().optional(),
      description: z.string().optional().nullable(),
      imageUrl: z
        .string()
        .url()
        .optional()
        .nullable()
        .or(z.literal("").optional()),
    });
    const data = schema.parse(req.body);

    const updated = await prisma.room.update({
      where: { id: String(req.params.id) },
      data,
    });
    res.json({ data: updated });
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "Habitación no encontrada" });
    }
    if (e instanceof ZodError) {
      const msg = e.issues[0]?.message || "Datos inválidos";
      return res.status(400).json({ error: msg });
    }
    next(e);
  }
});

/**
 * DELETE /admin/rooms/:id
 * Bloquea si hay reservas activas/futuras
 */
r.delete("/rooms/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const today = new Date();

    const active = await prisma.reservation.count({
      where: {
        roomId: id,
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        checkout: { gt: today },
      },
    });

    if (active > 0) {
      return res.status(400).json({
        error: "No se puede eliminar: hay reservas activas/futuras",
      });
    }

    await prisma.room.delete({ where: { id } });
    res.status(204).end();
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "Habitación no encontrada" });
    }
    next(e);
  }
});

/**
 * GET /admin/stats
 * Estadísticas: ocupación, ingresos, reservas por habitación
 */
r.get("/stats", async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reservas del día
    const reservasHoy = await prisma.reservation.count({
      where: {
        checkIn: { gte: today, lt: tomorrow },
      },
    });

    // Ingresos totales
    const totalIngresos = await prisma.reservation.aggregate({
      where: {
        status: { in: ["PAID", "CONFIRMED", "CHECKED_OUT"] },
      },
      _sum: { total: true },
    });

    // Ocupación: cuántas habitaciones están ocupadas ahora
    const ocupadas = await prisma.reservation.count({
      where: {
        status: { in: ["CHECKED_IN"] },
      },
    });

    // Total de habitaciones
    const totalHabitaciones = await prisma.room.count();

    // Reservas por estado
    const reservasPorEstado = await prisma.reservation.groupBy({
      by: ["status"],
      _count: true,
    });

    // Ingresos por mes (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const ingresosPorMes = await prisma.reservation.findMany({
      where: {
        status: { in: ["PAID", "CONFIRMED", "CHECKED_OUT"] },
        createdAt: { gte: sixMonthsAgo },
      },
      select: {
        createdAt: true,
        total: true,
      },
    });

    // Agrupar por mes
    const agrupadoPorMes = {};
    ingresosPorMes.forEach((res) => {
      const mes = new Date(res.createdAt).toLocaleString("es-AR", {
        month: "short",
        year: "numeric",
      });
      agrupadoPorMes[mes] = (agrupadoPorMes[mes] || 0) + Number(res.total);
    });

    res.json({
      data: {
        ocupacion: {
          ocupadas,
          total: totalHabitaciones,
          porcentaje:
            totalHabitaciones > 0
              ? ((ocupadas / totalHabitaciones) * 100).toFixed(2)
              : 0,
        },
        reservasHoy,
        ingresosTotales: Number(totalIngresos._sum.total || 0),
        reservasPorEstado,
        ingresosPorMes: agrupadoPorMes,
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /admin/operators
 * Listar operadores (ADMIN only)
 */
r.get("/operators", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const operators = await prisma.user.findMany({
      where: { role: "OPERATOR" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
    res.json({ data: operators });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /admin/operators
 * Crear operador (ADMIN only)
 */
r.post("/operators", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
    });

    const data = schema.parse(req.body);

    // Hash password
    const bcrypt = require("bcrypt");
    const passwordHash = await bcrypt.hash(data.password, 10);

    const operator = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: "OPERATOR",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.status(201).json({ message: "Operador creado", data: operator });
  } catch (e) {
    if (e?.code === "P2002") {
      return res.status(409).json({ error: "Email ya existe" });
    }
    if (e instanceof ZodError) {
      const msg = e.issues[0]?.message || "Datos inválidos";
      return res.status(400).json({ error: msg });
    }
    next(e);
  }
});

/**
 * PUT /admin/operators/:id
 * Actualizar operador (ADMIN only)
 */
r.put("/operators/:id", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      password: z.string().min(6).optional(),
    });

    const data = schema.parse(req.body);
    const updateData = {};

    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.password) {
      const bcrypt = require("bcrypt");
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.json({ message: "Operador actualizado", data: updated });
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "Operador no encontrado" });
    }
    if (e?.code === "P2002") {
      return res.status(409).json({ error: "Email ya existe" });
    }
    if (e instanceof ZodError) {
      const msg = e.issues[0]?.message || "Datos inválidos";
      return res.status(400).json({ error: msg });
    }
    next(e);
  }
});

/**
 * DELETE /admin/operators/:id
 * Eliminar operador (ADMIN only)
 */
r.delete("/operators/:id", requireRole("ADMIN"), async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: String(req.params.id) } });
    res.status(204).end();
  } catch (e) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "Operador no encontrado" });
    }
    next(e);
  }
});

module.exports = r;
