// src/guards/RoleGuard.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../context/AuthContext";

type Props = {
  allow: Role[];        // roles permitidos
  children: React.ReactElement;
};

export default function RoleGuard({ allow, children }: Props) {
  const { token, user, hasRole } = useAuth();
  const location = useLocation();

  // Sin token → al login
  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // Hay token pero aún no cargamos el usuario (/auth/me)
  if (!user) {
    return (
      <div className="min-h-[50vh] grid place-items-center text-muted">
        Verificando sesión…
      </div>
    );
  }

  // Usuario logueado pero sin rol permitido
  const allowed = allow.some((r) => hasRole(r));
  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return children;
}
