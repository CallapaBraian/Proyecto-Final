// src/components/PanelStats.tsx
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

type StatsData = {
  ocupacion: {
    ocupadas: number;
    total: number;
    porcentaje: number | string;
  };
  reservasHoy: number;
  ingresosTotales: number;
  reservasPorEstado: Array<{ status: string; _count: number }>;
  ingresosPorMes: Record<string, number>;
};

export function PanelStats({ token }: { token: string }) {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Error al cargar estadísticas");

      const data = await res.json();
      setStats(data.data);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!stats) {
    return <div className="text-center py-8 text-red-400">Error al cargar datos</div>;
  }

  const meses = Object.entries(stats.ingresosPorMes);
  const maxIngreso = Math.max(...meses.map(([, v]) => v), 1);

  return (
    <div className="space-y-8">
      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Ocupación */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-600/30 rounded-lg p-6">
          <div className="text-muted text-sm mb-2">🏨 Ocupación</div>
          <div className="text-3xl font-bold text-blue-300 mb-2">
            {stats.ocupacion.porcentaje}%
          </div>
          <div className="text-xs text-muted">
            {stats.ocupacion.ocupadas} de {stats.ocupacion.total} habitaciones
          </div>
        </div>

        {/* Reservas hoy */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-600/30 rounded-lg p-6">
          <div className="text-muted text-sm mb-2">📅 Reservas Hoy</div>
          <div className="text-3xl font-bold text-emerald-300">
            {stats.reservasHoy}
          </div>
          <div className="text-xs text-muted">Check-ins/outs programados</div>
        </div>

        {/* Ingresos totales */}
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-600/30 rounded-lg p-6">
          <div className="text-muted text-sm mb-2">💰 Ingresos Totales</div>
          <div className="text-2xl font-bold text-yellow-300">
            ${stats.ingresosTotales.toLocaleString("es-AR", {
              maximumFractionDigits: 0,
            })}
          </div>
          <div className="text-xs text-muted">Desde inicio</div>
        </div>

        {/* Promedio por reserva */}
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-600/30 rounded-lg p-6">
          <div className="text-muted text-sm mb-2">📊 Avg por Reserva</div>
          <div className="text-2xl font-bold text-purple-300">
            $
            {stats.reservasPorEstado.length > 0
              ? (
                  stats.ingresosTotales /
                  stats.reservasPorEstado.reduce((sum, s) => sum + s._count, 0)
                ).toLocaleString("es-AR", { maximumFractionDigits: 0 })
              : 0}
          </div>
          <div className="text-xs text-muted">Ticket promedio</div>
        </div>
      </div>

      <hr className="border-border" />

      {/* Gráfico: Ingresos por mes */}
      <div className="bg-gray-900/50 border border-border rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-6">💹 Ingresos por Mes</h3>

        {meses.length > 0 ? (
          <div className="space-y-4">
            {meses.map(([mes, ingreso]) => (
              <div key={mes} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">{mes}</span>
                  <span className="font-semibold">
                    ${ingreso.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all"
                    style={{
                      width: `${(ingreso / maxIngreso) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted">
            No hay datos de ingresos registrados
          </div>
        )}
      </div>

      <hr className="border-border" />

      {/* Tabla: Reservas por Estado */}
      <div className="bg-gray-900/50 border border-border rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-6">📋 Reservas por Estado</h3>

        {stats.reservasPorEstado.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-muted text-left">
                  <th className="py-3 px-2">Estado</th>
                  <th className="py-3 px-2 text-right">Cantidad</th>
                  <th className="py-3 px-2 text-right">Porcentaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.reservasPorEstado.map((item) => {
                  const total = stats.reservasPorEstado.reduce(
                    (sum, s) => sum + s._count,
                    0
                  );
                  const pct = ((item._count / total) * 100).toFixed(1);

                  const statusColors: Record<string, string> = {
                    PENDING: "bg-yellow-500/20 text-yellow-300",
                    PAID: "bg-emerald-500/20 text-emerald-300",
                    CONFIRMED: "bg-blue-500/20 text-blue-300",
                    CHECKED_IN: "bg-lime-500/20 text-lime-300",
                    CHECKED_OUT: "bg-slate-500/20 text-slate-300",
                    CANCELED: "bg-rose-500/20 text-rose-300",
                  };

                  return (
                    <tr key={item.status} className="hover:bg-gray-800/50">
                      <td className="py-3 px-2">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            statusColors[item.status] ||
                            "bg-gray-500/20 text-gray-300"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-bold">
                        {item._count}
                      </td>
                      <td className="py-3 px-2 text-right text-muted">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted">
            No hay reservas registradas
          </div>
        )}
      </div>
    </div>
  );
}
