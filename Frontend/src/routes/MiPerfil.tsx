// src/routes/MiPerfil.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useStatusTranslation } from "../utils/translateStatus";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

type User = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  createdAt?: string;
};

type Status = "PENDING" | "PAID" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELED" | "CANCELLED";

type Reservation = {
  id: string;
  code?: string;
  roomId: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  status: Status;
  createdAt?: string;
};

function money(n?: number | null) {
  const v = Number(n ?? 0);
  return v.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  });
}

function Badge({ s }: { s: Status }) {
  const translateStatus = useStatusTranslation();
  
  const colorMap: Record<Status, string> = {
    PENDING: "bg-yellow-500/10 text-yellow-300 border-yellow-600/50",
    PAID: "bg-emerald-500/10 text-emerald-300 border-emerald-600/50",
    CONFIRMED: "bg-blue-500/10 text-blue-300 border-blue-600/50",
    CHECKED_IN: "bg-lime-500/10 text-lime-300 border-lime-600/50",
    CHECKED_OUT: "bg-slate-500/10 text-slate-300 border-slate-600/50",
    CANCELED: "bg-rose-500/10 text-rose-300 border-rose-600/50",
    CANCELLED: "bg-rose-500/10 text-rose-300 border-rose-600/50",
  };

  return (
    <span className={`px-2 py-0.5 rounded-lg text-[10px] border font-semibold ${colorMap[s]}`}>
      {translateStatus(s)}
    </span>
  );
}

export default function MiPerfil() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [reservas, setReservas] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (!user || !token) {
      navigate("/login");
      return;
    }

    loadData();
  }, [user, token, navigate]);

  async function loadData() {
    try {
      setLoading(true);

      // Cargar datos del usuario
      const userRes = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) {
        throw new Error("No se pudieron cargar los datos del usuario");
      }

      const userData = await userRes.json();
      setUserInfo(userData);
      setFormData({
        name: userData.name || "",
        phone: userData.phone || "",
        address: userData.address || "",
      });

      // Cargar reservas del usuario - usar /reservations/me en lugar de /bookings/me
      try {
        const reservasRes = await fetch(`${API_URL}/reservations/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (reservasRes.ok) {
          const data = await reservasRes.json();
          const list: Reservation[] = Array.isArray(data) ? data : data.data || [];
          setReservas(list.sort((a, b) => {
            const dateA = new Date(a.checkIn || 0).getTime();
            const dateB = new Date(b.checkIn || 0).getTime();
            return dateB - dateA;
          }));
        }
      } catch (err) {
        console.error("Error cargando reservas:", err);
        setReservas([]);
      }

    } catch (err: any) {
      toast.error(err?.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al actualizar perfil");
      }

      toast.success("Perfil actualizado");
      setEditing(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar");
    }
  }

  if (!user) {
    return (
      <section className="container-max py-10 text-center">
        <p className="text-muted">Debe iniciar sesión para ver su perfil.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="container-max py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-800 rounded w-1/3" />
          <div className="h-20 bg-slate-800 rounded" />
        </div>
      </section>
    );
  }

  return (
    <section className="container-max py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-bold mb-2">Mi Perfil</h1>
        <p className="text-muted">Gestiona tus datos y visualiza tu historial de reservas</p>
      </header>

      {/* Datos del Usuario */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Panel de Datos */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>👤 Información Personal</span>
          </h2>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1">Email (No editable)</label>
                <input
                  type="email"
                  value={userInfo?.email || ""}
                  disabled
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs text-muted mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Tu nombre"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs text-muted mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Tu teléfono"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs text-muted mb-1">Dirección</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Tu dirección"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
                >
                  Guardar Cambios
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      name: userInfo?.name || "",
                      phone: userInfo?.phone || "",
                      address: userInfo?.address || "",
                    });
                  }}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <span className="text-xs text-muted">Email</span>
                <p className="font-medium">{userInfo?.email}</p>
              </div>

              <div>
                <span className="text-xs text-muted">Nombre</span>
                <p className="font-medium">{userInfo?.name || "—"}</p>
              </div>

              <div>
                <span className="text-xs text-muted">Teléfono</span>
                <p className="font-medium">{userInfo?.phone || "—"}</p>
              </div>

              <div>
                <span className="text-xs text-muted">Dirección</span>
                <p className="font-medium">{userInfo?.address || "—"}</p>
              </div>

              <div>
                <span className="text-xs text-muted">Miembro desde</span>
                <p className="font-medium">
                  {userInfo?.createdAt
                    ? new Date(userInfo.createdAt).toLocaleDateString("es-AR")
                    : "—"}
                </p>
              </div>

              <button
                onClick={() => setEditing(true)}
                className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
              >
                Editar Datos
              </button>
            </div>
          )}
        </div>

        {/* Resumen de Reservas */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">📊 Resumen</h2>

          <div className="space-y-3">
            <div>
              <span className="text-xs text-muted">Total de reservas</span>
              <p className="text-2xl font-bold text-emerald-300">{reservas.length}</p>
            </div>

            <div>
              <span className="text-xs text-muted">Activas</span>
              <p className="text-2xl font-bold text-blue-300">
                {reservas.filter((r) =>
                  ["PENDING", "CONFIRMED", "PAID", "CHECKED_IN"].includes(r.status)
                ).length}
              </p>
            </div>

            <div>
              <span className="text-xs text-muted">Completadas</span>
              <p className="text-2xl font-bold text-slate-300">
                {reservas.filter((r) => r.status === "CHECKED_OUT").length}
              </p>
            </div>

            <div>
              <span className="text-xs text-muted">Canceladas</span>
              <p className="text-2xl font-bold text-rose-300">
                {reservas.filter((r) => r.status === "CANCELED" || r.status === "CANCELLED").length}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-700">
              <span className="text-xs text-muted">Total gastado</span>
              <p className="text-2xl font-bold text-yellow-300">
                {money(reservas.reduce((a, r) => a + (r.total || 0), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Reservas */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">📅 Mis Reservas</h2>

        {reservas.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-muted">No tienes reservas aún.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Código</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Habitación</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Check-in</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-300">Check-out</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-300">Huéspedes</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-300">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-300">Estado</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((r) => (
                  <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-blue-400">{r.code || r.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">{r.roomName}</td>
                    <td className="px-4 py-3">
                      {new Date(r.checkIn).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(r.checkOut).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3 text-center">{r.guests}</td>
                    <td className="px-4 py-3 text-right font-semibold">{money(r.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge s={r.status as Status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
