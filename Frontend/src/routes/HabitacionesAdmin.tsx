// src/routes/HabitacionesAdmin.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

type Room = {
  id: string;
  name: string;
  capacity: number;
  pricePerNight: number;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
};

export default function HabitacionesAdmin() {
  const { apiFetch, hasRole } = useAuth();

  const isAdmin = hasRole("ADMIN");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(1);
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  async function load() {
    try {
      setLoading(true);
      const res = await apiFetch("/rooms");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error cargando habitaciones");

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : [];

      setRooms(
        list.map((r: any) => ({
          ...r,
          pricePerNight: Number(r.pricePerNight ?? 0),
          isActive: Boolean(r.isActive),
        }))
      );
    } catch (e: any) {
      toast.error("No se pudieron cargar las habitaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setCapacity(1);
    setPrice(0);
    setDescription("");
    setImageUrl("");
    setModalOpen(true);
  }

  function openEdit(r: Room) {
    setEditing(r);
    setName(r.name);
    setCapacity(r.capacity);
    setPrice(r.pricePerNight);
    setDescription(r.description || "");
    setImageUrl(r.imageUrl || "");
    setModalOpen(true);
  }

  async function handleDelete(roomId: string) {
    if (!confirm("¿Seguro que querés eliminar esta habitación?")) return;

    await toast.promise(
      (async () => {
        const res = await apiFetch(`/rooms/${roomId}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Error al eliminar");
      })(),
      {
        loading: "Eliminando…",
        success: "Habitación eliminada",
        error: "No se pudo eliminar",
      }
    );

    load();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) return toast.error("Ingresá un nombre.");

    const payload = {
      name: name.trim(),
      capacity,
      pricePerNight: price,
      description: description.trim() || null,
      imageUrl: imageUrl.trim() || null,
    };

    const url = editing ? `/rooms/${editing.id}` : "/rooms";
    const method = editing ? "PATCH" : "POST";

    await toast.promise(
      (async () => {
        const res = await apiFetch(url, {
          method,
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Error en el guardado");
      })(),
      {
        loading: editing ? "Actualizando…" : "Creando…",
        success: editing
          ? "Habitación actualizada"
          : "Habitación creada correctamente",
        error: (m) => m || "No se pudo guardar",
      }
    );

    setModalOpen(false);
    load();
  }

  if (!isAdmin) {
    return (
      <section className="container-max py-10 text-center">
        <h1 className="text-2xl font-semibold mb-2">Acceso restringido</h1>
        <p className="text-muted">
          Esta sección es solo para usuarios con rol <b>ADMIN</b>.
        </p>
      </section>
    );
  }

  return (
    <section className="container-max py-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Administrar Habitaciones</h1>
          <p className="text-muted text-sm">
            Crear, editar y eliminar habitaciones del hotel.
          </p>
        </div>
        <button onClick={openCreate} className="btn">
          + Nueva habitación
        </button>
      </header>

      {/* Tabla */}
      <div className="bg-gray-900/40 border border-border rounded-2xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-muted border-b border-border">
            <tr className="[&>th]:px-4 [&>th]:py-2 text-left">
              <th>Nombre</th>
              <th>Capacidad</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Imagen</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Cargando…
                </td>
              </tr>
            )}

            {!loading &&
              rooms.map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2">{r.capacity}</td>
                  <td className="px-4 py-2">
                    ${Number(r.pricePerNight).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    {r.isActive ? (
                      <span className="text-emerald-300">Activa</span>
                    ) : (
                      <span className="text-rose-300">Cerrada</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {r.imageUrl ? (
                      <img
                        src={r.imageUrl}
                        className="w-14 h-10 rounded border border-border object-cover"
                      />
                    ) : (
                      <span className="text-muted text-xs">Sin imagen</span>
                    )}
                  </td>

                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(r)}
                        className="px-3 py-1 rounded-lg border border-blue-400/40 text-blue-300 hover:bg-blue-400/10 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="px-3 py-1 rounded-lg border border-rose-400/40 text-rose-300 hover:bg-rose-400/10 text-xs"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!loading && rooms.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  No hay habitaciones creadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-border rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-xl font-semibold">
              {editing ? "Editar habitación" : "Nueva habitación"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Capacidad</label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <label className="label">Precio por noche</label>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Descripción</label>
                <textarea
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="label">URL de imagen</label>
                <input
                  className="input"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-outline"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn">
                  {editing ? "Guardar cambios" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
