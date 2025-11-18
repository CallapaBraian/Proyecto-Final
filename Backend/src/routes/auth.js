// src/routes/auth.js
const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z, ZodError } = require("zod");
const { OAuth2Client } = require("google-auth-library");
const { authRequired } = require("../middlewares/auth"); // 👈 carpeta correcta: middlewares/auth.js

const prisma = new PrismaClient();
const r = Router();

/* =========================
   Config Google OAuth
========================= */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID
  ? new OAuth2Client(GOOGLE_CLIENT_ID)
  : null;

/* =========================
   Schemas de validación
========================= */

const registerSchema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

/* =========================
   Helpers
========================= */

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function toSafeUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
  };
}

/* =========================
   Rutas
========================= */

/**
 * POST /auth/register
 * Crea usuario con rol GUEST.
 * Respuesta: { token, user }
 */
r.post("/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return res.status(409).json({ error: "Email ya registrado" });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: "GUEST",
      },
    });

    const safeUser = toSafeUser(user);
    const token = signToken(safeUser);

    return res.status(201).json({ token, user: safeUser });
  } catch (e) {
    if (e instanceof ZodError) {
      const msg = e.issues[0]?.message || "Datos inválidos";
      return res.status(400).json({ error: msg });
    }
    console.error("Error /auth/register:", e);
    return res.status(500).json({ error: "Error al registrar" });
  }
});

/**
 * POST /auth/login
 * Login con email + password.
 * Respuesta: { token, user }
 */
r.post("/login", async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const ok = await bcrypt.compare(data.password, user.passwordHash || "");
    if (!ok) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const safeUser = toSafeUser(user);
    const token = signToken(safeUser);

    return res.json({ token, user: safeUser });
  } catch (e) {
    if (e instanceof ZodError) {
      const msg = e.issues[0]?.message || "Datos inválidos";
      return res.status(400).json({ error: msg });
    }
    console.error("Error /auth/login:", e);
    return res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

/**
 * POST /auth/google
 * Login con Google (usuarios GUEST).
 * Body: { id_token }
 * Respuesta: { token, user }
 */
r.post("/google", async (req, res) => {
  try {
    if (!googleClient || !GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        error:
          "Google OAuth no está configurado en el servidor (falta GOOGLE_CLIENT_ID)",
      });
    }

    const { id_token } = req.body;
    if (!id_token) {
      return res.status(400).json({ error: "Falta id_token" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;
    const name = payload?.name || payload?.given_name || "Usuario";

    if (!email) {
      return res
        .status(400)
        .json({ error: "No se pudo obtener el email desde Google" });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: "",
          role: "GUEST",
        },
      });
    }

    const safeUser = toSafeUser(user);
    const token = signToken(safeUser);

    return res.json({ token, user: safeUser });
  } catch (e) {
    console.error("Error /auth/google:", e);
    return res.status(401).json({ error: "Token de Google inválido" });
  }
});

/**
 * POST /auth/logout
 * El front simplemente borra el token.
 */
r.post("/logout", (_req, res) => {
  return res.json({ ok: true });
});

/**
 * GET /auth/me
 * Devuelve datos del usuario autenticado.
 */
r.get("/me", authRequired, async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        role: true,
        createdAt: true,
      },
    });

    if (!me) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.json(me);
  } catch (e) {
    console.error("Error /auth/me:", e);
    return res.status(500).json({ error: "Error al obtener usuario" });
  }
});

/**
 * PATCH /auth/me
 * Actualiza datos del usuario autenticado (nombre, teléfono, dirección).
 */
r.patch("/me", authRequired, async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        role: true,
        createdAt: true,
      },
    });

    return res.json(updated);
  } catch (e) {
    console.error("Error PATCH /auth/me:", e);
    return res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

module.exports = r;
