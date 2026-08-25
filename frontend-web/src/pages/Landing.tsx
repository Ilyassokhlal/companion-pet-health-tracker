import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/ui/Button";
import logo from "../assets/Logo.png";
import { useTranslation } from "react-i18next";


// This is the landing page for the application. It provides a brief overview of the app's features and allows users to navigate to the registration or login pages. If a user is already authenticated, they are redirected to the dashboard.
export default function Landing() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

    return (
    <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center p-8">
            <img src={logo} alt="Companion — a dog and a cat" className="mx-auto mb-8 w-72 sm:w-96 h-auto" />
            <h1 className="text-4xl font-bold mb-4">Companion: Your Pet's Health Tracker</h1>
            <p className="text-lg mb-6">Keep track of your pet's health records, set due dates, receive reminders, and get grounded answers to your pet care questions.</p>
            <div className="flex justify-center gap-4">
                <Link to="/register">
                    <Button>Register</Button>
                </Link>
                <Link to="/login">
                    <Button variant="secondary">Login</Button>
                </Link>
            </div>
            <p className="text-sm text-muted mt-4">{t("common.disclaimer")}</p>
        </div>
    </div>
    );
}