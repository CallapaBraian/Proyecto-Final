// src/routes/App.tsx
import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      {/* Toasts globales */}
      <Toaster position="top-right" />

      {/* Navbar global (se adapta por rol automáticamente) */}
      <Navbar />

      {/* Contenido principal dinámico */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer global */}
      <Footer />
    </div>
  );
}
