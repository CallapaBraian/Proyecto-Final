// src/routes/Panel.tsx
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useStatusTranslation } from "../utils/translateStatus";
import { roleLabel } from "../utils/roleLabel";

/* =======================
   Tipos
======================= */
type Role = "ADMIN" | "OPERATOR" | "GUEST";

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
  capacity: number;
  pricePerNight: number;
  imageUrl?: string | null;
  description?: string | null;
  isActive: boolean;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type Reservation = {
  id: string;
  code: string;
  roomId: string;
  userId: string | null;
  checkIn: string; // ISO
  checkOut: string; // ISO
  total: string | number;
  status: Status;
  createdAt: string;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  room?: Pick<Room, "id" | "name" | "pricePerNight" | "imageUrl"> | null;
  user?: Pick<User, "id" | "name" | "email" | "role"> | null;
};

type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  response?: string | null;
  status: "NEW" | "IN_PROGRESS" | "ANSWERED" | "CLOSED";
  respondedAt?: string | null;
  createdAt: string;
};

/* =======================
   Utilidades
======================= */
const statusList: Status[] = [
  "PENDING",
  "PAID",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELED",
];

function fmtCurrency(v: string | number) {
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  });
}

function fmtDate(s: string) {
  const d = new Date(s);
  return isNaN(+d)
    ? s
    : d.toLocaleDateString("es-AR", { dateStyle: "medium" });
}

function StatusBadge({ s }: { s: Status }) {
  const translateStatus = useStatusTranslation();
  
  const map: Record<Status, string> = {
    PENDING: "bg-yellow-500/10 text-yellow-300 border-yellow-600/50",
    PAID: "bg-emerald-500/10 text-emerald-300 border-emerald-600/50",
    CONFIRMED: "bg-blue-500/10 text-blue-300 border-blue-600/50",
    CHECKED_IN: "bg-lime-500/10 text-lime-300 border-lime-600/50",
    CHECKED_OUT: "bg-slate-500/10 text-slate-300 border-slate-600/50",
    CANCELED: "bg-rose-500/10 text-rose-300 border-rose-600/50",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-lg text-[10px] border font-semibold ${map[s]}`}
    >
      {translateStatus(s)}
    </span>
  );
}

/* =======================
   Panel principal
======================= */
export default function Panel() {
  const { apiFetch, user, hasRole } = useAuth();
  const { t } = useLanguage();

  const [reservas, setReservas] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [roomPopularity, setRoomPopularity] = useState<
    Array<{ roomId: string; roomName: string; bookingsCount: number }>
  >([]);
  
  // Estados para inquiries (consultas)
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [responseText, setResponseText] = useState("");
  const [sendingResponse, setSendingResponse] = useState(false);

  const isAdmin = hasRole("ADMIN");
  const isOperator = hasRole("OPERATOR");
  const canManage = isAdmin || isOperator;

  /* ---- Cargar datos (reservas + habitaciones) ---- */
  async function load() {
    if (!canManage) return;
    setLoading(true);
    try {
      // Filtros para /bookings (panel)
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);

      const [rBookings, rRooms] = await Promise.all([
        apiFetch(`/bookings?${params.toString()}`),
        apiFetch("/rooms"),
      ]);

      const bookingsJson = await rBookings.json().catch(() => ({}));
      const roomsJson = await rRooms.json().catch(() => ({}));

      // Cargar room popularity solo para ADMIN
      if (isAdmin) {
        try {
          const rPopularity = await apiFetch("/bookings/stats/rooms-popularity");
          const popJson = await rPopularity.json().catch(() => ({}));
          if (rPopularity.ok) {
            setRoomPopularity(popJson.data || []);
          }
        } catch (err) {
          console.error("Error cargando room popularity:", err);
        }
      }

      // Cargar inquiries para OPERATOR
      if (isOperator || isAdmin) {
        try {
          const rInquiries = await apiFetch("/contact");
          const inqJson = await rInquiries.json().catch(() => ({}));
          if (rInquiries.ok) {
            const inqList: Inquiry[] = Array.isArray(inqJson)
              ? inqJson
              : inqJson.data || [];
            setInquiries(inqList);
          }
        } catch (err) {
          console.error("Error cargando inquiries:", err);
          setInquiries([]);
        }
      }

      if (!rBookings.ok) {
        console.error("Error /bookings:", bookingsJson);
        setReservas([]);
      } else {
        const raw: any[] = Array.isArray(bookingsJson)
          ? bookingsJson
          : bookingsJson.data || bookingsJson.items || [];
        const list: Reservation[] = raw.map((r) => ({
          ...r,
          total: r.total ?? 0,
        }));
        setReservas(list);
      }

      if (!rRooms.ok) {
        console.error("Error /rooms:", roomsJson);
        setRooms([]);
      } else {
        const rawRooms: any[] = Array.isArray(roomsJson)
          ? roomsJson
          : roomsJson.data || roomsJson.items || [];
        const listRooms: Room[] = rawRooms.map((rm) => ({
          ...rm,
          pricePerNight: Number(rm.pricePerNight ?? 0),
          isActive: Boolean(rm.isActive),
        }));
        setRooms(listRooms);
      }

      // No mostrar toast de éxito, solo silenciosamente cargar
    } catch (err) {
      console.error("Error cargando panel:", err);
      setReservas([]);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter]);

  /* ---- Cambiar estado de reserva ---- */
  async function updateStatus(id: string, to: Status) {
    if (!canManage) return;
    await toast.promise(
      (async () => {
        const res = await apiFetch(`/bookings/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: to }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `No se pudo actualizar a ${to}`);
        }
      })(),
      {
        loading: "Actualizando estado…",
        success: "Estado actualizado",
        error: (m) => m || "Error al actualizar estado",
      }
    );
    load();
  }

  /* ---- Responder inquiry ---- */
  async function respondToInquiry(inquiryId: string, response: string) {
    if (!response.trim()) {
      toast.error("La respuesta no puede estar vacía");
      return;
    }
    
    setSendingResponse(true);
    try {
      const res = await apiFetch(`/contact/${inquiryId}/response`, {
        method: "PATCH",
        body: JSON.stringify({ response: response.trim() }),
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(data.error || "Error al responder");
      }
      
      toast.success("Respuesta enviada correctamente");
      setResponseText("");
      setSelectedInquiry(null);
      load(); // Recargar inquiries
    } catch (err) {
      console.error("Error respondiendo inquiry:", err);
      toast.error(err instanceof Error ? err.message : "Error al responder");
    } finally {
      setSendingResponse(false);
    }
  }

  /* ---- Abrir / cerrar habitación ---- */
  async function toggleRoomActive(room: Room) {
    await toast.promise(
      (async () => {
        const res = await apiFetch(`/rooms/${room.id}`, {
          method: "PATCH",
          body: JSON.stringify({ isActive: !room.isActive }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }
      })(),
      {
        loading: room.isActive
          ? "Cerrando habitación…"
          : "Abriendo habitación…",
        success: "Habitación actualizada",
        error: (m) => m || "No se pudo actualizar la habitación",
      }
    );
    load();
  }

  /* =======================
     KPIs (admin + operator)
  ======================= */
  const totalReservas = reservas.length;

  const canceladas = useMemo(
    () => reservas.filter((r) => r.status === "CANCELED").length,
    [reservas]
  );

  const activas = useMemo(
    () =>
      reservas.filter((r) =>
        ["PENDING", "PAID", "CONFIRMED", "CHECKED_IN"].includes(r.status)
      ).length,
    [reservas]
  );

  const ingresosTotales = useMemo(
    () =>
      reservas
        .filter((r) => r.status !== "CANCELED")
        .reduce((a, r) => a + (Number(r.total) || 0), 0),
    [reservas]
  );

  const totalPagina = useMemo(
    () => reservas.reduce((a, r) => a + (Number(r.total) || 0), 0),
    [reservas]
  );

  /* ---- Gráfico mensual rápido (año actual) ---- */
  const yearNow = new Date().getFullYear();
  const ingresosMes = useMemo(() => {
    const arr = new Array(12).fill(0) as number[];
    reservas.forEach((r) => {
      if (r.status === "CANCELED") return;
      const d = new Date(r.checkIn);
      if (!isNaN(+d) && d.getFullYear() === yearNow) {
        arr[d.getMonth()] += Number(r.total) || 0;
      }
    });
    return arr;
  }, [reservas, yearNow]);

  /* =======================
     Vistas según rol
  ======================= */

  if (!user) {
    return (
      <section className="container-max py-10 text-center">
        <h1 className="text-2xl font-semibold mb-2">Panel de gestión</h1>
        <p className="text-muted">
          Debés iniciar sesión para acceder a este módulo.
        </p>
      </section>
    );
  }

  if (!canManage) {
    return (
      <section className="container-max py-10 text-center">
        <h1 className="text-2xl font-semibold mb-2">Acceso restringido</h1>
        <p className="text-muted">
          Este panel es solo para usuarios con rol{" "}
          <b>Administrador</b> u <b>Operador</b>.
        </p>
      </section>
    );
  }

  /* ---- Vista OPERADOR pura (sin admin) ---- */
  if (isOperator && !isAdmin) {
    return (
      <section className="container-max py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Panel del Operador</h1>
          <p className="text-muted text-sm">
            Sesión: {user.email} · Rol{" "}
            <b>{roleLabel(user.role)}</b>
          </p>
        </header>

        {/* Mapa simple de habitaciones */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Mapa de habitaciones</h2>
          <p className="text-xs text-muted mb-3">
            Visualización rápida de habitaciones libres/ocupadas. Podés abrir o
            cerrar habitaciones según disponibilidad operativa.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => {
              const bloqueantes: Status[] = [
                "PENDING",
                "PAID",
                "CONFIRMED",
                "CHECKED_IN",
              ];
              const tieneActiva = reservas.some(
                (r) =>
                  r.roomId === room.id && bloqueantes.includes(r.status)
              );

              const estadoTexto = !room.isActive
                ? "CERRADA"
                : tieneActiva
                ? "OCUPADA / RESERVADA"
                : "LIBRE";

              const estadoColor = !room.isActive
                ? "bg-slate-500/15 border-slate-500/60"
                : tieneActiva
                ? "bg-rose-500/15 border-rose-500/60"
                : "bg-emerald-500/15 border-emerald-500/60";

              return (
                <div
                  key={room.id}
                  className={`p-4 rounded-2xl border ${estadoColor} space-y-2`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold truncate">{room.name}</h3>
                    <span className="text-[10px] text-muted">{estadoTexto}</span>
                  </div>
                  {room.imageUrl && (
                    <img
                      src={room.imageUrl}
                      alt={room.name}
                      className="w-full h-28 object-cover rounded-xl border border-border"
                      loading="lazy"
                    />
                  )}
                  <p className="text-xs text-muted">
                    Capacidad {room.capacity} ·{" "}
                    {fmtCurrency(room.pricePerNight)}/noche
                  </p>
                  <button
                    onClick={() => toggleRoomActive(room)}
                    className="mt-2 w-full text-xs px-3 py-1 rounded-lg border border-border hover:bg-gray-900"
                  >
                    {room.isActive ? "Cerrar habitación" : "Abrir habitación"}
                  </button>
                </div>
              );
            })}

            {!loading && rooms.length === 0 && (
              <p className="text-muted text-sm col-span-full">
                No hay habitaciones cargadas.
              </p>
            )}
          </div>
        </section>

        {/* Reservas recientes para gestión rápida */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Reservas</h2>
          <p className="text-xs text-muted">
            Confirmá ingresos y egresos. Podés marcar check-in / check-out y
            cancelar si es necesario.
          </p>

          <div className="bg-gray-900/40 border border-border rounded-2xl overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-muted border-b border-border">
                <tr className="[&>th]:px-4 [&>th]:py-2 text-left">
                  <th>Código</th>
                  <th>Habitación</th>
                  <th>Huésped</th>
                  <th>{t("reservations.checkIn")}</th>
                  <th>{t("reservations.checkOut")}</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {!loading &&
                  reservas.map((r) => (
                    <tr key={r.id} className="border-b border-border/40">
                      <td className="px-4 py-2 text-xs font-mono">{r.code}</td>
                      <td className="px-4 py-2">{r.room?.name || r.roomId}</td>
                      <td className="px-4 py-2 text-xs">
                        <div className="font-medium">
                          {r.guestName || r.user?.name || "Huésped"}
                        </div>
                        <div className="text-[10px] text-muted">
                          {r.guestEmail || r.user?.email || "Sin email"}
                        </div>
                      </td>
                      <td className="px-4 py-2">{fmtDate(r.checkIn)}</td>
                      <td className="px-4 py-2">{fmtDate(r.checkOut)}</td>
                      <td className="px-4 py-2">
                        {fmtCurrency(r.total ?? 0)}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge s={r.status} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-2 flex-wrap">
                          {/* Marcar pagada */}
                          {r.status === "PENDING" && (
                            <Btn
                              onClick={() => updateStatus(r.id, "PAID")}
                            >
                              Marcar pagada
                            </Btn>
                          )}

                          {/* Confirmar */}
                          {["PENDING", "PAID"].includes(r.status) && (
                            <Btn
                              onClick={() =>
                                updateStatus(r.id, "CONFIRMED")
                              }
                            >
                              Confirmar
                            </Btn>
                          )}

                          {/* Check-in */}
                          {["CONFIRMED", "PAID"].includes(r.status) && (
                            <Btn
                              onClick={() =>
                                updateStatus(r.id, "CHECKED_IN")
                              }
                            >
                              {t("reservations.checkIn")}
                            </Btn>
                          )}

                          {/* Check-out */}
                          {r.status === "CHECKED_IN" && (
                            <Btn
                              onClick={() =>
                                updateStatus(r.id, "CHECKED_OUT")
                              }
                            >
                              {t("reservations.checkOut")}
                            </Btn>
                          )}

                          {/* Cancelar */}
                          {!["CHECKED_OUT", "CANCELED"].includes(
                            r.status
                          ) && (
                            <BtnDanger
                              onClick={() =>
                                updateStatus(r.id, "CANCELED")
                              }
                            >
                              Cancelar
                            </BtnDanger>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                {!loading && reservas.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-muted"
                    >
                      No hay reservas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sección de Consultas/Inquiries para responder */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">📧 Consultas de clientes</h2>
            <p className="text-xs text-muted">
              {inquiries.length} consulta{inquiries.length !== 1 ? "s" : ""} registrada{inquiries.length !== 1 ? "s" : ""}
            </p>
          </div>

          {inquiries.length === 0 ? (
            <div className="bg-gray-900/40 border border-border rounded-2xl p-6 text-center">
              <p className="text-slate-400">✅ No hay consultas pendientes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Lista de consultas */}
              <div className="lg:col-span-1 bg-gray-900/40 border border-border rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-border bg-slate-900/50">
                  <h3 className="text-sm font-semibold">Consultas ({inquiries.length})</h3>
                </div>
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {inquiries.map((inq) => (
                    <button
                      key={inq.id}
                      onClick={() => {
                        setSelectedInquiry(inq);
                        setResponseText("");
                      }}
                      className={`w-full text-left px-3 py-2 text-xs border-b border-border/50 transition ${
                        selectedInquiry?.id === inq.id
                          ? "bg-blue-600/30 border-l-2 border-l-blue-500"
                          : "hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="font-medium truncate">{inq.name}</div>
                      <div className="text-slate-400 truncate text-xs">{inq.subject}</div>
                      <div className="text-slate-500 text-[10px] mt-1">
                        {inq.status === "ANSWERED" ? "✅ Respondida" : "🔴 Pendiente"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detalle y respuesta */}
              {selectedInquiry ? (
                <div className="lg:col-span-2 bg-gray-900/40 border border-border rounded-2xl p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Consulta de {selectedInquiry.name}</h3>
                  </div>

                  {/* Detalles de la consulta */}
                  <div className="space-y-2 pb-3 border-b border-border">
                    <div>
                      <p className="text-xs text-slate-400">Email</p>
                      <p className="text-sm">{selectedInquiry.email}</p>
                    </div>
                    {selectedInquiry.phone && (
                      <div>
                        <p className="text-xs text-slate-400">Teléfono</p>
                        <p className="text-sm">{selectedInquiry.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-400">Asunto</p>
                      <p className="text-sm font-medium">{selectedInquiry.subject}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Mensaje</p>
                      <p className="text-sm bg-slate-900/50 p-2 rounded text-slate-300 whitespace-pre-wrap">
                        {selectedInquiry.message}
                      </p>
                    </div>
                  </div>

                  {/* Mostrar respuesta anterior si existe */}
                  {selectedInquiry.response && (
                    <div className="pb-3 border-b border-border">
                      <p className="text-xs text-slate-400 mb-1">Respuesta enviada</p>
                      <p className="text-sm bg-emerald-900/20 p-2 rounded text-emerald-200 whitespace-pre-wrap">
                        {selectedInquiry.response}
                      </p>
                      {selectedInquiry.respondedAt && (
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(selectedInquiry.respondedAt).toLocaleString("es-AR")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Formulario de respuesta */}
                  {selectedInquiry.status !== "ANSWERED" && (
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400">Tu respuesta</label>
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder="Escribe tu respuesta aquí..."
                        className="w-full px-3 py-2 bg-slate-900/50 border border-border rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={4}
                      />
                      <button
                        onClick={() => respondToInquiry(selectedInquiry.id, responseText)}
                        disabled={sendingResponse || !responseText.trim()}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm rounded-xl transition font-medium"
                      >
                        {sendingResponse ? "Enviando..." : "✓ Enviar respuesta"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="lg:col-span-2 bg-gray-900/40 border border-border rounded-2xl p-6 text-center text-slate-400">
                  Selecciona una consulta para responder
                </div>
              )}
            </div>
          )}
        </section>
      </section>
    );
  }

  /* ---- Vista ADMIN completa ---- */
  return (
    <section className="container-max py-8 space-y-8">
      {/* Header + filtros */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Panel del Administrador</h1>
          <p className="text-muted text-sm">
            Sesión: {user.email} · Rol{" "}
            <b>{roleLabel(user.role)}</b>
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-muted mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-border rounded-xl text-sm"
            >
              <option value="">Todos</option>
              {statusList.map((s) => {
                const translateStatus = useStatusTranslation();
                return (
                  <option key={s} value={s}>
                    {translateStatus(s as Status)}
                  </option>
                );
              })}
            </select>
          </div>
          <button
            onClick={() => {
              setStatusFilter("");
            }}
            className="px-3 py-2 h-[38px] border border-border rounded-xl text-sm hover:bg-gray-800"
          >
            Limpiar
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-5 shadow-lg hover:shadow-blue-500/20 transition-shadow">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Reservas totales</p>
          <p className="text-3xl font-bold text-blue-300">{totalReservas}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl p-5 shadow-lg hover:shadow-emerald-500/20 transition-shadow">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Reservas activas</p>
          <p className="text-3xl font-bold text-emerald-300">{activas}</p>
        </div>
        <div className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/30 rounded-2xl p-5 shadow-lg hover:shadow-rose-500/20 transition-shadow">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Canceladas</p>
          <p className="text-3xl font-bold text-rose-300">{canceladas}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl p-5 shadow-lg hover:shadow-amber-500/20 transition-shadow">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Ingresos totales</p>
          <p className="text-2xl font-bold text-amber-300">{fmtCurrency(ingresosTotales)}</p>
        </div>
      </div>

      {/* Gráfico + resumen rápido */}
      <div className={`grid ${isAdmin && roomPopularity.length > 0 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-3"} gap-4`}>
        <div>
          <BarsChart year={yearNow} values={ingresosMes} />
        </div>
        
        {/* Gráfico de popularidad solo para ADMIN */}
        {isAdmin && roomPopularity.length > 0 && (
          <div>
            <RoomsPopularityChart data={roomPopularity} />
          </div>
        )}

        <div className={`${isAdmin && roomPopularity.length > 0 ? "lg:col-span-2" : ""} bg-gray-900/40 border border-border rounded-2xl p-4 space-y-2`}>
          <h3 className="font-semibold mb-1">Resumen rápido</h3>
          <p className="text-sm text-muted">
            Ingresos año {yearNow}:{" "}
            <b>{fmtCurrency(ingresosMes.reduce((a, b) => a + b, 0))}</b>
          </p>
          <p className="text-sm text-muted">
            Reservas no canceladas:{" "}
            <b>{reservas.filter((r) => r.status !== "CANCELED").length}</b>
          </p>
          <p className="text-xs text-slate-500">
            * Los datos se calculan en base al estado actual de las reservas.
          </p>
        </div>
      </div>

      {/* Tabla de reservas mejorada */}
      <div className="bg-gradient-to-b from-slate-900/60 to-slate-900/40 border border-slate-700/50 rounded-2xl overflow-x-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/30 bg-slate-900/40 backdrop-blur">
          <h3 className="font-semibold text-white">Reservas registradas</h3>
          <div className="text-xs text-slate-400">
            <span className="bg-slate-800/50 px-3 py-1 rounded-full">
              {reservas.length} total
            </span>
            · Ingresos: <b className="text-amber-400">{fmtCurrency(totalPagina)}</b>
          </div>
        </div>

        <table className="min-w-full text-sm">
          <thead className="text-slate-300 border-b border-slate-700/30 bg-slate-900/30">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-semibold [&>th]:text-xs [&>th]:uppercase [&>th]:tracking-wider">
              <th>Código</th>
              <th>Habitación</th>
              <th>Cliente</th>
              <th>Fechas</th>
              <th>Total</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400 animate-pulse">
                  Cargando reservas…
                </td>
              </tr>
            )}

            {!loading &&
              reservas.map((r, idx) => (
                <tr
                  key={r.id}
                  className={`border-b border-slate-700/20 hover:bg-slate-800/30 transition-colors ${
                    idx % 2 === 0 ? "bg-slate-900/20" : "bg-slate-900/10"
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono bg-slate-800/60 px-2 py-1 rounded text-blue-300 font-semibold">
                      {r.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.room?.imageUrl && (
                        <img
                          src={r.room.imageUrl}
                          alt={r.room?.name}
                          className="w-8 h-8 rounded object-cover border border-slate-700"
                          loading="lazy"
                        />
                      )}
                      <div>
                        <p className="font-medium text-white text-sm">
                          {r.room?.name || r.roomId}
                        </p>
                        {r.room?.pricePerNight != null && (
                          <p className="text-[10px] text-slate-500">
                            {fmtCurrency(r.room.pricePerNight)}/noche
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <p className="font-medium text-white text-sm">
                        {r.guestName || r.user?.name || "Huésped"}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate max-w-xs">
                        {r.guestEmail || r.user?.email || "—"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 text-xs text-slate-300">
                      <span>{fmtDate(r.checkIn)}</span>
                      <span className="text-slate-500">→ {fmtDate(r.checkOut)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-amber-300 text-sm">
                      {fmtCurrency(r.total ?? 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge s={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1 flex-wrap">
                      {/* Marcar pagada */}
                      {r.status === "PENDING" && (
                        <Btn onClick={() => updateStatus(r.id, "PAID")}>
                          Pagar
                        </Btn>
                      )}

                      {/* Confirmar */}
                      {["PENDING", "PAID"].includes(r.status) && (
                        <Btn onClick={() => updateStatus(r.id, "CONFIRMED")}>
                          Confirmar
                        </Btn>
                      )}

                      {/* Check-in */}
                      {["CONFIRMED", "PAID"].includes(r.status) && (
                        <Btn onClick={() => updateStatus(r.id, "CHECKED_IN")}>
                          {t("reservations.checkIn")}
                        </Btn>
                      )}

                      {/* Check-out */}
                      {r.status === "CHECKED_IN" && (
                        <Btn onClick={() => updateStatus(r.id, "CHECKED_OUT")}>
                          {t("reservations.checkOut")}
                        </Btn>
                      )}

                      {/* Cancelar */}
                      {!["CHECKED_OUT", "CANCELED"].includes(r.status) && (
                        <BtnDanger
                          onClick={() => updateStatus(r.id, "CANCELED")}
                        >
                          Cancelar
                        </BtnDanger>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

            {!loading && reservas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-medium">
                  No hay reservas registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mapa de habitaciones también visible para admin */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Habitaciones</h2>
        <p className="text-xs text-muted mb-2">
          Estado y disponibilidad general. Podés abrir/cerrar habitaciones.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const bloqueantes: Status[] = [
              "PENDING",
              "PAID",
              "CONFIRMED",
              "CHECKED_IN",
            ];
            const tieneActiva = reservas.some(
              (r) =>
                r.roomId === room.id && bloqueantes.includes(r.status)
            );

            const estadoTexto = !room.isActive
              ? "CERRADA"
              : tieneActiva
              ? "OCUPADA / RESERVADA"
              : "LIBRE";

            const estadoColor = !room.isActive
              ? "bg-slate-500/15 border-slate-500/60"
              : tieneActiva
              ? "bg-rose-500/15 border-rose-500/60"
              : "bg-emerald-500/15 border-emerald-500/60";

            return (
              <div
                key={room.id}
                className={`p-4 rounded-2xl border ${estadoColor} space-y-2`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold truncate">{room.name}</h3>
                  <span className="text-[10px] text-muted">
                    {estadoTexto}
                  </span>
                </div>
                {room.imageUrl && (
                  <img
                    src={room.imageUrl}
                    alt={room.name}
                    className="w-full h-28 object-cover rounded-xl border border-border"
                    loading="lazy"
                  />
                )}
                <p className="text-xs text-muted">
                  Capacidad {room.capacity} ·{" "}
                  {fmtCurrency(room.pricePerNight)}/noche
                </p>
                <button
                  onClick={() => toggleRoomActive(room)}
                  className="mt-2 w-full text-xs px-3 py-1 rounded-lg border border-border hover:bg-gray-900"
                >
                  {room.isActive ? "Cerrar habitación" : "Abrir habitación"}
                </button>
              </div>
            );
          })}

          {!loading && rooms.length === 0 && (
            <p className="text-muted text-sm col-span-full">
              No hay habitaciones cargadas.
            </p>
          )}
        </div>
      </section>
    </section>
  );
}

/* =======================
   Componentes UI
======================= */
function Btn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 rounded-lg border border-blue-400/50 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400 text-xs font-medium transition-all duration-200"
    >
      {children}
    </button>
  );
}

function BtnDanger({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 rounded-lg border border-rose-400/50 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:border-rose-400 text-xs font-medium transition-all duration-200"
    >
      {children}
    </button>
  );
}

/* =======================
   Gráfico simple de barras
======================= */
function BarsChart({
  year,
  values,
}: {
  year: number;
  values: number[]; // 12 valores (enero-diciembre)
}) {
  const max = Math.max(1, ...values);
  const w = 560;
  const h = 200;
  const pad = 32;
  const slot = (w - pad * 2) / 12;
  const bw = slot - 8;
  const months = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

  return (
    <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/20 border border-slate-700/40 rounded-2xl p-6 h-full shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-lg text-white">Ingresos por mes</h3>
          <p className="text-xs text-slate-400">{year}</p>
        </div>
        <span className="text-xl font-bold text-amber-400">
          {fmtCurrency(values.reduce((a, b) => a + b, 0))}
        </span>
      </div>
      <svg
        width="100%"
        height={h + 30}
        viewBox={`0 0 ${w} ${h + 30}`}
        className="overflow-visible"
      >
        {/* Línea de base */}
        <line
          x1={pad}
          y1={h}
          x2={w - pad}
          y2={h}
          stroke="currentColor"
          strokeWidth={1.5}
          className="text-slate-600"
        />
        
        {/* Barras */}
        {values.map((val, i) => {
          const x = pad + i * slot + 4;
          const barH = Math.round((val / max) * (h - 30));
          const y = h - barH;
          const isHigh = val > max * 0.7;
          
          return (
            <g key={i}>
              <title>{`${months[i]}: ${fmtCurrency(val)}`}</title>
              <rect
                x={x}
                y={y}
                width={bw}
                height={barH}
                className={isHigh ? "fill-amber-400/90 hover:fill-amber-300" : "fill-blue-400/80 hover:fill-blue-300"}
                rx={3}
                style={{ transition: "all 0.2s ease" }}
              />
              <text
                x={x + bw / 2}
                y={h + 15}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] font-medium"
              >
                {months[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ============================================================
   RoomsPopularityChart
   Gráfico de habitaciones más solicitadas
============================================================ */
function RoomsPopularityChart({
  data,
}: {
  data: Array<{ roomId: string; roomName: string; bookingsCount: number }>;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/20 border border-slate-700/40 rounded-2xl p-6 h-full shadow-lg flex items-center justify-center">
        <p className="text-slate-400 text-sm">No hay datos disponibles</p>
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.bookingsCount));
  const barHeight = 30;
  const spacing = 10;
  const height = data.length * (barHeight + spacing) + 40;

  return (
    <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/20 border border-slate-700/40 rounded-2xl p-6 shadow-lg overflow-hidden">
      <h3 className="font-semibold text-lg text-white mb-6">
        Habitaciones más solicitadas
      </h3>
      <div className="overflow-x-auto">
        <svg width="100%" height={height} className="min-w-full" viewBox={`0 0 500 ${height}`} preserveAspectRatio="none">
          {data.map((room, i) => {
            const y = i * (barHeight + spacing) + 20;
            const barW = Math.round((room.bookingsCount / max) * 150);
            const color =
              i === 0
                ? "fill-emerald-400"
                : i === 1
                  ? "fill-blue-400"
                  : i === 2
                    ? "fill-amber-400"
                    : "fill-slate-400";

            return (
              <g key={room.roomId}>
                {/* Nombre de la habitación */}
                <text
                  x={10}
                  y={y + barHeight / 2 + 5}
                  className="fill-slate-300"
                  style={{ fontSize: "11px", fontWeight: 500 }}
                  textAnchor="start"
                >
                  {room.roomName.length > 20 ? room.roomName.substring(0, 17) + "..." : room.roomName}
                </text>

                {/* Barra */}
                <rect
                  x={150}
                  y={y}
                  width={barW}
                  height={barHeight}
                  className={color}
                  rx={2}
                  style={{ transition: "all 0.2s ease" }}
                />

                {/* Número de reservas */}
                <text
                  x={160 + barW}
                  y={y + barHeight / 2 + 5}
                  className="fill-white"
                  style={{ fontSize: "11px", fontWeight: 600 }}
                  textAnchor="start"
                >
                  {room.bookingsCount}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
