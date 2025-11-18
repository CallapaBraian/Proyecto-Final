// src/routes/Contacto.tsx
import { useState } from "react";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Contacto() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.subject || !form.message) {
      toast.error("Por favor completá todos los campos.");
      return;
    }

    setStatus("sending");
    setError(null);
    const t = toast.loading("Enviando consulta...");

    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          subject: form.subject,
          message: form.message,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "No se pudo enviar la consulta");
      }

      setStatus("sent");
      setForm({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });

      toast.success("✅ Consulta enviada correctamente", { id: t });

    } catch (err: any) {
      setStatus("error");
      const msg = err?.message || "Error al enviar la consulta";
      setError(msg);
      toast.error("❌ " + msg, { id: t });

    } finally {
      setTimeout(() => toast.dismiss(t), 2500);
    }
  };

  return (
    <section className="container-max py-12 fade-in">
      <h1 className="text-3xl font-semibold mb-6 text-center">
        Contacto
      </h1>

      <p className="text-center text-muted max-w-2xl mx-auto mb-10">
        Si tenés alguna consulta sobre Hotel.ar, disponibilidad o servicios,
        completá el formulario y te responderemos a la brevedad.
      </p>

      <div className="max-w-lg mx-auto bg-gray-900/40 border border-border rounded-2xl p-6 shadow-md">
        {status === "sent" ? (
          <div className="text-center py-10">
            <p className="text-emerald-400 text-lg font-medium mb-3">
              ✅ ¡Gracias por tu consulta!
            </p>
            <p className="text-muted">Nuestro equipo se contactará contigo pronto.</p>

            <button
              onClick={() => setStatus("idle")}
              className="mt-6 px-4 py-2 rounded-xl border border-border hover:bg-gray-800 transition text-sm"
            >
              Enviar otra consulta
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="label">Nombre completo *</label>
              <input
                name="name"
                type="text"
                placeholder="Tu nombre"
                className="input"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">Correo electrónico *</label>
              <input
                name="email"
                type="email"
                placeholder="tuemail@gmail.com"
                className="input"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">Teléfono</label>
              <input
                name="phone"
                type="tel"
                placeholder="+54 9 11 1234-5678"
                className="input"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="label">Asunto *</label>
              <input
                name="subject"
                type="text"
                placeholder="Ej: Consulta sobre reservas"
                className="input"
                value={form.subject}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="label">Mensaje *</label>
              <textarea
                name="message"
                rows={4}
                placeholder="Escribí tu consulta..."
                className="input resize-none"
                value={form.message}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className="btn w-full"
            >
              {status === "sending" ? "Enviando..." : "Enviar consulta"}
            </button>

            {status === "error" && (
              <p className="text-red-400 text-sm text-center mt-2">
                ❌ {error}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
