/**
 * Middleware de manejo de errores de BD
 * - Detecta si Prisma Cliente no puede conectar
 * - Retorna error amigable en lugar de 500
 */

const {
  PrismaClientInitializationError,
  PrismaClientRustPanicError,
} = require("@prisma/client/runtime/library");

/**
 * Middleware para capturar errores de conexión de BD
 */
function dbErrorHandler(err, req, res, next) {
  // Log del error
  console.error("❌ Error en BD:", {
    tipo: err.constructor.name,
    mensaje: err.message,
    ruta: req.path,
    metodo: req.method,
  });

  // Errores de inicialización de Prisma
  if (err instanceof PrismaClientInitializationError) {
    return res.status(503).json({
      ok: false,
      error: "Database connection failed",
      mode: "DB_OFFLINE",
      message:
        "La base de datos no está disponible. Por favor, intente más tarde.",
      timestamp: new Date().toISOString(),
    });
  }

  // Errores de operación
  if (err instanceof PrismaClientRustPanicError) {
    return res.status(503).json({
      ok: false,
      error: "Database error",
      mode: "DB_ERROR",
      message: "Error en la base de datos. Por favor, intente más tarde.",
      timestamp: new Date().toISOString(),
    });
  }

  // Otros errores de Prisma
  if (err.code && err.code.startsWith("P")) {
    return res.status(400).json({
      ok: false,
      error: err.code,
      message: getPrismaErrorMessage(err.code),
      timestamp: new Date().toISOString(),
    });
  }

  // Si no es capturado, pasar al siguiente middleware
  next(err);
}

/**
 * Mapear códigos de error de Prisma a mensajes en español
 */
function getPrismaErrorMessage(code) {
  const messages = {
    P1000: "Authentication failed",
    P1001: "Can't reach database server",
    P1002: "Timeout waiting for database connection",
    P1008: "Operations timed out",
    P1009: "Database does not exist",
    P1010: "User was denied access",
    P1011: "Error opening a TLS connection",
    P1012: "Invalid connection string",
    P1013: "Invalid connection string parameter",
    P1014: "The underlying kind is not supported",
    P1015: "Unsupported preview feature",
    P2000: "Provided value is too long",
    P2001: "The record to update does not exist",
    P2002: "Unique constraint violation",
    P2003: "Foreign key constraint violation",
    P2004: "A constraint violation occurred",
    P2005: "Invalid value for column type",
    P2006: "Invalid value for field",
    P2007: "Data validation error",
    P2008: "Query parsing failed",
    P2009: "Failed to validate query",
    P2010: "Raw query failed",
    P2011: "Null constraint violation",
    P2012: "Missing required value",
    P2013: "Missing required argument",
    P2014: "Relation violated",
    P2015: "Related record not found",
    P2016: "Query interpretation error",
    P2017: "Relation not connected",
    P2018: "Required relation violation",
    P2019: "Input error",
    P2020: "Value out of range",
    P2021: "Table does not exist",
    P2022: "Column does not exist",
    P2023: "Inconsistent column data",
    P2024: "Timed out fetching a new connection",
    P2025: "Record not found",
  };

  return messages[code] || `Error en BD (${code})`;
}

/**
 * Wrapper para convertir cualquier error de BD en respuesta 503
 */
async function withDbErrorHandling(asyncFn) {
  try {
    return await asyncFn();
  } catch (err) {
    if (err instanceof PrismaClientInitializationError) {
      throw new Error(
        JSON.stringify({
          status: 503,
          ok: false,
          error: "Database connection failed",
          mode: "DB_OFFLINE",
        })
      );
    }
    throw err;
  }
}

module.exports = {
  dbErrorHandler,
  getPrismaErrorMessage,
  withDbErrorHandling,
};
