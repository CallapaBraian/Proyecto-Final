// src/routes/Detalle.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useBooking } from "../context/BookingContext";

type Room = {
  id: string;
  name: string;
  capacity: number;
  pricePerNight?: number;
  description?: string | null;
  imageUrl?: string | null;
  createdAt?: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

function money(n?: number) {
  return Number(n ?? 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
  });
}

export default function Detalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setBooking } = useBooking();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [disponible, setDisponible] = useState<boolean | null>(null);

  // =========================
  // Cargar habitación
  // =========================
  useEffect(() => {
    if (!id) return;

    const ctrl = new AbortController();

    (async () => {
      const t = toast.loading("Cargando habitación…");
      try {
        setLoading(true);
        setImageError(false);

        const res = await fetch(`${API_URL}/rooms/${id}`, {
          signal: ctrl.signal,
        });

        const j = await res.json();

        if (!res.ok) throw new Error(j.error || "No se encontró la habitación");

        // Si la URL es de GitHub y genera error, usar URL local como fallback
        let roomData = j.data || j;
        if (roomData.imageUrl && roomData.imageUrl.includes('github')) {
          // Reemplazar con URL local como fallback
          const imageName = roomData.imageUrl.split('/').pop(); // obtener nombre del archivo
          if (imageName) {
            roomData.imageUrl = `${API_URL}/images/${imageName}`;
          }
        }

        setRoom(roomData);

        toast.success("Habitación cargada", { id: t });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast.error(err.message || "Error cargando habitación", { id: t });
        }
        setRoom(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      ctrl.abort();
    };
  }, [id]);

  // =========================
  // Cálculo de noches y total
  // =========================
  const noches = useMemo(() => {
    if (!checkin || !checkout) return 0;
    const A = new Date(checkin).getTime();
    const B = new Date(checkout).getTime();
    const n = Math.ceil((B - A) / 86400000);
    return isFinite(n) && n > 0 ? n : 0;
  }, [checkin, checkout]);

  const total = useMemo(
    () => (room?.pricePerNight ?? 0) * noches,
    [room?.pricePerNight, noches]
  );

  // =========================
  // Verificar disponibilidad
  // =========================
  async function verificar() {
    if (!checkin || !checkout) {
      return toast.error("Elegí un rango de fechas");
    }

    const t = toast.loading("Verificando…");

    try {
      const url = new URL(`${API_URL}/rooms/availability/search`);
      url.searchParams.set("start", checkin);
      url.searchParams.set("end", checkout);

      const res = await fetch(url.toString());
      const j = await res.json();
      const ok = (j.data ?? []).some((r: any) => r.id === room?.id);

      setDisponible(ok);

      toast[ok ? "success" : "error"](
        ok ? "Disponible" : "No disponible en esas fechas",
        { id: t }
      );
    } catch (err: any) {
      toast.error(err.message || "Error verificando disponibilidad", { id: t });
      setDisponible(null);
    }
  }

  // =========================
  // Continuar al Checkout
  // =========================
  function reservar() {
    if (!room) return toast.error("No se encontró habitación");
    if (!checkin || !checkout)
      return toast.error("Completá las fechas antes de continuar");
    if (disponible === false)
      return toast.error("La habitación no está disponible");

    // Guardar datos en el contexto (paso 1 → paso 2)
    setBooking({
      roomId: room.id,
      roomName: room.name,
      imageUrl: room.imageUrl,
      pricePerNight: room.pricePerNight ?? 0,
      checkin,
      checkout,
      guests: 1,
      nights: noches,
      total,
    });

    navigate(`/checkout/${encodeURIComponent(room.id)}`);
  }

  // =========================
  // Render
  // =========================
  return (
    <section className="container-max py-10 text-white">
      {loading && <p className="text-muted">Cargando…</p>}

      {!loading && !room && (
        <p className="text-red-400 text-center">No se encontró la habitación</p>
      )}

      {room && (
        <div className="grid gap-8 md:grid-cols-2 items-start">
          {/* Imagen */}
          <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
            {room.imageUrl ? (
              <img
                src={room.imageUrl}
                alt={room.name}
                className="w-full h-72 object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="h-72 bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center">
                <span className="text-slate-400">Sin imagen</span>
              </div>
            )}
          </div>

          {/* Datos */}
          <div className="space-y-5">
            <h1 className="text-3xl font-semibold">{room.name}</h1>

            <p className="text-slate-300">
              Capacidad: {room.capacity} huéspedes ·{" "}
              {room.pricePerNight != null
                ? `${money(room.pricePerNight)} / noche`
                : "—"}
            </p>

            {room.description && (
              <p className="text-slate-400 text-sm">{room.description}</p>
            )}

            {/* Fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Check-in
                </label>
                <input
                  type="date"
                  value={checkin}
                  onChange={(e) => setCheckin(e.target.value)}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Check-out
                </label>
                <input
                  type="date"
                  value={checkout}
                  onChange={(e) => setCheckout(e.target.value)}
                  className="input w-full"
                />
              </div>
            </div>

            {/* Total */}
            <div className="text-sm text-slate-400">
              Noches: <b>{noches}</b> · Total estimado: <b>{money(total)}</b>
            </div>

            {/* Botones */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={verificar}
                className="btn-outline px-4 py-2 rounded-xl text-sm"
              >
                Verificar disponibilidad
              </button>

              <button
                onClick={reservar}
                disabled={disponible === false || !checkin || !checkout}
                className={`btn px-4 py-2 rounded-xl text-sm ${
                  disponible === false
                    ? "opacity-40 cursor-not-allowed"
                    : ""
                }`}
              >
                Continuar a reservar
              </button>

              {disponible !== null && (
                <span
                  className={`text-xs px-2 py-1 rounded-lg border ${
                    disponible
                      ? "border-emerald-500/40 text-emerald-300"
                      : "border-rose-500/40 text-rose-300"
                  }`}
                >
                  {disponible ? "Disponible" : "No disponible"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
