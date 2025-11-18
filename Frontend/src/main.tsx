// src/main.tsx
import React, { Suspense, useEffect } from "react";
import ReactDOM from "react-dom/client";
import {
  createHashRouter,
  RouterProvider,
  useLocation,
} from "react-router-dom";

import "./index.css";
import "./i18n";

// Providers
import { AuthProvider } from "./context/AuthContext";
import { BookingProvider } from "./context/BookingContext";
import { LanguageProvider } from "./context/LanguageContext";

// Guards
import ProtectedRoute from "./components/ProtectedRoute";

// Rutas
import App from "./routes/App";
import Home from "./routes/Home";
import Resultados from "./routes/Resultados";
import Detalle from "./routes/Detalle";
import Checkout from "./routes/Checkout";
import Panel from "./routes/Panel";
import Contacto from "./routes/Contacto";
import Login from "./routes/Login";
import Register from "./routes/Register";
import MisReservas from "./routes/MisReservas";
import MiPerfil from "./routes/MiPerfil";
import ReservaPaso1 from "./routes/ReservaPaso1";
import MapaHotel from "./routes/MapaHotel"; // 👈 NUEVO
import HabitacionesAdmin from "./routes/HabitacionesAdmin";
import OperadoresAdmin from "./routes/OperadoresAdmin";

/* ======================================================
   Scroll automático en HashRouter
====================================================== */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pathname, hash]);
  return null;
}

/* ======================================================
   Página de error global
====================================================== */
function RouteError() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-3">
      <h1 className="text-3xl font-bold text-brand-400">Algo salió mal</h1>
      <p className="text-muted">Intentá recargar la página.</p>
      <a
        href="#/"
        className="mt-2 inline-block px-4 py-2 rounded-xl border border-border hover:bg-gray-800 transition"
      >
        Volver al inicio
      </a>
    </div>
  );
}

/* ======================================================
   Google Identity — Inicialización global
====================================================== */
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "227337291053-15aafgrmrrhvnoii60okr5hb642s1d3e.apps.googleusercontent.com";

function useInitGoogle() {
  useEffect(() => {
    const loadGoogle = () => {
      if (window.google && window.google.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: () => {
            // El callback real se maneja en Login.tsx
          },
        });
      } else {
        console.warn("⚠️ Google Identity aún no está disponible.");
      }
    };

    window.addEventListener("load", loadGoogle);
    return () => window.removeEventListener("load", loadGoogle);
  }, []);
}

/* ======================================================
   Rutas de la aplicación
====================================================== */
const router = createHashRouter([
  {
    path: "/",
    element: (
      <>
        <ScrollToTop />
        <App />
      </>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: "resultados", element: <Resultados /> },
      { path: "unidad/:id", element: <Detalle /> },

      // Paso 1 del flujo de reserva
      { path: "reserva", element: <ReservaPaso1 /> },

      // Checkout solo para huéspedes
      {
        path: "checkout/:roomId",
        element: (
          <ProtectedRoute roles={["GUEST"]}>
            <Checkout />
          </ProtectedRoute>
        ),
      },

      // Mapa del hotel (público)
      { path: "mapa", element: <MapaHotel /> },

      // Autenticación
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },

      // Mis reservas solo para GUEST
      {
        path: "mis-reservas",
        element: (
          <ProtectedRoute roles={["GUEST"]}>
            <MisReservas />
          </ProtectedRoute>
        ),
      },

      // Mi perfil - solo para GUEST
      {
        path: "mi-perfil",
        element: (
          <ProtectedRoute roles={["GUEST"]}>
            <MiPerfil />
          </ProtectedRoute>
        ),
      },

      // Panel para ADMIN u OPERATOR
      {
        path: "panel",
        element: (
          <ProtectedRoute roles={["ADMIN", "OPERATOR"]}>
            <Panel />
          </ProtectedRoute>
        ),
      },

      // Habitaciones - solo ADMIN
      {
        path: "habitaciones-admin",
        element: (
          <ProtectedRoute roles={["ADMIN"]}>
            <HabitacionesAdmin />
          </ProtectedRoute>
        ),
      },

      // Operadores - solo ADMIN
      {
        path: "operadores-admin",
        element: (
          <ProtectedRoute roles={["ADMIN"]}>
            <OperadoresAdmin />
          </ProtectedRoute>
        ),
      },

      // Contacto
      { path: "contacto", element: <Contacto /> },

      // 404
      {
        path: "*",
        element: (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-3">
            <h1 className="text-3xl font-bold text-brand-400">404</h1>
            <p className="text-muted">Página no encontrada</p>
            <a
              href="#/"
              className="mt-2 inline-block px-4 py-2 rounded-xl border border-border hover:bg-gray-800 transition"
            >
              Volver al inicio
            </a>
          </div>
        ),
      },
    ],
  },
]);

/* ======================================================
   Render principal
====================================================== */
function Root() {
  useInitGoogle();

  return (
    <LanguageProvider>
      <AuthProvider>
        <BookingProvider>
          <Suspense
            fallback={<div className="p-6 text-center text-muted">Cargando…</div>}
          >
            <RouterProvider router={router} />
          </Suspense>
        </BookingProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
