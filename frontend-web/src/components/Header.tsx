import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import Button from "./ui/Button";
import { useState } from "react";
import { Menu, X, LayoutDashboard, FileText, Images, MessageSquare, Settings as SettingsIcon, PawPrint, Activity } from "lucide-react";
import PetSelector from "./PetSelector";


// Navigation items for the header, each with a path and label key.
const navItems = [
  { to: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { to: "/records", key: "records", icon: FileText },
  { to: "/tracking", key: "tracking", icon: Activity },
  { to: "/photos", key: "photos", icon: Images },
  { to: "/chat", key: "chat", icon: MessageSquare },
  { to: "/settings", key: "settings", icon: SettingsIcon },
];

// Header component that displays the navigation bar with brand, navigation links, user information, and logout button.
export default function Header() {
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <header className="relative flex items-center justify-between px-4 sm:px-6 py-4 bg-surface border-b border-border">
            <div className="flex flex-1 min-w-0 items-center gap-2 sm:gap-4">
                <NavLink to="/dashboard" className="text-xl sm:text-2xl font-bold truncate">
                    <PawPrint size={22} className="inline me-2 -mt-1" /> Companion
                </NavLink>
                <nav className="hidden md:flex gap-4">
                    {navItems.filter((item) => item.to !== "/settings").map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === "/"}
                            className={({ isActive }) => isActive ? "text-fg font-semibold" : "text-muted hover:text-fg transition"}
                        >
                            <span className="flex items-center gap-1.5"><item.icon size={16} />{t(`nav.${item.key}`)}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>
            <PetSelector />

            <div className="flex flex-1 min-w-0 items-center justify-end gap-2 sm:gap-4">
                <div className="hidden md:flex min-w-0 items-center gap-2">
                    {user?.photo_filename ? (
                        <img
                            src={`${import.meta.env.VITE_API_URL}/photos/${user.photo_filename}`}
                            alt={user.username}
                            className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-border"
                        />
                    ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary ring-1 ring-primary/30">
                            {user?.username?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <span className="truncate text-sm text-fg">{user?.username}</span>
                </div>
                <NavLink
                    to="/settings"
                    className={({ isActive }) => `hidden md:flex shrink-0 items-center gap-1.5 ${isActive ? "text-fg font-semibold" : "text-muted hover:text-fg transition"}`}
                >
                    <SettingsIcon size={16} />
                    {t("nav.settings")}
                </NavLink>
                <Button variant="secondary" onClick={logout} className="px-3 py-1 hidden md:block">
                    {t("nav.logout")}
                </Button>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="md:hidden shrink-0 text-muted hover:text-fg"
                    aria-label={t("nav.menu")}
                >
                    {menuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {menuOpen && (
                <nav className="md:hidden absolute top-full inset-x-0 bg-surface border-b border-border flex flex-col p-4 gap-3 z-50">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setMenuOpen(false)}
                            className={({ isActive }) => isActive ? "text-fg font-semibold" : "text-muted"}
                        >
                            <span className="flex items-center gap-2"><item.icon size={16} />{t(`nav.${item.key}`)}</span>
                        </NavLink>
                    ))}
                    <button onClick={logout} className="text-start text-danger">
                        {t("nav.logoutMobile")}
                    </button>
                </nav>
            )}
        </header>
    );
}