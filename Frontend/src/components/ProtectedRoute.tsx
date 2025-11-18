// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../context/AuthContext";

interface Props {
  children: ReactNode;
  /** Lista de roles permitidos */
  roles?: Role[];
  /** Destino por defecto si no tiene sesión */
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  roles,
  redirectTo = "/login",
}: Props) {
  const { user, token, hasRole } = useAuth();
  const location = useLocation();

  // ⛔ No hay token → redirigir a login
  if (!token) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // ⏳ Hay token pero todavía no cargó el usuario (llamada /auth/me)
  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-slate-400 text-sm">Verificando sesión…</p>
      </div>
    );
  }

  // ❌ Usuario cargado pero rol NO permitido
  if (roles && roles.length > 0 && !hasRole(...roles)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center">
        <h2 className="text-xl font-semibold text-red-400">Acceso denegado</h2>
        <p className="text-slate-300">
          Tu rol (<b>{user.role}</b>) no tiene permisos para acceder a esta página.
        </p>
        <a
          href="/"
          className="px-4 py-2 mt-2 rounded-xl border border-slate-600 hover:bg-slate-800 transition text-sm"
        >
          Ir al inicio
        </a>
      </div>
    );
  }

  // ✔ Autorizado
  return <>{children}</>;
}
