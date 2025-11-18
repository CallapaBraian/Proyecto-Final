// src/components/PanelReservations.tsx
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

type Status =
  | "PENDING"
  | "PAID"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELED";

type Reservation = {
  id: string;
  code: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  total: string | number;
  status: Status;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  room?: {
    id: string;
    name: string;
    pricePerNight: number;
    imageUrl?: string | null;
  };
};

export function PanelReservations({ token }: { token: string }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<Status | "ALL">("ALL");

  useEffect(() => {
    fetchReservations();
  }, [filter]);

  const fetchReservations = async () => {
    try {
      const query =
        filter !== "ALL" ? `?status=${filter}` : "";
      const res = await fetch(`${API_URL}/bookings${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Error al cargar reservas");

      const data = await res.json();
      setReservations(data.data || []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStatusChange = async (
    resId: string,
    newStatus: Status
  ) => {
    try {
      const res = await fetch(`${API_URL}/bookings/${resId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Error al actualizar estado");

      toast.success("✅ Estado actualizado");
      fetchReservations();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePayment = async (resId: string) => {
    try {
      const res = await fetch(`${API_URL}/bookings/${resId}/pay`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Error al procesar pago");

      toast.success("✅ Pago procesado");
      fetchReservations();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!reservations || reservations.length === 0) {
    return <div className="text-center py-8 text-muted">No hay reservas</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(["ALL", "PENDING", "PAID", "CONFIRMED", "CHECKED_IN"] as const).map(
          (s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                filter === s
                  ? "bg-accent text-black font-semibold"
                  : "border border-border hover:bg-gray-800"
              }`}
            >
              {s === "ALL" ? "Todas" : s}
            </button>
          )
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="text-muted">
              <th className="text-left py-3 px-2">Código</th>
              <th className="text-left py-3 px-2">Habitación</th>
              <th className="text-left py-3 px-2">Huésped</th>
              <th className="text-left py-3 px-2">Check-in</th>
              <th className="text-left py-3 px-2">Check-out</th>
              <th className="text-right py-3 px-2">Total</th>
              <th className="text-center py-3 px-2">Estado</th>
              <th className="text-center py-3 px-2">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reservations.map((res) => (
              <tr key={res.id} className="hover:bg-gray-800/50 transition">
                <td className="py-3 px-2 font-mono text-accent">
                  {res.code}
                </td>
                <td className="py-3 px-2">{res.room?.name || "N/A"}</td>
                <td className="py-3 px-2">
                  <div className="text-sm">
                    <div className="font-medium">{res.guestName}</div>
                    <div className="text-muted text-xs">{res.guestEmail}</div>
                  </div>
                </td>
                <td className="py-3 px-2 text-sm">
                  {new Date(res.checkIn).toLocaleDateString("es-AR")}
                </td>
                <td className="py-3 px-2 text-sm">
                  {new Date(res.checkOut).toLocaleDateString("es-AR")}
                </td>
                <td className="py-3 px-2 text-right font-medium">
                  ${Number(res.total).toFixed(2)}
                </td>
                <td className="py-3 px-2 text-center">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      res.status === "PENDING"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : res.status === "PAID"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : res.status === "CONFIRMED"
                            ? "bg-blue-500/20 text-blue-300"
                            : res.status === "CHECKED_IN"
                              ? "bg-lime-500/20 text-lime-300"
                              : "bg-slate-500/20 text-slate-300"
                    }`}
                  >
                    {res.status}
                  </span>
                </td>
                <td className="py-3 px-2 text-center">
                  <div className="flex gap-2 justify-center flex-wrap">
                    {res.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handlePayment(res.id)}
                          className="px-2 py-1 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded transition"
                          title="Marcar como pagado"
                        >
                          💳 Pagar
                        </button>
                        <button
                          onClick={() =>
                            handleStatusChange(res.id, "CONFIRMED")
                          }
                          className="px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded transition"
                          title="Confirmar"
                        >
                          ✓ Confirmar
                        </button>
                      </>
                    )}
                    {res.status === "CONFIRMED" && (
                      <button
                        onClick={() =>
                          handleStatusChange(res.id, "CHECKED_IN")
                        }
                        className="px-2 py-1 text-xs bg-lime-500/20 hover:bg-lime-500/30 text-lime-300 rounded transition"
                        title="Check-in"
                      >
                        ➜ Check-in
                      </button>
                    )}
                    {res.status === "CHECKED_IN" && (
                      <button
                        onClick={() =>
                          handleStatusChange(res.id, "CHECKED_OUT")
                        }
                        className="px-2 py-1 text-xs bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 rounded transition"
                        title="Check-out"
                      >
                        ← Check-out
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {reservations.length === 0 && (
          <div className="text-center py-10 text-muted">
            No hay reservas en este estado.
          </div>
        )}
      </div>
    </div>
  );
}
