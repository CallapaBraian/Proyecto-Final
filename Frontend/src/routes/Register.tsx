// src/routes/Register.tsx
import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(false);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      setLoading(false);

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Error al registrar");
      }

      setOk(true);
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error(err);
      setError("No se pudo registrar. Verificá tus datos o probá más tarde.");
    }
  };

  return (
    <section className="container-max mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold mb-2 text-center">
        Crear cuenta
      </h1>
      <p className="text-muted mb-6 text-center">
        Registrate para poder realizar reservas.
      </p>

      <form
        onSubmit={onSubmit}
        className="max-w-md mx-auto card p-6 space-y-5 border border-border rounded-2xl shadow-sm"
      >
        {ok && (
          <div className="text-green-400 text-sm text-center">
            ¡Usuario creado correctamente! Ya podés iniciar sesión.
          </div>
        )}
        {error && (
          <div className="text-red-400 text-sm text-center">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input
            className="input w-full"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre completo"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            className="input w-full"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <input
            className="input w-full"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button
          className="btn w-full disabled:opacity-60 transition"
          disabled={loading}
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </section>
  );
}
