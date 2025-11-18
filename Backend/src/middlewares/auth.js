// src/middlewares/auth.js
const jwt = require("jsonwebtoken");

/**
 * Extrae el token Bearer del header Authorization.
 * Ejemplo: "Authorization: Bearer <token>"
 */
function parseBearer(req) {
  const header = (req.headers.authorization || "").trim();
  if (!header) return null;

  const [type, ...rest] = header.split(" ").filter(Boolean);
  if (type.toLowerCase() !== "bearer") return null;

  return rest.join(" ");
}

/**
 * Middleware: requiere un JWT válido.
 * Agrega req.user = { id, email, role }.
 */
function authRequired(req, res, next) {
  const token = parseBearer(req);
  if (!token) {
    return res.status(401).json({ error: "No autenticado (token ausente)" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      clockTolerance: 5, // tolerancia leve de desfase de reloj
    });

    const { id, email, role } = payload || {};
    if (!id || !email || !role) {
      return res.status(401).json({ error: "Token inválido (faltan datos)" });
    }

    req.user = { id, email, role };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }
    return res.status(401).json({ error: "Token inválido" });
  }
}

/**
 * Middleware: requiere un rol específico.
 * Ejemplo: app.get("/admin", authRequired, requireRole("ADMIN"), ...)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Permisos insuficientes" });
    }
    next();
  };
}

module.exports = { authRequired, requireRole };
