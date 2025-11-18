// src/routes/dashboard.js
const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { authRequired, requireRole } = require("../middlewares/auth");

const prisma = new PrismaClient();
const r = Router();

// Solo ADMIN / OPERATOR
r.use(authRequired, requireRole("ADMIN", "OPERATOR"));

// Helper: convierte Decimal/number/string a number seguro
const toNumber = (v) => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v) || 0;
  if (typeof v.toNumber === "function") return v.toNumber();
  if (typeof v.toString === "function") return Number(v.toString()) || 0;
  return 0;
};

/**
 * GET /dashboard/resumen
 * KPIs principales para el panel:
 * - usuarios
 * - habitaciones
 * - reservas totales
 * - reservas activas
 * - reservas canceladas
 * - ingresos totales (CONFIRMED + CHECKED_IN + CHECKED_OUT)
 */
r.get("/resumen", async (_req, res, next) => {
  try {
    const totalUsuarios = await prisma.user.count();
    const totalHabitaciones = await prisma.room.count();
    const totalReservas = await prisma.reservation.count();

    const reservasActivas = await prisma.reservation.count({
      where: {
        status: {
          in: ["PENDING", "CONFIRMED", "CHECKED_IN"],
        },
      },
    });

    const reservasCanceladas = await prisma.reservation.count({
      where: { status: "CANCELED" },
    });

    const ingresosAgg = await prisma.reservation.aggregate({
      _sum: { total: true },
      where: {
        status: {
          in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"],
        },
      },
    });

    res.json({
      usuarios: totalUsuarios,
      habitaciones: totalHabitaciones,
      reservasTotales: totalReservas,
      reservasActivas,
      reservasCanceladas,
      ingresosTotales: toNumber(ingresosAgg._sum.total),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /dashboard/ocupacion
 * Ocupación básica por habitación:
 * - cantidad de reservas asociadas
 * - capacidad
 * - precio
 *
 * (Si querés, después podemos filtrarlo solo por reservas activas/futuras)
 */
r.get("/ocupacion", async (_req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        _count: { select: { reservations: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = rooms.map((room) => ({
      id: room.id,
      nombre: room.name,
      reservas: room._count.reservations,
      capacidad: room.capacity,
      precio: toNumber(room.pricePerNight),
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /dashboard/ingresos-mes
 * Serie de ingresos mensuales del año actual:
 * - mes (1-12)
 * - ingresos (suma de total) para reservas CONFIRMED/CHECKED_IN/CHECKED_OUT
 */
r.get("/ingresos-mes", async (_req, res, next) => {
  try {
    const now = new Date();
    const year = now.getFullYear();

    // Query raw segura con parámetros interpolados por Prisma
    const rows = await prisma.$queryRaw`
      SELECT
        EXTRACT(MONTH FROM "createdAt")::int AS mes,
        SUM("total")::numeric AS ingresos
      FROM "Reservation"
      WHERE EXTRACT(YEAR FROM "createdAt") = ${year}
        AND "status" IN ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT')
      GROUP BY 1
      ORDER BY 1 ASC;
    `;

    const data = (rows || []).map((row) => ({
      mes: Number(row.mes),
      ingresos: toNumber(row.ingresos),
    }));

    res.json({ year, data });
  } catch (err) {
    next(err);
  }
});

module.exports = r;
