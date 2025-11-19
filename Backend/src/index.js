// =============================
//  Servidor principal Express
// =============================

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 4000;

// =============================
//  Logs iniciales
// =============================
console.log(
  "DB URL (pooler):",
  (process.env.DATABASE_URL || "").replace(/\/\/.*@/, "//****@")
);
console.log(
  "PRISMA_DISABLE_PREPARED_STATEMENTS =",
  process.env.PRISMA_DISABLE_PREPARED_STATEMENTS
);

// =============================
//  CORS
// =============================
const allowedOrigins = (process.env.FRONT_ORIGINS || "http://localhost:5173,http://localhost:5174,http://localhost:5175")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      // Permitir herramientas locales (curl/Postman) sin origin
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Origin no permitido: " + origin));
    },
    credentials: true,
  })
);

// =============================
//  Middlewares
// =============================
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Servir imágenes estáticas locales (fallback)
app.use("/images", express.static("public/images"));

// =============================
//  System Status
// =============================
const { statusEndpoint } = require("./middleware/system-status");
app.get("/status", statusEndpoint);

// =============================
//  Endpoints base
// =============================
app.get("/", (_req, res) => res.send("✅ API funcionando 🚀"));

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: "up", time: new Date().toISOString() });
  } catch {
    res
      .status(503)
      .json({ ok: false, db: "down", time: new Date().toISOString() });
  }
});

// Solo en desarrollo: debug de entorno
if (process.env.NODE_ENV !== "production") {
  app.get("/debug/env", (_req, res) =>
    res.json({
      DATABASE_URL: (process.env.DATABASE_URL || "").replace(/\/\/.*@/, "//****@"),
      PRISMA_DISABLE_PREPARED_STATEMENTS:
        process.env.PRISMA_DISABLE_PREPARED_STATEMENTS,
      FRONT_ORIGINS: allowedOrigins,
      NODE_ENV: process.env.NODE_ENV || "development",
      PORT,
    })
  );
}

// =============================
//  Rutas modulares
// =============================

// Autenticación y roles (ADMIN/OPERATOR/GUEST)
app.use("/auth", require("./routes/auth"));

// Habitaciones (listado, detalle, disponibilidad)
app.use("/rooms", require("./routes/rooms"));

// Reservas (crear, listar propias, disponibilidad)
app.use("/bookings", require("./routes/bookings"));

// Contacto / Consultas (inquiries)
app.use("/contact", require("./routes/contact"));

// Panel admin/operator (gestión de reservas/habitaciones)
app.use("/admin", require("./routes/admin"));

// Métricas / dashboard (resumen general)
app.use("/dashboard", require("./routes/dashboard"));

// =============================
//  404 Not Found
// =============================
app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// =============================
//  Error Handler global
// =============================
app.use((err, _req, res, _next) => {
  console.error("🔥 Error:", err);

  // CORS denegado
  if (String(err?.message || "").includes("Origin no permitido")) {
    return res.status(403).json({ error: "CORS: origen no permitido" });
  }

  // Errores comunes de Prisma
  if (err?.code === "P2002") {
    return res.status(409).json({ error: "Violación de restricción única" });
  }
  if (err?.code === "P2025") {
    return res.status(404).json({ error: "Recurso no encontrado" });
  }

  const status = Number(err?.status) || 500;
  const message = err?.message || "Error interno del servidor";
  return res.status(status).json({ error: message });
});

// =============================
//  Start Server
// =============================
const server = app.listen(PORT, () => {
  console.log(`✅ Backend corriendo en http://localhost:${PORT}`);
});

// =============================
//  Cierre ordenado
// =============================
async function shutdown() {
  console.log("🛑 Apagando servidor…");
  try {
    await prisma.$disconnect();
  } catch (e) {
    console.error("Error al desconectar Prisma:", e);
  } finally {
    server.close(() => {
      console.log("✅ Servidor cerrado.");
      process.exit(0);
    });
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("unhandledRejection", (reason) =>
  console.error("⚠️ Unhandled Rejection:", reason)
);
process.on("uncaughtException", (err) =>
  console.error("⚠️ Uncaught Exception:", err)
);
