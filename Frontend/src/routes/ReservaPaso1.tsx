// src/routes/ReservaPaso1.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../context/BookingContext";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type Room = {
  id: string;
  name: string;
  capacity: number;
  pricePerNight: number;
  imageUrl?: string | null;
  description?: string | null;
};

export default function ReservaPaso1() {
  const navigate = useNavigate();
  const { setBooking, clearBooking } = useBooking();

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  function calcNights(a: string, b: string) {
    if (!a || !b) return 0;
    const A = new Date(a).getTime();
    const B = new Date(b).getTime();
    const diff = Math.round((B - A) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }

  async function buscar() {
    setError(null);
    setRooms([]);
    clearBooking();

    const nights = calcNights(start, end);
    if (!start || !end || nights <= 0) {
      setError("Seleccioná un rango de fechas válido (al menos 1 noche).");
      return;
    }
    if (guests <= 0) {
      setError("La cantidad de huéspedes debe ser mayor a 0.");
      return;
    }

    setLoading(true);
    try {
      const url = new URL(`${API_URL}/rooms/availability/search`);
      url.searchParams.set("start", start);
      url.searchParams.set("end", end);

      const res = await fetch(url.toString());
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al buscar habitaciones");
      }

      const list: Room[] = (data.data || []).filter(
        (r: Room) => r.capacity >= guests
      );

      if (list.length === 0) {
        setError("No hay habitaciones disponibles para ese rango.");
      }

      setRooms(list);
    } catch (e: any) {
      setError(e.message || "No se pudieron cargar las habitaciones.");
    } finally {
      setLoading(false);
    }
  }

  function elegir(room: Room) {
    const nights = calcNights(start, end);
    if (nights <= 0) return;

    const total = Number(room.pricePerNight) * nights;

    setBooking({
      roomId: room.id,
      roomName: room.name,
      imageUrl: room.imageUrl,
      pricePerNight: Number(room.pricePerNight),
      checkin: start,
      checkout: end,
      guests,
      nights,
      total,
    });

    navigate(`/checkout/${encodeURIComponent(room.id)}`);
  }

  return (
    <section className="container-max py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Reservar habitación</h1>
        <p className="text-sm text-muted">
          Paso 1 de 3 — Elegí fechas, huéspedes y una habitación disponible.
        </p>
      </header>

      {/* Filtros */}
      <div className="card p-4 flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="label">Check-in</label>
          <input
            type="date"
            className="input w-full"
            min={today}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="label">Check-out</label>
          <input
            type="date"
            className="input w-full"
            min={start || today}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Huéspedes</label>
          <input
            type="number"
            className="input w-28"
            min={1}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value) || 1)}
          />
        </div>
        <button
          onClick={buscar}
          className="btn w-full md:w-auto"
          disabled={loading}
        >
          {loading ? "Buscando..." : "Buscar disponibles"}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      {/* Resultados */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-2xl bg-gray-900/60 border border-border animate-pulse"
            />
          ))}

        {!loading &&
          rooms.map((room) => (
            <article
              key={room.id}
              className="card p-3 flex flex-col gap-3 border border-border/70 rounded-2xl bg-gray-950/80"
            >
              <div className="flex gap-3">
                {room.imageUrl ? (
                  <img
                    src={room.imageUrl}
                    alt={room.name}
                    className="w-24 h-24 rounded-xl object-cover border border-border"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-gray-800 border border-border" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{room.name}</h3>
                  <p className="text-xs text-muted">
                    Capacidad {room.capacity} huéspedes
                  </p>
                  <p className="text-sm mt-1">
                    <span className="font-semibold">
                      ${Number(room.pricePerNight).toFixed(2)}
                    </span>{" "}
                    <span className="text-xs text-muted">/ noche</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => elegir(room)}
                className="btn w-full mt-auto"
              >
                Elegir esta habitación
              </button>
            </article>
          ))}
      </div>

      {!loading && !error && rooms.length === 0 && (
        <p className="text-sm text-muted">
          Seleccioná fechas y huéspedes para ver habitaciones disponibles.
        </p>
      )}
    </section>
  );
}
