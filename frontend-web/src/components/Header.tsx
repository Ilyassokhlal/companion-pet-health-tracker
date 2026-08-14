import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { usePets } from "../context/PetContext";
import Button from "./ui/Button";

// Navigation items for the header, each with a path and label.
const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/records", label: "Records" },
  { to: "/chat", label: "Chat history" },
  { to: "/settings", label: "Settings" },
];

// Header component that displays the navigation bar with brand, navigation links, user information, and logout button.
export default function Header() {
    const { user, logout } = useAuth();
    const { pets, currentPet, setCurrentPet } = usePets();
    return (
        <header className="flex items-center justify-between px-6 py-4 bg-surface border-b border-border">
            <div className="flex items-center space-x-4">
                <NavLink to="/" className="text-2xl font-bold">
                    🐾 Companion
                </NavLink>
                <nav className="space-x-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === "/"}
                            className={({ isActive }) => isActive ? "text-fg font-semibold" : "text-muted hover:text-fg transition"}
                        >
                            {item.label}
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
                <span className="text-muted">{user?.username}</span>
                <Button variant="secondary" onClick={logout} className="px-3 py-1">
                    Logout
                </Button>
            </div>
        </header>
    );
}