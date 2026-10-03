import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { SUBSCRIPTION_REQUIRED } from "../api/client";
import Header from "./Header";
import Footer from "./Footer";
import ChatFAB from "./ChatFAB";
import VerifyBanner from "./VerifyBanner";
import PremiumBanner from "./PremiumBanner";
import PatternBackground from "./PatternBackground";


// Layout component that structures the main layout of the application, including the header, footer, and a floating action button for chat. It uses React Router's Outlet to render nested routes within the main content area.
export default function Layout() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  // A change refused because the account is locked opens the subscribe screen. The account is re-read so the banner catches up when the trial ended while the app was open.
  useEffect(() => {
    const onLocked = () => {
      refreshUser().catch(() => {});
      navigate("/premium");
    };
    window.addEventListener(SUBSCRIPTION_REQUIRED, onLocked);
    return () => window.removeEventListener(SUBSCRIPTION_REQUIRED, onLocked);
  }, [navigate, refreshUser]);

  return (
    <div className="relative flex flex-col min-h-screen">
        <PatternBackground />
        <Header />
        <VerifyBanner />
        <PremiumBanner />
        <main className="grow">
            <Outlet />
        </main>
        <Footer />
        <ChatFAB />
    </div>

  );
}