import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Footer component that displays a disclaimer and copyright information at the bottom of the page.
export default function Footer() {
    const { t } = useTranslation();
    return (
        <footer className="px-6 py-4 bg-surface border-t border-border text-center text-sm">
            <p className="text-muted">
                {t("footer.disclaimer")}
            </p>
            <p className="mt-2">
                <Link to="/privacy" className="text-muted hover:text-fg">{t("footer.privacy")}</Link>
                <span className="text-muted"> · </span>
                <Link to="/terms" className="text-muted hover:text-fg">{t("footer.terms")}</Link>
            </p>
            <p className="text-muted">
                {t("footer.rights", { year: new Date().getFullYear() })}
            </p>
        </footer>
    );
}