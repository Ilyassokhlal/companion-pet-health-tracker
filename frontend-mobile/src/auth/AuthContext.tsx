import { createContext, useContext, useState, useEffect, useRef } from "react";
import i18n, { detectLanguage } from "../i18n";
import type { ReactNode } from "react";
import type { User } from "../types";
import { me, meCached, login as apiLogin, register as apiRegister, logout as apiLogout } from "../api/auth";
import { getToken } from "../api/client";
import { registerForPush, unregisterForPush } from "../notifications";
import { clearCache } from "@/cache";


// Defines the shape of the authentication state and actions provided by the AuthContext.
interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Creates a React context for authentication state and actions. The context is initialized with undefined, and will be provided by the AuthProvider component.
const AuthContext = createContext<AuthState | undefined>(undefined);

// Provides authentication state and actions to its children components. It fetches the current user's information on mount if a token is present in secure device storage, and manages the loading state.
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
        const pushToken = useRef<string | null>(null);

    // Push is best-effort. It shouldn't block authentication or surface as an error.
    async function syncPush() {
        try {
            pushToken.current = await registerForPush();
        } catch (e) {
            console.warn("[push] registration failed:", (e as Error).message);
        }
    }

    useEffect(() => {
        (async () => {
            const token = await getToken();
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const { data } = await meCached();
                setUser(data);
                await syncPush();
            } catch {
                // apiFetch already clears the token on a 401. Reaching here with the token still present means the network failed, not the session — keeping it, so cached records stay reachable offline.
                if (!(await getToken())) {
                    setUser(null);
                }
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Follow the signed-in user's language. One effect covers login, register, refresh and logout, rather than patching all five setUser call sites.
    useEffect(() => {
        const lang = user?.language ?? detectLanguage();
        if (i18n.language !== lang) i18n.changeLanguage(lang);
    }, [user]);

    async function login(email: string, password: string) {
        await apiLogin(email, password);
        setUser(await me());
        await syncPush();
    }

    async function register(username: string, email: string, password: string) {
        await apiRegister(username, email, password);
        setUser(await me());
        await syncPush();
    }

    async function logout() {
        if (pushToken.current) {
            try {
                await unregisterForPush(pushToken.current);
            } catch {
                // So a failed unregister must not trap the user in the app.
            }
            pushToken.current = null;
        }
        await apiLogout();
        await clearCache();
        setUser(null);
    }

    async function refreshUser() {
        setUser(await me());
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook to use the AuthContext. Throws an error if used outside of an AuthProvider.
export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}