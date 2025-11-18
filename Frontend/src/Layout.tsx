// src/Layout.tsx
import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useAuth } from "./context/AuthContext";

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Navbar superior */}
      <Navbar />

      {/* Contenido principal */}
      <main className="flex-grow px-4 sm:px-6 lg:px-8 py-6">
        {/* Indicador opcional de rol activo (útil en desarrollo) */}
        {user && (
          <div className="mb-4 text-sm text-slate-400 text-right">
            Rol actual: <b>{user.role}</b>
          </div>
        )}

        <Outlet />
      </main>

      {/* Pie de página */}
      <Footer />
    </div>
  );
}
