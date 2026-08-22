import { Link } from "react-router-dom";

// Public page, same as Privacy — store reviewers fetch it without a session.
export default function Terms() {
  return (
    <div className="min-h-screen bg-ink text-fg">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/" className="text-primary hover:underline">← Back</Link>
        <h1 className="mt-6 text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted">Last updated: 22 August 2026</p>

        <section className="mt-6">
          <h2 className="text-xl font-bold">1. Acceptance of these terms</h2>
          <p className="mt-2 text-sm text-muted">
            By using our service, you agree to these terms. If you do not agree, do not use the service.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">2. What the service does</h2>
          <p className="mt-2 text-sm text-muted">
            Our service provides information and AI-generated answers related to pet care.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">3. NOT VETERINARY ADVICE</h2>
          <p className="mt-2 text-sm text-muted">
            The information provided by our service is for informational purposes only and is not a substitute for professional veterinary advice. Always consult your veterinarian for any concerns regarding your pet's health.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">4. Your account, and your responsibility for its security</h2>
          <p className="mt-2 text-sm text-muted">
            You are responsible for maintaining the security of your account and for all activities that occur under it.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">5. Acceptable use</h2>
          <p className="mt-2 text-sm text-muted">
            You agree to use the service only for lawful purposes and in accordance with these terms.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">6. Your content</h2>
          <p className="mt-2 text-sm text-muted">
            You retain ownership of your pets' data. By using the service, you grant us a license to store and process this data as necessary to provide the service.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">7. AI answers are generated and may be wrong</h2>
          <p className="mt-2 text-sm text-muted">
            AI-generated answers are not a diagnosis and may be incorrect. Always verify information with a qualified veterinarian.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">8. Availability</h2>
          <p className="mt-2 text-sm text-muted">
            We do not guarantee that the service will be available at all times.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">9. Limitation of liability</h2>
          <p className="mt-2 text-sm text-muted">
            We are not liable for any damages arising from your use of the service.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">10. Termination</h2>
          <p className="mt-2 text-sm text-muted">
            Either you or we may terminate your access to the service at any time.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">11. Governing law</h2>
          <p className="mt-2 text-sm text-muted">
            These terms are governed by the laws of the State of California, United States, without regard to conflict of law principles.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">12. Contact</h2>
          <p className="mt-2 text-sm text-muted">
            If you have any questions about these terms, contact us at <a href="mailto:iliasokhlal@gmail.com" className="text-primary hover:underline">iliasokhlal@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}