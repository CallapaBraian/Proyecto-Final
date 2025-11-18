// src/routes/bookings.js
const { Router } = require("express");
const { PrismaClient, ReservationStatus } = require("@prisma/client");
const { z, ZodError } = require("zod");
const { authRequired, requireRole } = require("../middlewares/auth");

const prisma = new PrismaClient();
const r = Router();

/* ============================================================
   ESTADOS QUE BLOQUEAN LA HABITACIÓN
============================================================ */
const BLOCKING = [
  ReservationStatus.PENDING,
  ReservationStatus.PAID,
  ReservationStatus.CONFIRMED,
  ReservationStatus.CHECKED_IN,
];

/* ============================================================
   VALIDACIÓN DE RANGO DE FECHAS
============================================================ */
function validRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return !isNaN(s) && !isNaN(e) && s < e;
}

/* ============================================================
   GENERAR CÓDIGO DE RESERVA (H2025-0001, H2025-0002...)
============================================================ */
async function generateReservationCode() {
  const year = new Date().getFullYear();
  const from = new Date(`${year}-01-01T00:00:00.000Z`);
  const to = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const count = await prisma.reservation.count({
    where: { createdAt: { gte: from, lt: to } },
  });

  const num = String(count + 1).padStart(4, "0");
  return `H${year}-${num}`;
}

/* ============================================================
   ZOD SCHEMAS
============================================================ */
const createSchema = z.object({
  roomId: z.string().min(1),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.coerce.number().int().min(1),

  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(6),

  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum([
    "PENDING",
    "PAID",
    "CONFIRMED",
    "CHECKED_IN",
    "CHECKED_OUT",
    "CANCELED",
  ]),
});

/* ============================================================
   POST /bookings
   CREA RESERVA CON CODE + HUESPED + SOLAPAMIENTO
============================================================ */
r.post("/", authRequired, async (req, res) => {
  try {
    const data = createSchema.parse(req.body);

    if (!validRange(data.checkIn, data.checkOut)) {
      return res.status(400).json({ error: "Rango de fechas inválido" });
    }

    // 1) Verificar habitación
    const room = await prisma.room.findUnique({
      where: { id: data.roomId, isActive: true },
    });

    if (!room) return res.status(404).json({ error: "Habitación no disponible" });

    // 2) Evitar solapamiento
    const overlap = await prisma.reservation.findFirst({
      where: {
        roomId: data.roomId,
        status: { in: BLOCKING },
        AND: [
          { checkIn: { lt: new Date(data.checkOut) } },
          { checkOut: { gt: new Date(data.checkIn) } },
        ],
      },
    });

    if (overlap) {
      return res.status(409).json({ error: "Fechas no disponibles" });
    }

    // 3) Calcular total
    const MS = 1000 * 60 * 60 * 24;
    const nights =
      (new Date(data.checkOut) - new Date(data.checkIn)) / MS;

    const total = Number(room.pricePerNight) * nights;

    // 4) Código profesional
    const code = await generateReservationCode();

    // 5) Crear
    const reservation = await prisma.reservation.create({
      data: {
        code,
        roomId: data.roomId,
        userId: req.user.id,

        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        documentType: data.documentType ?? null,
        documentNumber: data.documentNumber ?? null,

        checkIn: new Date(data.checkIn),
        checkOut: new Date(data.checkOut),
        guests: data.guests,
        total,
        status: ReservationStatus.PENDING,
      },
      include: { room: true },
    });

    return res.status(201).json({ data: reservation });
  } catch (e) {
    if (e instanceof ZodError) {
      return res.status(400).json({ error: e.issues[0]?.message });
    }
    console.error("❌ Error POST /bookings", e);
    return res.status(500).json({ error: "Error al crear reserva" });
  }
});

/* ============================================================
   GET /bookings (Panel Admin / Operador)
============================================================ */
r.get("/", authRequired, requireRole("ADMIN", "OPERATOR"), async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;

    const list = await prisma.reservation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        room: { select: { id: true, name: true, pricePerNight: true, imageUrl: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.json({ data: list });
  } catch (e) {
    console.error("❌ Error GET /bookings", e);
    res.status(500).json({ error: "Error al listar reservas" });
  }
});

/* ============================================================
   GET /bookings/me — Alias para /bookings/mine (Mis Reservas del Cliente)
============================================================ */
r.get("/me", authRequired, async (req, res) => {
  try {
    const list = await prisma.reservation.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            pricePerNight: true,
          },
        },
      },
    });

    res.json({ data: list });
  } catch (e) {
    console.error("❌ Error GET /bookings/me", e);
    res.status(500).json({ error: "Error al obtener reservas" });
  }
});

/* ============================================================
   GET /bookings/mine — Mis Reservas del Cliente
============================================================ */
r.get("/mine", authRequired, async (req, res) => {
  try {
    const list = await prisma.reservation.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            pricePerNight: true,
          },
        },
      },
    });

    res.json({ data: list });
  } catch (e) {
    console.error("❌ Error GET /bookings/mine", e);
    res.status(500).json({ error: "Error al obtener reservas" });
  }
});

/* ============================================================
   PATCH /bookings/:id/status — ADMIN / OPERATOR
============================================================ */
r.patch(
  "/:id/status",
  authRequired,
  requireRole("ADMIN", "OPERATOR"),
  async (req, res) => {
    try {
      const { status } = statusSchema.parse(req.body);

      const updated = await prisma.reservation.update({
        where: { id: req.params.id },
        data: { status },
        include: {
          room: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      });

      return res.json({
        message: "Estado actualizado correctamente",
        data: updated,
      });
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(400).json({ error: "Estado inválido" });
      }
      if (e.code === "P2025") {
        return res.status(404).json({ error: "Reserva no encontrada" });
      }
      console.error("❌ Error PATCH /bookings/:id/status", e);
      res.status(500).json({ error: "Error al actualizar estado" });
    }
  }
);

/* ============================================================
   POST /bookings/:id/pay — Pago simulado
============================================================ */
r.post(
  "/:id/pay",
  authRequired,
  async (req, res) => {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: req.params.id },
      });

      if (!reservation) {
        return res.status(404).json({ error: "Reserva no encontrada" });
      }

      if (
        reservation.userId !== req.user.id &&
        req.user.role !== "ADMIN" &&
        req.user.role !== "OPERATOR"
      ) {
        return res.status(403).json({ error: "No tienes permiso" });
      }

      if (
        reservation.status === ReservationStatus.PAID ||
        reservation.status === ReservationStatus.CONFIRMED
      ) {
        return res
          .status(400)
          .json({ error: "La reserva ya está pagada/confirmada" });
      }

      // Marcar como PAID
      const updated = await prisma.reservation.update({
        where: { id: req.params.id },
        data: { status: ReservationStatus.PAID },
        include: {
          room: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      });

      return res.json({
        message: "Pago procesado correctamente ✅",
        data: updated,
      });
    } catch (e) {
      console.error("❌ Error POST /bookings/:id/pay", e);
      res.status(500).json({ error: "Error al procesar pago" });
    }
  }
);

/* ============================================================
   GET /bookings/stats/rooms-popularity
   Contar reservas por habitación (para chart de habitaciones más solicitadas)
   Solo admin/operator
============================================================ */
r.get(
  "/stats/rooms-popularity",
  authRequired,
  requireRole("ADMIN", "OPERATOR"),
  async (req, res) => {
    try {
      // Agrupar reservas por habitación y contar
      const roomStats = await prisma.reservation.groupBy({
        by: ["roomId"],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 5, // Top 5
      });

      // Obtener detalles de las habitaciones
      const roomIds = roomStats.map((s) => s.roomId);
      const rooms = await prisma.room.findMany({
        where: { id: { in: roomIds } },
        select: { id: true, name: true },
      });

      // Combinar datos
      const popularity = roomStats.map((stat) => {
        const room = rooms.find((r) => r.id === stat.roomId);
        return {
          roomId: stat.roomId,
          roomName: room?.name || "Habitación desconocida",
          bookingsCount: stat._count.id,
        };
      });

      return res.json({ data: popularity });
    } catch (e) {
      console.error("❌ Error GET /bookings/stats/rooms-popularity", e);
      return res
        .status(500)
        .json({ error: "Error al obtener estadísticas de habitaciones" });
    }
  }
);

module.exports = r;
