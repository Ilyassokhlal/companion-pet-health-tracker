import { Link } from "react-router-dom";

// Footer component that displays a disclaimer and copyright information at the bottom of the page.
export default function Footer() {
    return (
        <footer className="px-6 py-4 bg-surface border-t border-border text-center text-sm">
            <p className="text-muted">
                Disclaimer: This application is for informational purposes only and is not a substitute for professional veterinary advice. Always consult your veterinarian for any concerns regarding your pet's health. User discretion is advised.
            </p>
            <p className="mt-2">
                <Link to="/privacy" className="text-muted hover:text-fg">Privacy Policy</Link>
                <span className="text-muted"> · </span>
                <Link to="/terms" className="text-muted hover:text-fg">Terms</Link>
            </p>
            <p className="text-muted">
                &copy; {new Date().getFullYear()} Companion. All rights reserved.
            </p>
        </footer>
    );
}