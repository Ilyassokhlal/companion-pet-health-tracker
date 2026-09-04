import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/ui/Button";
import LanguagePicker from "../components/LanguagePicker";
import logo from "../assets/Logo.png";
import { useTranslation } from "react-i18next";


// This is the landing page for the application. It provides a brief overview of the app's features and allows users to navigate to the registration or login pages. If a user is already authenticated, they are redirected to the dashboard.
export default function Landing() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

    return (
    <div className="relative flex flex-col items-center justify-center min-h-screen">
        <LanguagePicker />
        <div className="text-center p-8">
            <img src={logo} alt="Companion — a dog and a cat" className="mx-auto mb-8 w-72 sm:w-96 h-auto" />
            <h1 className="text-4xl font-bold mb-4">{t("landing.title")}</h1>
            <p className="text-lg mb-6">{t("landing.tagline")}</p>
            <div className="flex justify-center gap-4">
                <Link to="/register">
                    <Button>{t("auth.register.title")}</Button>
                </Link>
                <Link to="/login">
                    <Button variant="secondary">{t("auth.login.title")}</Button>
                </Link>
            </div>
            <p className="text-sm text-muted mt-4">{t("common.disclaimer")}</p>
        </div>
    </div>
    );
}