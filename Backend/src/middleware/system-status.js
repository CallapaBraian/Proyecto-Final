/**
 * Sistema de Status del Servidor
 * Monitorea: BD, Backend, Frontend, Servicios
 */

// Instancia singular para chequeos
let dbCheckResult = null;
let lastDbCheck = null;

/**
 * Endpoint de status completo del sistema
 */
async function statusEndpoint(req, res) {
  try {
    // No hacer check real de BD (evita crear otra instancia de Prisma)
    // Solo retornar info del servidor
    const systemStatus = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      services: {
        backend: {
          status: "online",
          port: process.env.PORT || 4000,
          uptime: `${(process.uptime() / 60).toFixed(1)} minutos`,
        },
        database: {
          status: "checking...",
          type: "PostgreSQL",
          note: "Usar GET /health para test de conexión",
        },
      },
      memoryUsage: {
        heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
      },
    };

    res.json({
      ok: true,
      mode: "NORMAL",
      ...systemStatus,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Exportar para usar en routes
 */
module.exports = {
  statusEndpoint,
};
