// src/routes/MisReservas.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useStatusTranslation } from "../utils/translateStatus";

type Status =
  | "PENDING"
  | "PAID"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELED";

type Room = {
  id: string;
  name: string;
  pricePerNight?: number;
  imageUrl?: string | null;
};

type Reservation = {
  id: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  total: string | number;
  status: Status;
  createdAt: string;
  code: string;
  room?: Pick<Room, "id" | "name" | "pricePerNight" | "imageUrl"> | null;
};

function fmtDate(s: string) {
  const d = new Date(s);
  return isNaN(+d)
    ? s
    : d.toLocaleDateString("es-AR", { dateStyle: "medium" });
}

function money(v: string | number) {
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return v.toString();
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  });
}

function nights(a: string, b: string) {
  const A = new Date(a).getTime();
  const B = new Date(b).getTime();
  if (!A || !B || Number.isNaN(A) || Number.isNaN(B)) return 0;
  return Math.max(0, Math.ceil((B - A) / 86400000));
}

function Badge({ s }: { s: Status }) {
  const translateStatus = useStatusTranslation();

  const colorMap: Record<Status, string> = {
    PENDING: "border-yellow-500/40 text-yellow-300",
    PAID: "border-emerald-500/40 text-emerald-300",
    CONFIRMED: "border-blue-500/40 text-blue-300",
    CHECKED_IN: "border-emerald-500/40 text-emerald-300",
    CHECKED_OUT: "border-slate-500/40 text-slate-300",
    CANCELED: "border-rose-500/40 text-rose-300",
  };

  return (
    <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${colorMap[s]}`}>
      {translateStatus(s)}
    </span>
  );
}

export default function MisReservas() {
  const { apiFetch } = useAuth();
  const [reservas, setReservas] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const toastId = toast.loading("Cargando reservas…");
    try {
      const res = await apiFetch("/bookings/mine");
      const data = await res.json().catch(() => ({}));

      const raw =
        Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.reservations)
          ? data.reservations
          : [];

      setReservas(raw as Reservation[]);
      toast.success("Reservas cargadas", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Error al cargar las reservas", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totalPagina = useMemo(
    () => reservas.reduce((a, r) => a + (Number(r.total) || 0), 0),
    [reservas]
  );

  async function cancelar(id: string, status: Status) {
    if (["CHECKED_IN", "CHECKED_OUT", "CANCELED"].includes(status)) return;
    if (!confirm("¿Seguro que querés cancelar esta reserva?")) return;

    await toast.promise(
      (async () => {
        const res = await apiFetch(`/bookings/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "CANCELED" }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      })(),
      {
        loading: "Cancelando…",
        success: "Reserva cancelada",
        error: (m) => m || "No se pudo cancelar",
      }
    );

    load();
  }

  if (loading) {
    return (
      <section className="container-max py-10">
        <p className="text-muted">Cargando tus reservas…</p>
      </section>
    );
  }

  return (
    <section className="container-max py-8 space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Mis reservas</h1>
          <p className="text-slate-400 text-sm">
            Historial y estado de todas tus reservas
          </p>
        </div>
        <div className="text-sm text-slate-300">
          Total: <b className="text-amber-400 text-lg">{money(totalPagina)}</b>
        </div>
      </header>

      {reservas.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/20 border border-slate-700/50 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">✨</div>
          <h3 className="text-xl font-semibold text-white mb-2">Aún no tenés reservas</h3>
          <p className="text-slate-400 mb-6">Comienza tu experiencia explorando nuestras habitaciones disponibles</p>
          <Link
            to="/"
            className="inline-block rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 font-medium transition-colors shadow-lg"
          >
            🏨 Explorar habitaciones
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reservas.map((r) => {
            const noche = nights(r.checkIn, r.checkOut);
            const statusColors: Record<Status, string> = {
              PENDING: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/40",
              PAID: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/40",
              CONFIRMED: "from-blue-500/20 to-blue-600/10 border-blue-500/40",
              CHECKED_IN: "from-lime-500/20 to-lime-600/10 border-lime-500/40",
              CHECKED_OUT: "from-slate-500/20 to-slate-600/10 border-slate-500/40",
              CANCELED: "from-rose-500/20 to-rose-600/10 border-rose-500/40",
            };

            return (
              <div
                key={r.id}
                className={`bg-gradient-to-r ${statusColors[r.status]} border rounded-xl p-5 hover:shadow-lg hover:shadow-slate-500/10 transition-all`}
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                  {/* Imagen + Info Habitación */}
                  <div className="flex gap-3">
                    {r.room?.imageUrl ? (
                      <img
                        src={r.room.imageUrl}
                        alt={r.room.name}
                        className="w-20 h-20 object-cover rounded-lg border border-slate-700"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                        🛏️
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-white">
                        {r.room?.name || r.roomId}
                      </div>
                      <div className="text-xs text-slate-400">Código: {r.code}</div>
                      {typeof r.room?.pricePerNight === "number" && (
                        <div className="text-sm text-blue-300 font-medium mt-1">
                          {money(r.room.pricePerNight)}/noche
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fechas */}
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400 font-medium uppercase">Fechas</div>
                    <div className="text-sm">
                      <div className="text-white font-semibold">
                        {fmtDate(r.checkIn)}
                      </div>
                      <div className="text-slate-400">
                        → {fmtDate(r.checkOut)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {noche} {noche === 1 ? "noche" : "noches"}
                      </div>
                    </div>
                  </div>

                  {/* Resumen */}
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400 font-medium uppercase">Resumen</div>
                    <div className="space-y-1 text-sm">
                      <div className="text-white">
                        Total: <b className="text-amber-300">{money(r.total)}</b>
                      </div>
                      <Badge s={r.status} />
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex justify-end">
                    {["CHECKED_IN", "CHECKED_OUT", "CANCELED"].includes(r.status) ? (
                      <div className="text-xs text-slate-500 text-right">
                        {r.status === "CHECKED_OUT" ? "✅ Completada" : r.status === "CHECKED_IN" ? "🏩 En progreso" : "❌ Cancelada"}
                      </div>
                    ) : (
                      <button
                        className="px-4 py-2 rounded-lg border border-rose-500/50 bg-rose-600/10 text-rose-300 hover:bg-rose-600/20 text-sm font-medium transition-all"
                        onClick={() => cancelar(r.id, r.status)}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
