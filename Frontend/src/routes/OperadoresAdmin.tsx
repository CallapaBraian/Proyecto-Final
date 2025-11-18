// src/routes/OperadoresAdmin.tsx
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

type Role = "ADMIN" | "OPERATOR" | "GUEST";

type Operator = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export default function OperadoresAdmin() {
  const { apiFetch, hasRole, user } = useAuth();

  const isAdmin = hasRole("ADMIN");

  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / formulario
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Operator | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function load() {
    if (!isAdmin) return;
    setLoading(true);

    try {
      const res = await apiFetch("/admin/operators");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error cargando operadores");
      }

      const list: Operator[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
        ? data.data
        : [];

      setOperators(list);
    } catch (err) {
      console.error(err);
      toast.error("No se pudieron cargar los operadores");
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
    setEmail("");
    setPassword("");
    setModalOpen(true);
  }

  function openEdit(op: Operator) {
    setEditing(op);
    setName(op.name);
    setEmail(op.email);
    setPassword("");
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Seguro que querés eliminar este operador?")) return;

    // (opcional): evitar que un admin se borre a sí mismo si algún día se listan admins
    if (user?.id === id) {
      toast.error("No podés eliminar tu propio usuario desde aquí.");
      return;
    }

    await toast.promise(
      (async () => {
        const res = await apiFetch(`/admin/operators/${id}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Error al eliminar operador");
        }
      })(),
      {
        loading: "Eliminando operador…",
        success: "Operador eliminado",
        error: (m) => m || "No se pudo eliminar",
      }
    );

    load();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Ingresá un nombre.");
      return;
    }
    if (!email.trim()) {
      toast.error("Ingresá un email.");
      return;
    }

    const payload: any = {
      name: name.trim(),
      email: email.trim(),
      role: "OPERATOR", // siempre operador
    };

    // Para crear: password obligatorio
    if (!editing) {
      if (!password.trim()) {
        toast.error("Ingresá una contraseña para el operador.");
        return;
      }
      payload.password = password.trim();
    } else {
      // Para editar: password opcional (solo si se quiere resetear)
      if (password.trim()) {
        payload.password = password.trim();
      }
    }

    const url = editing
      ? `/admin/operators/${editing.id}`
      : "/admin/operators";
    const method = editing ? "PATCH" : "POST";

    await toast.promise(
      (async () => {
        const res = await apiFetch(url, {
          method,
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Error al guardar operador");
        }
      })(),
      {
        loading: editing ? "Actualizando operador…" : "Creando operador…",
        success: editing
          ? "Operador actualizado"
          : "Operador creado correctamente",
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
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Administrar Operadores</h1>
          <p className="text-muted text-sm">
            Alta, baja y modificación de usuarios con rol Operador.
          </p>
        </div>
        <button className="btn" onClick={openCreate}>
          + Nuevo operador
        </button>
      </header>

      <div className="bg-gray-900/40 border border-border rounded-2xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-muted border-b border-border">
            <tr className="[&>th]:px-4 [&>th]:py-2 text-left">
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  Cargando…
                </td>
              </tr>
            )}

            {!loading &&
              operators.map((op) => (
                <tr key={op.id} className="border-b border-border/60">
                  <td className="px-4 py-2 font-medium">{op.name}</td>
                  <td className="px-4 py-2">{op.email}</td>
                  <td className="px-4 py-2 text-xs">
                    <span className="px-2 py-0.5 rounded-lg border border-blue-400/40 text-blue-300">
                      {op.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(op)}
                        className="px-3 py-1 rounded-lg border border-blue-400/40 text-blue-300 hover:bg-blue-400/10 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(op.id)}
                        className="px-3 py-1 rounded-lg border border-rose-400/40 text-rose-300 hover:bg-rose-400/10 text-xs"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

            {!loading && operators.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted">
                  No hay operadores cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal CRUD */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-semibold">
              {editing ? "Editar operador" : "Nuevo operador"}
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

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">
                  {editing
                    ? "Nueva contraseña (opcional)"
                    : "Contraseña inicial"}
                </label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editing ? "Dejar vacío para no cambiar" : ""}
                />
              </div>

              <p className="text-[11px] text-muted">
                El rol asignado será siempre <b>OPERATOR</b>. El operador podrá
                gestionar reservas y habitaciones, pero no administrar
                operadores ni configuración avanzada.
              </p>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-outline"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn">
                  {editing ? "Guardar cambios" : "Crear operador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
