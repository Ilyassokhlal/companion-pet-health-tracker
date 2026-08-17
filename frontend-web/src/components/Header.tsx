import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { usePets } from "../context/PetContext";
import Button from "./ui/Button";
import { useState } from "react";
import { Menu, X, LayoutDashboard, FileText, MessageSquare, Settings as SettingsIcon, PawPrint } from "lucide-react";

// Navigation items for the header, each with a path and label.
const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/records", label: "Records", icon: FileText },
  { to: "/chat", label: "Chat history", icon: MessageSquare },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

// Header component that displays the navigation bar with brand, navigation links, user information, and logout button.
export default function Header() {
    const { user, logout } = useAuth();
    const { pets, currentPet, setCurrentPet } = usePets();
    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <header className="relative flex items-center justify-between px-4 sm:px-6 py-4 bg-surface border-b border-border">
            <div className="flex items-center space-x-4">
                <NavLink to="/dashboard" className="text-xl sm:text-2xl font-bold whitespace-nowrap">
                    <PawPrint size={22} className="inline mr-2 -mt-1" /> Companion
                </NavLink>
                <nav className="hidden md:flex space-x-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === "/"}
                            className={({ isActive }) => isActive ? "text-fg font-semibold" : "text-muted hover:text-fg transition"}
                        >
                            <span className="flex items-center gap-1.5"><item.icon size={16} />{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>
            <div className="flex items-center space-x-4">
                {pets.length > 0 && (
                    <select
                        value={currentPet?.id ?? ""}
                        onChange={e => {
                            const pet = pets.find(p => p.id === Number(e.target.value));
                            if (pet) setCurrentPet(pet);
                        }}
                        className="bg-ink text-fg border border-border rounded px-2 py-1"
                    >
                        {pets.map(pet => (
                            <option key={pet.id} value={pet.id}>{pet.name}</option>
                        ))}
                    </select>
                )}
                <span className="hidden sm:inline text-muted">{user?.username}</span>
                <Button variant="secondary" onClick={logout} className="px-3 py-1 hidden sm:block">
                    Logout
                </Button>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="md:hidden text-muted hover:text-fg"
                    aria-label="Menu"
                >
                    {menuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {menuOpen && (
                <nav className="md:hidden absolute top-full left-0 right-0 bg-surface border-b border-border flex flex-col p-4 gap-3 z-50">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setMenuOpen(false)}
                            className={({ isActive }) => isActive ? "text-fg font-semibold" : "text-muted"}
                        >
                            <span className="flex items-center gap-2"><item.icon size={16} />{item.label}</span>
                        </NavLink>
                    ))}
                    <button onClick={logout} className="text-left text-danger">
                        Log out
                    </button>
                </nav>
            )}
        </header>
    );
}