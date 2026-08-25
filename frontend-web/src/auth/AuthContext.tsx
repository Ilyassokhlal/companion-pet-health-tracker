import { createContext, useContext, useState, useEffect } from "react";
import i18n from "../i18n";
import { detectLanguage } from "../api/auth";
import type { ReactNode } from "react";
import type { User } from "../types";
import { me, login as apiLogin, register as apiRegister, logout as apiLogout } from "../api/auth";
import { getToken, setToken } from "../api/client";


// Defines the shape of the authentication state and actions provided by the AuthContext.
interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// Creates a React context for authentication state and actions. The context is initialized with undefined, and will be provided by the AuthProvider component.
const AuthContext = createContext<AuthState | undefined>(undefined);

// Provides authentication state and actions to its children components. It fetches the current user's information on mount if a token is present in localStorage, and manages the loading state.
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getToken();
        if (token) {
            me().then(setUser).catch(() => {
                setToken(null);
                setUser(null);
            }).finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    // Follow the signed-in user's language. One effect covers login, register, refresh and logout, rather than patching all five setUser call sites.
    useEffect(() => {
        const lang = user?.language ?? detectLanguage();
        if (i18n.language !== lang) i18n.changeLanguage(lang);
    }, [user]);

    async function login(email: string, password: string) {
        await apiLogin(email, password);
        setUser(await me());
    }

    async function register(username: string, email: string, password: string) {
        await apiRegister(username, email, password);
        setUser(await me());
    }

    function logout() {
        apiLogout();
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