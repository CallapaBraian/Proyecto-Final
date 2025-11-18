// src/components/Navbar.tsx
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { roleLabel } from "../utils/roleLabel";

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/contacto", label: t("nav.contact") },
    { to: "/mapa", label: t("nav.map") },
  ];

  // Links según el rol del usuario
  const extraLinks: { to: string; label: string }[] = [];

  // Para OPERATOR y ADMIN: ocultamos Home, Contacto y Mapa (solo ven Panel)
  const visibleLinks = (!user || user.role === "GUEST") ? links : [];

  if (user?.role === "GUEST") {
    extraLinks.push({ to: "/mis-reservas", label: t("nav.myReservations") });
    extraLinks.push({ to: "/mi-perfil", label: "Mi Perfil" });
  }

  if (user?.role === "OPERATOR" || user?.role === "ADMIN") {
    extraLinks.push({ to: "/panel", label: t("nav.panel") });
  }

  if (user?.role === "ADMIN") {
    extraLinks.push({ to: "/habitaciones-admin", label: t("nav.rooms") });
    extraLinks.push({ to: "/operadores-admin", label: t("nav.operators") });
  }

  function linkClass(path: string) {
    return `text-sm transition ${
      pathname === path
        ? "text-blue-400 font-semibold"
        : "text-slate-300 hover:text-blue-400"
    }`;
  }

  return (
    <header className="bg-slate-950 border-b border-slate-800 text-white shadow-sm">
      <nav className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        {/* LOGO */}
        <Link to="/" className="text-2xl font-bold tracking-tight">
          <span className="text-blue-500">Hotel</span>
          <span className="text-white">.ar</span>
        </Link>

        {/* LINKS IZQUIERDA + SELECTOR DE IDIOMA */}
        <ul className="flex gap-4 items-center">
          {visibleLinks.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className={linkClass(l.to)}>
                {l.label}
              </Link>
            </li>
          ))}

          {extraLinks.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className={linkClass(l.to)}>
                {l.label}
              </Link>
            </li>
          ))}

          {/* SELECTOR DE IDIOMA */}
          <li className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-700">
            <button
              onClick={() => setLanguage("es")}
              className={`text-xl transition ${
                language === "es"
                  ? "opacity-100 scale-110"
                  : "opacity-50 hover:opacity-75"
              }`}
              title="Español"
            >
              🇪🇸
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`text-xl transition ${
                language === "en"
                  ? "opacity-100 scale-110"
                  : "opacity-50 hover:opacity-75"
              }`}
              title="English"
            >
              🇺🇸
            </button>
          </li>
        </ul>

        {/* BOTÓN DERECHA */}
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 hidden sm:inline">
              {user.name} ({roleLabel(user.role)})
            </span>
            <button
              onClick={() => logout()}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-500 transition"
            >
              {t("nav.signOut")}
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-500 transition"
          >
            {t("nav.signIn")}
          </Link>
        )}
      </nav>
    </header>
  );
}
