import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: "student" | "moderator";
  course: { id: number; name: string } | null;
};

type AuthStatus = "loading" | "anonymous" | "authenticated";
type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  apiFetch: typeof fetch;
  saveSession: (user: AuthUser, token: string) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
};

const SESSION_TOKEN_KEY = "profrate.authToken";

function rawApiFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, init);
}

const AuthContext = createContext<AuthContextValue>({
  status: "anonymous",
  user: null,
  apiFetch: rawApiFetch,
  saveSession: () => undefined,
  updateUser: () => undefined,
  logout: () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(SESSION_TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(token === null ? "anonymous" : "loading");

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setStatus("anonymous");
  }, []);

  const saveSession = useCallback((nextUser: AuthUser, nextToken: string) => {
    sessionStorage.setItem(SESSION_TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setStatus("authenticated");
  }, []);

  const updateUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
  }, []);

  const apiFetch = useCallback<typeof fetch>(async (input, init) => {
    const headers = new Headers(init?.headers);
    if (token !== null) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(input, { ...init, headers });

    if (response.status === 401 && token !== null) {
      try {
        const body = await response.clone().json() as { error?: { code?: string } };
        if (body.error?.code === "INVALID_AUTH_TOKEN") logout();
      } catch {
        // A malformed error response must not erase a valid local session.
      }
    }

    return response;
  }, [logout, token]);

  useEffect(() => {
    if (token === null || status !== "loading") return;

    const controller = new AbortController();

    async function restoreSession() {
      try {
        const response = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;
        if (!response.ok) {
          if (response.status === 401) logout();
          else setStatus("anonymous");
          return;
        }

        const restoredUser = (await response.json()) as AuthUser;
        if (!controller.signal.aborted) {
          setUser(restoredUser);
          setStatus("authenticated");
        }
      } catch {
        if (!controller.signal.aborted) setStatus("anonymous");
      }
    }

    void restoreSession();
    return () => controller.abort();
  }, [logout, status, token]);

  const value = useMemo(
    () => ({ status, user, apiFetch, saveSession, updateUser, logout }),
    [apiFetch, logout, saveSession, status, updateUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
