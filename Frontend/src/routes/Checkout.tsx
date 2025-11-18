// src/routes/Checkout.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useBooking } from "../context/BookingContext";

type Room = {
  id: string;
  name: string;
  capacity: number;
  pricePerNight: number;
  imageUrl?: string | null;
  description?: string | null;
};

type BookingResponse = {
  id: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  total: string | number;
  status: string;
  code: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// Helper para armar ISO con hora fija (checkin 15hs, checkout 11hs)
const atHourISO = (ymd: string, hour: number) =>
  `${ymd}T${String(hour).padStart(2, "0")}:00:00.000Z`;

export default function Checkout() {
  const { roomId } = useParams<{ roomId: string }>();
  const { apiFetch, user } = useAuth();
  const { booking, clearBooking } = useBooking();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);

  // Para modo "manual" (si no viene booking desde el contexto)
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");

  // Datos del huésped
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [guests, setGuests] = useState(1);

  const [loadingRoom, setLoadingRoom] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [isOk, setIsOk] = useState(false);
  const [created, setCreated] = useState<BookingResponse | null>(null);

  // Si no hay roomId en la URL, volvemos al inicio
  useEffect(() => {
    if (!roomId) {
      navigate("/", { replace: true });
    }
  }, [roomId, navigate]);

  // Prefill de datos de huésped a partir del usuario logueado
  useEffect(() => {
    if (user) {
      if (!guestName) setGuestName(user.name ?? "");
      if (!guestEmail) setGuestEmail(user.email ?? "");
    }
  }, [user, guestName, guestEmail]);

  // Si el contexto de booking tiene guests, usarlos
  useEffect(() => {
    if (booking && typeof (booking as any).guests === "number") {
      setGuests((booking as any).guests);
    }
  }, [booking]);

  // Traer datos de la habitación
  useEffect(() => {
    if (!roomId) return;
    (async () => {
      try {
        setLoadingRoom(true);
        const res = await fetch(`${API_URL}/rooms/${roomId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se encontró la habitación");
        setRoom(data);
      } catch (err) {
        console.error(err);
        setRoom(null);
      } finally {
        setLoadingRoom(false);
      }
    })();
  }, [roomId]);

  const today = useMemo(
    () => new Date().toISOString().split("T")[0],
    []
  );

  // Fechas / nights según fuente:
  // - Si hay booking en contexto y coincide roomId → usarlo
  // - Si no, usar inputs locales
  const effectiveCheckin =
    booking && (booking as any).roomId === roomId
      ? (booking as any).checkin
      : checkin;

  const effectiveCheckout =
    booking && (booking as any).roomId === roomId
      ? (booking as any).checkout
      : checkout;

  const minCheckout = useMemo(() => {
    if (!effectiveCheckin) return today;
    const d = new Date(effectiveCheckin);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, [effectiveCheckin, today]);

  const nights = useMemo(() => {
    if (!effectiveCheckin || !effectiveCheckout) return 0;
    const ci = new Date(effectiveCheckin).getTime();
    const co = new Date(effectiveCheckout).getTime();
    const diff = Math.ceil((co - ci) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [effectiveCheckin, effectiveCheckout]);

  const totalEstimado = useMemo(() => {
    if (!room || nights <= 0) return 0;
    return Number(room.pricePerNight) * nights;
  }, [room, nights]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setIsOk(false);
    setCreated(null);

    if (!user) {
      setMessage("Debés iniciar sesión para reservar.");
      return;
    }
    if (!roomId) {
      setMessage("Habitación inválida.");
      return;
    }

    const ci = effectiveCheckin;
    const co = effectiveCheckout;

    if (!ci || !co) {
      setMessage("Completá las fechas de check-in y check-out.");
      return;
    }
    if (new Date(ci) >= new Date(co)) {
      setMessage("El check-out debe ser posterior al check-in.");
      return;
    }

    // Validaciones básicas del huésped
    if (!guestName.trim()) {
      setMessage("Ingresá el nombre del huésped.");
      return;
    }
    if (!guestEmail.trim()) {
      setMessage("Ingresá el email del huésped.");
      return;
    }
    if (!guestPhone.trim()) {
      setMessage("Ingresá un teléfono de contacto.");
      return;
    }
    if (guests <= 0) {
      setMessage("La cantidad de huéspedes debe ser al menos 1.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        roomId,
        checkIn: atHourISO(ci, 15),
        checkOut: atHourISO(co, 11),
        guests,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim(),
        documentType: documentType.trim() || undefined,
        documentNumber: documentNumber.trim() || undefined,
      };

      const res = await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        if (res.status === 409) {
          setMessage(json.error || "La habitación ya está reservada en ese rango.");
        } else if (res.status === 400) {
          setMessage(json.error || "Datos inválidos, revisá la información.");
        } else if (res.status === 401) {
          setMessage("Sesión expirada. Volvé a iniciar sesión.");
        } else {
          setMessage(json.error || "Error al crear la reserva.");
        }
        return;
      }

      // Soporta respuestas tipo {reservation}, {data}, o el objeto directo
      const createdBooking: BookingResponse =
        json.reservation || json.data || json;

      setIsOk(true);
      setCreated(createdBooking);
      setMessage("✅ Reserva creada con éxito.");

      // Limpiar booking temporal si venía del paso anterior
      clearBooking();
    } catch (err) {
      console.error(err);
      setMessage("❌ Error de conexión con el servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  const showSummary =
    !!room && !!effectiveCheckin && !!effectiveCheckout && nights > 0;

  return (
    <section className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Finalizar reserva</h1>
      <p className="text-sm text-muted">
        Paso 2 de 3 — Revisá los datos, completá la información del huésped y confirmá tu estadía.
      </p>

      {/* Info de habitación */}
      <div className="card p-4 space-y-3">
        <h2 className="font-medium">Tu habitación</h2>

        {loadingRoom && (
          <p className="text-sm text-muted">Cargando habitación…</p>
        )}

        {!loadingRoom && !room && (
          <p className="text-sm text-red-400">
            No se encontró la habitación seleccionada.
          </p>
        )}

        {room && (
          <div className="flex gap-3 items-start">
            {room.imageUrl && (
              <img
                src={room.imageUrl}
                alt={room.name}
                className="w-24 h-24 object-cover rounded-xl border border-border"
              />
            )}
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-base">{room.name}</p>
              <p className="text-muted">
                Capacidad: {room.capacity} huéspedes
              </p>
              <p>
                Precio por noche:{" "}
                <span className="font-semibold">
                  ${Number(room.pricePerNight).toFixed(2)}
                </span>
              </p>
              {room.description && (
                <p className="text-xs text-muted">{room.description}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mensaje global */}
      {message && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            isOk
              ? "border-emerald-600/40 bg-emerald-900/15 text-emerald-300"
              : "border-rose-600/40 bg-rose-900/15 text-rose-300"
          }`}
        >
          {message}
        </div>
      )}

      {/* Si ya se creó correctamente, mostrar confirmación */}
      {isOk && created && room ? (
        <div className="rounded-2xl border border-emerald-700/40 bg-emerald-900/10 p-4 space-y-2">
          <h3 className="font-semibold">Reserva creada</h3>
          <ul className="text-sm space-y-1">
            <li>
              <span className="text-muted">Código:</span> {created.code}
            </li>
            <li>
              <span className="text-muted">Habitación:</span> {room.name}
            </li>
            <li>
              <span className="text-muted">Check-in:</span>{" "}
              {new Date(created.checkIn).toLocaleString()}
            </li>
            <li>
              <span className="text-muted">Check-out:</span>{" "}
              {new Date(created.checkOut).toLocaleString()}
            </li>
            <li>
              <span className="text-muted">Total:</span>{" "}
              {typeof created.total === "number"
                ? `$${created.total.toFixed(2)}`
                : `$${Number(created.total || 0).toFixed(2)}`}
            </li>
            <li>
              <span className="text-muted">Estado:</span> {created.status}
            </li>
            <li>
              <span className="text-muted">ID Reserva:</span> {created.id}
            </li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/" className="btn">
              Volver al inicio
            </Link>
            <Link to="/mis-reservas" className="btn-outline">
              Ver mis reservas
            </Link>
          </div>
        </div>
      ) : (
        // Formulario (usa booking del contexto si existe, si no deja elegir fechas)
        <form onSubmit={handleSubmit} className="card p-4 space-y-4">
          {!booking && (
            <p className="text-xs text-muted">
              No detectamos un paso previo de selección. Elegí las fechas para esta habitación y completá los datos del huésped.
            </p>
          )}

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Check-in</label>
              <input
                type="date"
                className="input"
                min={today}
                value={effectiveCheckin || ""}
                onChange={(e) => !booking && setCheckin(e.target.value)}
                required
                disabled={!!booking}
              />
            </div>
            <div>
              <label className="label">Check-out</label>
              <input
                type="date"
                className="input"
                min={minCheckout}
                value={effectiveCheckout || ""}
                onChange={(e) => !booking && setCheckout(e.target.value)}
                required
                disabled={!!booking}
              />
            </div>
          </div>

          {/* Datos del huésped */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre del huésped</label>
              <input
                type="text"
                className="input"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Email de contacto</label>
              <input
                type="email"
                className="input"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input
                type="tel"
                className="input"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Cantidad de huéspedes</label>
              <input
                type="number"
                className="input"
                min={1}
                value={guests}
                onChange={(e) =>
                  setGuests(Math.max(1, Number(e.target.value) || 1))
                }
                required
              />
            </div>
            <div>
              <label className="label">Tipo de documento (opcional)</label>
              <input
                type="text"
                className="input"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Nro. documento (opcional)</label>
              <input
                type="text"
                className="input"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Resumen dinámico */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-xl border border-border">
              <div className="text-muted">Noches</div>
              <div className="font-medium">{nights || "—"}</div>
            </div>
            <div className="p-3 rounded-xl border border-border">
              <div className="text-muted">Total estimado</div>
              <div className="font-medium">
                {showSummary ? `$${totalEstimado.toFixed(2)}` : "—"}
              </div>
            </div>
          </div>

          <button className="btn w-full" disabled={submitting || !room}>
            {submitting ? "Creando reserva..." : "Confirmar reserva"}
          </button>
        </form>
      )}
    </section>
  );
}
