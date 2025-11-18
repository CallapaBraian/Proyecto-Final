// src/routes/Login.tsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "227337291053-15aafgrmrrhvnoii60okr5hb642s1d3e.apps.googleusercontent.com";

declare global {
  interface Window {
    google?: any;
  }
}

export default function Login() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@hotel.ar");
  const [password, setPassword] = useState("Admin1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function redirectByRole(role?: string) {
    if (role === "ADMIN" || role === "OPERATOR") {
      navigate("/panel");
    } else if (role === "GUEST") {
      navigate("/mis-reservas");
    } else {
      navigate("/");
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      redirectByRole(user.role);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err?.message || "Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleResponse = async (response: any) => {
    try {
      setError(null);
      setLoading(true);
      const user = await googleLogin(response.credential);
      redirectByRole(user.role);
    } catch (err: any) {
      console.error("Error Google Login:", err);
      setError(err?.message || "No se pudo iniciar sesión con Google");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const div = document.getElementById("googleSignInDiv");
    if (!div || div.hasChildNodes()) return;

    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });

      window.google.accounts.id.renderButton(div, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: "100%",
      });
    } else {
      console.warn(
        "Google Identity aún no está disponible. Revisá el script en index.html"
      );
    }
  }, []);

  return (
    <section className="container-max mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold mb-2 text-center">
        Iniciar sesión
      </h1>
      <p className="text-muted mb-6 text-center">
        Accedé con tu cuenta o con Google.
      </p>

      <form
        onSubmit={onSubmit}
        className="max-w-md mx-auto card p-6 space-y-5 border border-border rounded-2xl shadow-sm"
      >
        {error && (
          <div className="text-red-400 text-sm text-center">{error}</div>
        )}

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
          disabled={loading}
          className="btn w-full disabled:opacity-60 transition"
          type="submit"
        >
          {loading ? "Ingresando..." : "Entrar"}
        </button>

        <div className="mt-4">
          <div id="googleSignInDiv" className="w-full flex justify-center" />
        </div>

        <div className="text-xs text-muted text-center mt-4">
          ¿No tenés cuenta?{" "}
          <Link to="/register" className="underline">
            Registrate
          </Link>
        </div>
      </form>
    </section>
  );
}
