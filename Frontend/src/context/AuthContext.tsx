// src/context/AuthContext.tsx
import {
  createContext,
  useState,
  useEffect,
  useContext,
  type ReactNode,
} from "react";

export type Role = "GUEST" | "OPERATOR" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  token: string | null;
}

interface AuthContextProps extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  googleLogin: (idToken: string) => Promise<User>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
  apiFetch: (input: string, init?: RequestInit) => Promise<Response>;
  setAuth: (token: string | null, user: User | null) => void;
}

const AuthContext = createContext<AuthContextProps | null>(null);

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (token && userStr) {
      try {
        const user: User = JSON.parse(userStr);
        return { token, user };
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    return { token: null, user: null };
  });

  // Guardar en localStorage
  function persist(next: AuthState) {
    setState(next);
    if (next.token && next.user) {
      localStorage.setItem("token", next.token);
      localStorage.setItem("user", JSON.stringify(next.user));
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  //
  // Validar /auth/me si hay token pero user aún no está cargado
  //
  useEffect(() => {
    if (!state.token || state.user) return;

    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${state.token}` },
        });

        if (!res.ok) throw new Error("Token inválido");

        const me = (await res.json()) as User;
        persist({ token: state.token, user: me });
      } catch {
        persist({ token: null, user: null });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.token]);

  //
  // ---------- ACCIONES ----------
  //

  async function login(email: string, password: string): Promise<User> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || "Error al iniciar sesión");
    if (!data.token || !data.user)
      throw new Error("Respuesta inválida del servidor");

    persist({ token: data.token, user: data.user });
    return data.user;
  }

  async function register(
    name: string,
    email: string,
    password: string
  ): Promise<User> {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || "Error al registrarse");
    if (!data.token || !data.user)
      throw new Error("Respuesta inválida del servidor");

    persist({ token: data.token, user: data.user });
    return data.user;
  }

  // 🔵 Login con Google
  async function googleLogin(idToken: string): Promise<User> {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || "Error al iniciar sesión con Google");
    if (!data.token || !data.user)
      throw new Error("Respuesta inválida del servidor");

    persist({ token: data.token, user: data.user });
    return data.user;
  }

  function logout() {
    persist({ token: null, user: null });
  }

  function hasRole(...roles: Role[]): boolean {
    if (!state.user) return false;
    return roles.includes(state.user.role);
  }

  //
  // apiFetch → agrega token, maneja expiración, JSON por defecto
  //
  async function apiFetch(
    input: string,
    init: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers(init.headers || {});

    if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    if (state.token) {
      headers.set("Authorization", `Bearer ${state.token}`);
    }

    const url = input.startsWith("http") ? input : `${API_URL}${input}`;
    const res = await fetch(url, { ...init, headers });

    // Token expirado
    if (res.status === 401) {
      persist({ token: null, user: null });
    }

    return res;
  }

  function setAuth(token: string | null, user: User | null) {
    persist({ token, user });
  }

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        login,
        register,
        googleLogin,
        logout,
        hasRole,
        apiFetch,
        setAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
};
