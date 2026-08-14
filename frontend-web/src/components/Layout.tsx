import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ChatFAB from "./ChatFAB";
import VerifyBanner from "./VerifyBanner";


// Layout component that structures the main layout of the application, including the header, footer, and a floating action button for chat. It uses React Router's Outlet to render nested routes within the main content area.
export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
        <Header />
        <VerifyBanner />
        <main className="grow">
            <Outlet />
        </main>
        <Footer />
        <ChatFAB />
    </div>

  );
}