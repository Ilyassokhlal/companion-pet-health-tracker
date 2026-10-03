import { Link } from "react-router-dom";

// Public page, same as Privacy — store reviewers fetch it without a session.
export default function Terms() {
  return (
    <div className="min-h-screen bg-ink text-fg">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/" className="text-primary hover:underline">← Back</Link>
        <h1 className="mt-6 text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted">Last updated: 3 October 2026</p>

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
          <h2 className="text-xl font-bold">5. Your free month</h2>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted">
            <li>Every new account gets one month of everything for free, starting the day you sign up. No card is needed.</li>
            <li>Each email address gets one free month. Deleting your account or changing your email address does not start another one.</li>
            <li>During the free month you can ask up to 30 questions a day.</li>
            <li>When the free month ends, your account becomes read only until you subscribe to Companion Premium. You can still view, export and delete your data, but adding or changing anything, asking questions and reminders stop. We warn you 7, 3 and 1 days before.</li>
          </ul>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">6. Companion Premium: payment, renewal and cancellation</h2>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted">
            <li>Companion Premium includes everything in the service, with no daily question limit. It comes as a monthly or a yearly plan. The price is shown before you pay and includes tax where tax applies.</li>
            <li>On the web, payments are processed by Stripe. In the Android app, they are processed by Google Play.</li>
            <li>Your plan renews automatically at the end of each period until you cancel it.</li>
            <li>You can cancel at any time: on the web from Settings, under Subscription, and in the Android app from your Google Play subscriptions. You keep Premium until the end of the period you paid for.</li>
            <li>If you subscribe during your free month, billing starts that day and any free days left are not kept.</li>
            <li>If a renewal payment fails, you keep access while the payment is retried. If it still fails, your account becomes read only, as at the end of the free month.</li>
            <li>Deleting your account stops your plan from renewing.</li>
            <li>We will tell you before a price change applies to your plan.</li>
          </ul>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">7. Refunds</h2>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted">
            <li>If you paid on the web, you can ask for a full refund within 14 days of any charge by writing to <a href="mailto:support@mycompanion.pet" className="text-primary hover:underline">support@mycompanion.pet</a>.</li>
            <li>Purchases made through Google Play are refunded by Google, under Google Play's refund policy.</li>
            <li>Apart from that, time already paid for is not refunded, including when you cancel or delete your account.</li>
          </ul>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">8. Acceptable use</h2>
          <p className="mt-2 text-sm text-muted">
            You agree to use the service only for lawful purposes and in accordance with these terms.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">9. Your content</h2>
          <p className="mt-2 text-sm text-muted">
            You retain ownership of your pets' data. By using the service, you grant us a license to store and process this data as necessary to provide the service.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">10. AI answers are generated and may be wrong</h2>
          <p className="mt-2 text-sm text-muted">
            AI-generated answers are not a diagnosis and may be incorrect. Always verify information with a qualified veterinarian.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">11. Availability</h2>
          <p className="mt-2 text-sm text-muted">
            We do not guarantee that the service will be available at all times.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">12. Limitation of liability</h2>
          <p className="mt-2 text-sm text-muted">
            We are not liable for any damages arising from your use of the service.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">13. Termination</h2>
          <p className="mt-2 text-sm text-muted">
            You can delete your account at any time from Settings. We may suspend or close an account that breaks these terms. While an account is closed, its email address cannot be used to sign up again.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">14. Governing law</h2>
          <p className="mt-2 text-sm text-muted">
            These terms are governed by the laws of the State of California, United States, without regard to conflict of law principles.
          </p>
        </section>
        <section className="mt-6">
          <h2 className="text-xl font-bold">15. Contact</h2>
          <p className="mt-2 text-sm text-muted">
            If you have any questions about these terms, contact us at <a href="mailto:support@mycompanion.pet" className="text-primary hover:underline">support@mycompanion.pet</a>.
          </p>
        </section>
      </div>
    </div>
  );
}