import { Link } from "react-router-dom";

// Public page. Both app stores fetch this URL themselves during review, so it must render without a session.
export default function Privacy() {
  return (
    <div className="min-h-screen bg-ink text-fg">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/" className="text-primary hover:underline">← Back</Link>
        <h1 className="mt-6 text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted">Last updated: 22 August 2026</p>
        
        <p className="mt-4 text-sm text-muted">
          This Privacy Policy explains how we collect, use, and share your information when you use our services.
        </p>
        <h2 className="mt-6 text-2xl font-bold">1. What We Collect</h2>
        <p className="mt-2 text-sm text-muted">
          We collect information related to your account, pets, records, photos, chat messages, and push tokens.
        </p>
        <h2 className="mt-6 text-2xl font-bold">2. Why We Collect It</h2>
        <p className="mt-2 text-sm text-muted">
          We collect this information to provide and improve our services, ensure the safety and well-being of pets, and facilitate communication through chat and push notifications.
        </p>
        <h2 className="mt-6 text-2xl font-bold">3. Who Receives It</h2>
        <p className="mt-2 text-sm text-muted">
          Your information may be shared with Anthropic (questions and health records as context), Resend (email address), and Expo (push token and notification text). Each recipient only receives the information necessary for their respective services.
        </p>
        <h2 className="mt-6 text-2xl font-bold">4. Where It Is Stored</h2>
        <p className="mt-2 text-sm text-muted">
          Your information is stored on our Hetzner VPS, located in Finland.
        </p>
        <h2 className="mt-6 text-2xl font-bold">5. Retention and Deletion</h2>
        <p className="mt-2 text-sm text-muted">
          You can delete your account through Settings → Delete account, which will cascade to pets, records, photos, and messages.
        </p>
        <h2 className="mt-6 text-2xl font-bold">6. Security</h2>
        <p className="mt-2 text-sm text-muted">
          We use TLS to protect your information in transit and bcrypt-hashed passwords for secure storage.
        </p>
        <h2 className="mt-6 text-2xl font-bold">7. What We Do NOT Do</h2>
        <p className="mt-2 text-sm text-muted">
          We do not perform analytics, advertising, tracking, or selling of your information.
        </p>
        <h2 className="mt-6 text-2xl font-bold">8. Children's Use</h2>
        <p className="mt-2 text-sm text-muted">
          Our services are not intended for children, and we do not knowingly collect information from children.
        </p>
        <h2 className="mt-6 text-2xl font-bold">9. How Changes Are Communicated</h2>
        <p className="mt-2 text-sm text-muted">
          Changes to this Privacy Policy will be communicated through our services and/or via email.
        </p>
        <h2 className="mt-6 text-2xl font-bold">10. Contact</h2>
        <p className="mt-2 text-sm text-muted">
          You can contact us at <a href="mailto:iliasokhlal@gmail.com" className="text-primary hover:underline">iliasokhlal@gmail.com</a>.
        </p>
      </div>
    </div>
  );
}