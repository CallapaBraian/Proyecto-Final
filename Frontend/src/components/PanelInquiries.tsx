// src/components/PanelInquiries.tsx
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

type InquiryStatus = "NEW" | "IN_PROGRESS" | "ANSWERED" | "CLOSED";

type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export function PanelInquiries({ token }: { token: string }) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [filter, setFilter] = useState<InquiryStatus | "ALL">("NEW");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    new: 0,
    inProgress: 0,
    answered: 0,
    closed: 0,
  });

  useEffect(() => {
    fetchInquiries();
    fetchStats();
  }, [filter]);

  const fetchInquiries = async () => {
    try {
      const query = filter !== "ALL" ? `?status=${filter}` : "";
      const res = await fetch(`${API_URL}/contact${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Error al cargar consultas");

      const data = await res.json();
      setInquiries(data.data || []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/contact/stats/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setStats({
          new: data.data?.new || 0,
          inProgress: data.data?.inProgress || 0,
          answered: data.data?.answered || 0,
          closed: data.data?.closed || 0,
        });
      }
    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
    }
  };

  const handleStatusChange = async (
    inquiryId: string,
    newStatus: InquiryStatus
  ) => {
    try {
      const res = await fetch(`${API_URL}/contact/${inquiryId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Error al actualizar estado");

      toast.success("✅ Estado actualizado");
      fetchInquiries();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const selected = inquiries.find((i) => i.id === selectedId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Sidebar: Stats + Filtro */}
      <div className="space-y-6">
        {/* Estadísticas con gradientes */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg text-white">📊 Estadísticas</h3>
          <div className="space-y-2 text-sm">
            <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border border-yellow-500/40 rounded-lg p-3 hover:border-yellow-500/60 transition-all">
              <div className="flex justify-between items-center">
                <span className="text-yellow-200 font-medium">Nuevas</span>
                <span className="font-bold text-yellow-300 text-lg">{stats.new}</span>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/10 border border-blue-500/40 rounded-lg p-3 hover:border-blue-500/60 transition-all">
              <div className="flex justify-between items-center">
                <span className="text-blue-200 font-medium">En Progreso</span>
                <span className="font-bold text-blue-300 text-lg">{stats.inProgress}</span>
              </div>
            </div>
            <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/40 rounded-lg p-3 hover:border-emerald-500/60 transition-all">
              <div className="flex justify-between items-center">
                <span className="text-emerald-200 font-medium">Respondidas</span>
                <span className="font-bold text-emerald-300 text-lg">{stats.answered}</span>
              </div>
            </div>
            <div className="bg-gradient-to-r from-slate-500/20 to-slate-600/10 border border-slate-500/40 rounded-lg p-3 hover:border-slate-500/60 transition-all">
              <div className="flex justify-between items-center">
                <span className="text-slate-200 font-medium">Cerradas</span>
                <span className="font-bold text-slate-300 text-lg">{stats.closed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg text-white">🔍 Filtros</h3>
          <div className="space-y-2">
            {(["ALL", "NEW", "IN_PROGRESS", "ANSWERED", "CLOSED"] as const).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition text-left ${
                    filter === s
                      ? "bg-blue-600/80 text-white border border-blue-500/50 shadow-lg shadow-blue-500/20"
                      : "border border-slate-700/60 text-slate-300 hover:bg-slate-800/50 hover:border-slate-600"
                  }`}
                >
                  {s === "ALL"
                    ? "📋 Todas"
                    : s === "NEW"
                      ? "🆕 Nuevas"
                      : s === "IN_PROGRESS"
                        ? "⏳ En Progreso"
                        : s === "ANSWERED"
                          ? "✅ Respondidas"
                          : "🔒 Cerradas"}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Lista: Consultas */}
      <div className="md:col-span-2 space-y-4">
        <h3 className="font-semibold text-lg text-white">📧 Consultas recibidas</h3>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
          {inquiries.map((inquiry, idx) => (
            <button
              key={inquiry.id}
              onClick={() => setSelectedId(inquiry.id)}
              className={`w-full text-left p-4 rounded-lg border transition ${
                selectedId === inquiry.id
                  ? "bg-blue-500/15 border-blue-500/50 shadow-lg shadow-blue-500/10"
                  : "border-slate-700/40 hover:bg-slate-800/40 hover:border-slate-600/60"
              } ${idx % 2 === 0 ? "bg-slate-900/30" : "bg-slate-900/10"}`}
            >
              <div className="flex justify-between items-start mb-2 gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-white truncate">
                    {inquiry.subject}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {inquiry.name} · {inquiry.email}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ml-2 whitespace-nowrap flex-shrink-0 ${
                    inquiry.status === "NEW"
                      ? "bg-yellow-500/30 text-yellow-200 border border-yellow-500/40"
                      : inquiry.status === "IN_PROGRESS"
                        ? "bg-blue-500/30 text-blue-200 border border-blue-500/40"
                        : inquiry.status === "ANSWERED"
                          ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40"
                          : "bg-slate-500/30 text-slate-200 border border-slate-500/40"
                  }`}
                >
                  {inquiry.status === "NEW"
                    ? "Nueva"
                    : inquiry.status === "IN_PROGRESS"
                      ? "Progreso"
                      : inquiry.status === "ANSWERED"
                        ? "Respondida"
                        : "Cerrada"}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(inquiry.createdAt).toLocaleString("es-AR")}
              </div>
            </button>
          ))}

          {inquiries.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              📭 No hay consultas en este estado
            </div>
          )}
        </div>

        {/* Detalle seleccionada */}
        {selected && (
          <div className="border border-slate-700/50 rounded-xl p-6 bg-gradient-to-br from-slate-900/60 to-slate-900/40 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-semibold text-lg text-white">
                {selected.subject}
              </h4>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  selected.status === "NEW"
                    ? "bg-yellow-500/30 text-yellow-200 border border-yellow-500/40"
                    : selected.status === "IN_PROGRESS"
                      ? "bg-blue-500/30 text-blue-200 border border-blue-500/40"
                      : selected.status === "ANSWERED"
                        ? "bg-emerald-500/30 text-emerald-200 border border-emerald-500/40"
                        : "bg-slate-500/30 text-slate-200 border border-slate-500/40"
                }`}
              >
                {selected.status === "NEW"
                  ? "Nueva"
                  : selected.status === "IN_PROGRESS"
                    ? "En Progreso"
                    : selected.status === "ANSWERED"
                      ? "Respondida"
                      : "Cerrada"}
              </span>
            </div>

            <div className="space-y-3 text-sm mb-6 pb-6 border-b border-slate-700/30">
              <div className="flex justify-between">
                <span className="text-slate-400">De:</span>
                <span className="text-white font-medium">{selected.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <a
                  href={`mailto:${selected.email}`}
                  className="text-blue-400 hover:underline"
                >
                  {selected.email}
                </a>
              </div>
              {selected.phone && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Teléfono:</span>
                  <a
                    href={`tel:${selected.phone}`}
                    className="text-blue-400 hover:underline"
                  >
                    {selected.phone}
                  </a>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Recibida:</span>
                <span className="text-slate-300">
                  {new Date(selected.createdAt).toLocaleString("es-AR")}
                </span>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {selected.message}
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 flex-wrap">
              {selected.status !== "IN_PROGRESS" && selected.status !== "ANSWERED" && (
                <button
                  onClick={() =>
                    handleStatusChange(selected.id, "IN_PROGRESS")
                  }
                  className="px-4 py-2 text-sm bg-blue-600/70 hover:bg-blue-600/90 text-white rounded-lg font-medium transition-all border border-blue-500/50"
                >
                  ⏳ En Progreso
                </button>
              )}
              {selected.status !== "ANSWERED" && (
                <button
                  onClick={() => handleStatusChange(selected.id, "ANSWERED")}
                  className="px-4 py-2 text-sm bg-emerald-600/70 hover:bg-emerald-600/90 text-white rounded-lg font-medium transition-all border border-emerald-500/50"
                >
                  ✅ Respondida
                </button>
              )}
              {selected.status !== "CLOSED" && (
                <button
                  onClick={() => handleStatusChange(selected.id, "CLOSED")}
                  className="px-4 py-2 text-sm bg-slate-600/70 hover:bg-slate-600/90 text-white rounded-lg font-medium transition-all border border-slate-500/50"
                >
                  🔒 Cerrar
                </button>
              )}
            </div>

            {selected.user && (
              <div className="mt-6 p-3 bg-slate-800/40 border border-slate-700/40 rounded-lg text-xs text-slate-400">
                📌 Gestionada por: <b>{selected.user.name}</b> ({selected.user.email})
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
