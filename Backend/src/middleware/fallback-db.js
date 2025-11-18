/**
 * Middleware de FALLBACK para cuando la BD está offline
 * - Retorna datos mock en lugar de errores 500
 * - Permite desarrollo/testing sin BD
 */

// Datos de ejemplo para desarrollo
const MOCK_ROOMS = [
  {
    id: 1,
    name: "Suite Deluxe",
    description: "Habitación de lujo con vistas al mar",
    capacity: 2,
    price: 250,
    image: "base64_image_here_1",
    status: "AVAILABLE",
  },
  {
    id: 2,
    name: "Suite Presidencial Premium",
    description: "La mejor habitación del hotel",
    capacity: 4,
    price: 500,
    image: "base64_image_here_2",
    status: "AVAILABLE",
  },
  {
    id: 3,
    name: "Habitación Estándar",
    description: "Cómoda y económica",
    capacity: 2,
    price: 100,
    image: "base64_image_here_3",
    status: "AVAILABLE",
  },
];

const MOCK_USERS = [
  {
    id: 1,
    email: "user@hotel.ar",
    name: "Usuario Test",
    role: "GUEST",
  },
  {
    id: 2,
    email: "operator@hotel.ar",
    name: "Operador Test",
    role: "OPERATOR",
  },
  {
    id: 3,
    email: "admin@hotel.ar",
    name: "Admin Test",
    role: "ADMIN",
  },
];

const MOCK_RESERVATIONS = [
  {
    id: 1,
    code: "RES-001",
    roomId: 1,
    userId: 1,
    guestName: "Juan García",
    checkIn: "2025-11-25",
    checkOut: "2025-11-27",
    status: "CONFIRMED",
    total: 500,
  },
];

const MOCK_INQUIRIES = [
  {
    id: 1,
    name: "Cliente Test",
    email: "cliente@test.com",
    message: "Consulta de ejemplo",
    status: "PENDING",
    createdAt: new Date(),
  },
];

/**
 * Middleware de fallback
 * - Intenta ejecutar la lógica normal
 * - Si falla por DB, retorna datos mock
 */
function fallbackDbMiddleware(req, res, next) {
  // Guardar el método original de res.json
  const originalJson = res.json;

  // Sobrecargar res.json para detectar errores de BD
  res.json = function (data) {
    // Si hay un error y menciona la BD, redirigir a fallback
    if (data?.error?.includes?.("database")) {
      console.warn("⚠️  BD offline, usando datos mock para:", req.path);
      return originalJson.call(
        this,
        generateMockResponse(req.path, req.method, req.params, req.query)
      );
    }
    return originalJson.call(this, data);
  };

  // Sobrecargar res.status para capturar errores 503 de BD
  const originalStatus = res.status;
  res.status = function (code) {
    if (code === 503) {
      console.warn("⚠️  BD offline (503), usando datos mock para:", req.path);
      // Retornar con datos mock en lugar del error
      return originalJson.call(
        this,
        generateMockResponse(req.path, req.method, req.params, req.query)
      );
    }
    return originalStatus.call(this, code);
  };

  next();
}

/**
 * Genera respuestas mock según la ruta
 */
function generateMockResponse(path, method, params, query) {
  // GET /rooms
  if (path === "/rooms" && method === "GET") {
    return {
      ok: true,
      mode: "FALLBACK_MOCK",
      data: MOCK_ROOMS,
      message: "⚠️ Datos de prueba (BD offline)",
    };
  }

  // GET /rooms/:id
  if (path.match(/^\/rooms\/\d+$/) && method === "GET") {
    const id = parseInt(params.id);
    return {
      ok: true,
      mode: "FALLBACK_MOCK",
      data: MOCK_ROOMS.find((r) => r.id === id) || MOCK_ROOMS[0],
      message: "⚠️ Datos de prueba (BD offline)",
    };
  }

  // GET /rooms/available
  if (path.includes("available") && method === "GET") {
    return {
      ok: true,
      mode: "FALLBACK_MOCK",
      data: MOCK_ROOMS,
      message: "⚠️ Datos de prueba (BD offline)",
    };
  }

  // GET /reservations/me
  if (path.includes("reservations/me") && method === "GET") {
    return {
      ok: true,
      mode: "FALLBACK_MOCK",
      data: MOCK_RESERVATIONS,
      message: "⚠️ Datos de prueba (BD offline)",
    };
  }

  // GET /admin/reservations
  if (path.includes("admin/reservations") && method === "GET") {
    return {
      ok: true,
      mode: "FALLBACK_MOCK",
      data: MOCK_RESERVATIONS,
      message: "⚠️ Datos de prueba (BD offline)",
    };
  }

  // GET /admin/inquiries
  if (path.includes("admin/inquiries") && method === "GET") {
    return {
      ok: true,
      mode: "FALLBACK_MOCK",
      data: MOCK_INQUIRIES,
      message: "⚠️ Datos de prueba (BD offline)",
    };
  }

  // POST - cualquier creación
  if (method === "POST") {
    return {
      ok: true,
      mode: "FALLBACK_MOCK",
      id: Math.random() * 1000,
      message: "⚠️ Simulado (BD offline) - Datos no se guardaron",
    };
  }

  // Default fallback
  return {
    ok: true,
    mode: "FALLBACK_MOCK",
    data: [],
    message: "⚠️ Datos de prueba (BD offline)",
  };
}

module.exports = fallbackDbMiddleware;
