// src/routes/Home.tsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import FondoHotel from "../assets/FondoHotel.png";

type Room = {
  id: string;
  name: string;
  capacity: number;
  pricePerNight?: number | null;
  imageUrl?: string | null;
  createdAt?: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function money(n?: number | null) {
  const v = Number(n ?? 0);
  return v.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  });
}

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirigir OPERATOR/ADMIN a /panel
  useEffect(() => {
    if (user && (user.role === "OPERATOR" || user.role === "ADMIN")) {
      navigate("/panel", { replace: true });
    }
  }, [user, navigate]);

  // Filtros UI
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<
    "recientes" | "precioAsc" | "precioDesc" | "nombre"
  >("recientes");

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      const toastId = toast.loading("Cargando habitaciones…");
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/rooms`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const raw = await res.json();
        const data: Room[] = Array.isArray(raw) ? raw : raw.data ?? [];

        setRooms(data);
        toast.success("Habitaciones listas", { id: toastId });
      } catch (err: any) {
        if (err?.name === "AbortError") {
          toast.dismiss(toastId);
          return;
        }
        toast.error(
          err?.message || "No se pudieron cargar las habitaciones",
          { id: toastId }
        );
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, []);

  const filtered = useMemo(() => {
    let list = rooms;

    if (q.trim()) {
      const term = q.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(term));
    }

    switch (sort) {
      case "precioAsc":
        list = [...list].sort(
          (a, b) =>
            Number(a.pricePerNight ?? 0) - Number(b.pricePerNight ?? 0)
        );
        break;
      case "precioDesc":
        list = [...list].sort(
          (a, b) =>
            Number(b.pricePerNight ?? 0) - Number(a.pricePerNight ?? 0)
        );
        break;
      case "nombre":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // recientes por createdAt; si no hay, fallback por nombre
        list = [...list].sort((a, b) => {
          const A = a.createdAt ? +new Date(a.createdAt) : 0;
          const B = b.createdAt ? +new Date(b.createdAt) : 0;
          if (A === B) return a.name.localeCompare(b.name);
          return B - A;
        });
    }
    return list;
  }, [rooms, q, sort]);

  return (
    <section className="min-h-[calc(100vh-6rem)] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* HERO con imagen de fondo */}
      <div className="relative overflow-hidden border-b border-slate-800">
        {/* Imagen */}
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{
            backgroundImage: `url(${FondoHotel})`,
          }}
        />
        {/* Overlay oscuro + degradé azul para texto legible */}
        <div className="absolute inset-0 bg-slate-950/50" />
        <div className="absolute inset-0 bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgba(59,130,246,0.45),transparent_70%)] pointer-events-none" />

        {/* Contenido */}
        <div className="relative container mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3 drop-shadow-[0_6px_20px_rgba(0,0,0,0.7)]">
            {t("home.title", "Reservá tu estadía en Hotel.ar")}
          </h1>
          <p className="text-slate-100 max-w-2xl mx-auto mb-6 text-sm md:text-base drop-shadow-[0_4px_15px_rgba(0,0,0,0.8)]">
            {t(
              "home.subtitle",
              "Explorá nuestras habitaciones y gestioná tus reservas online con un panel moderno para administradores y operadores."
            )}
          </p>
          <button
            onClick={() => {
              const el = document.getElementById("rooms-list");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-block rounded-xl border border-slate-200/80 bg-slate-950/70 hover:bg-blue-600 hover:border-blue-400 px-6 py-3 text-sm font-medium transition-colors duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
          >
            Ver habitaciones
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="container mx-auto max-w-6xl px-4 pt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre…"
            className="w-full sm:w-80 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600/40"
          />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Ordenar por</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2"
            >
              <option value="recientes">Más recientes</option>
              <option value="precioAsc">Precio: menor a mayor</option>
              <option value="precioDesc">Precio: mayor a menor</option>
              <option value="nombre">Nombre</option>
            </select>
          </div>
        </div>
      </div>

      {/* LISTA */}
      <div id="rooms-list" className="container mx-auto max-w-6xl px-4 py-8">
        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 shadow-md animate-pulse"
              >
                <div className="h-40 rounded-xl bg-slate-800 mb-4" />
                <div className="h-4 w-2/3 bg-slate-800 rounded mb-2" />
                <div className="h-4 w-1/3 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="mt-6 text-slate-300 text-center">
            {t("home.empty", "No hay habitaciones para mostrar.")}
          </p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 mt-2">
            {filtered.map((r) => {
              const hasImg = r.imageUrl && r.imageUrl.trim().length > 0;
              return (
                <article
                  key={r.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-lg hover:shadow-blue-500/20 hover:border-blue-500/40 transition-all duration-300"
                >
                  {/* Imagen */}
                  <div className="mb-4 overflow-hidden rounded-xl">
                    {hasImg ? (
                      <img
                        src={r.imageUrl!}
                        alt={r.name}
                        className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-40 rounded-xl bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900" />
                    )}
                  </div>

                  {/* Precio */}
                  {typeof r.pricePerNight === "number" && (
                    <span className="absolute top-5 right-5 bg-blue-600/85 text-white text-xs font-medium px-3 py-1 rounded-full shadow-md">
                      {money(r.pricePerNight)} / noche
                    </span>
                  )}

                  {/* Info */}
                  <h3 className="font-semibold text-lg tracking-tight mb-1">
                    {r.name}
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Capacidad {r.capacity}{" "}
                    {r.capacity === 1 ? "persona" : "personas"}
                  </p>

                  <div className="flex gap-3">
                    <Link
                      to={`/unidad/${encodeURIComponent(r.id)}`}
                      className="inline-block rounded-xl border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800 transition"
                    >
                      Ver detalle
                    </Link>
                    <Link
                      to={`/checkout/${encodeURIComponent(r.id)}`}
                      className="inline-block rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
                    >
                      Reservar ahora
                    </Link>
                  </div>

                  {/* Glow */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      boxShadow:
                        "0 0 0 1px rgba(59,130,246,0.25), 0 8px 30px rgba(59,130,246,0.15)",
                    }}
                  />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
