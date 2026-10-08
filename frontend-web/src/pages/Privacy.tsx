import { Link } from "react-router-dom";

// Public page. Both app stores fetch this URL themselves during review, so it must render without a session.
export default function Privacy() {
  return (
    <div className="min-h-screen bg-ink text-fg">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/" className="text-primary hover:underline">← Back</Link>
        <h1 className="mt-6 text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted">Last updated: 8 October 2026</p>

        <p className="mt-4 text-sm text-muted">
          This Privacy Policy explains what Companion collects, why, who receives it and how long it is kept, on mycompanion.pet and in the Companion apps.
        </p>
        <h2 className="mt-6 text-2xl font-bold">1. What We Collect</h2>
        <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted">
          <li>Your account: username, email address, password (stored only as a bcrypt hash), language, timezone and settings.</li>
          <li>What you add: your pets, health records, photos, scheduled events, walks, feeding, expenses, and the questions you ask with their answers.</li>
          <li>Your devices: a push notification token for each phone you sign in on.</li>
          <li>Your subscription: when your free month ends, whether you have Companion Premium and until when, whether it renews, and whether you paid on the web or through Google Play. For web payments we keep Stripe's reference for you as a customer, never your card details.</li>
          <li>For each question you ask: when you asked it, whether it was answered, and how much of the AI service it used. This applies the free month's daily limit and tells us what the service costs to run.</li>
          <li>The days you use Companion, and whether on the web or in the phone app.</li>
          <li>
            The country your internet address points to, looked up when you sign up and each time you log in. The lookup
            happens on our own server with the free country database by DB-IP (
            <a href="https://db-ip.com" className="text-primary hover:underline">IP Geolocation by DB-IP</a>). We keep only
            the country, never the address itself, and the address is not sent anywhere.
          </li>
          <li>Each purchase, renewal, cancellation and refund that RevenueCat reports to us: its date, the store, the product, the price, and the share that went to tax and to the store.</li>
        </ul>
        <h2 className="mt-6 text-2xl font-bold">2. Why We Collect It</h2>
        <p className="mt-2 text-sm text-muted">
          To run Companion for you: keep your pets' records, send the reminders you ask for, answer your questions, and manage your free month and subscription. We also send account notices, such as email verification, password changes and the warnings before your free month or subscription ends. Those are sent even when reminders are turned off.
        </p>
        <p className="mt-2 text-sm text-muted">
          We also use the usage and payment details above to see how Companion is used and what it costs, on a private dashboard on our own server that only we can open.
        </p>
        <h2 className="mt-6 text-2xl font-bold">3. Who Receives It</h2>
        <p className="mt-2 text-sm text-muted">Each of these receives only what its part of the service needs:</p>
        <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted">
          <li>Anthropic: your question and the relevant health records, to write an answer.</li>
          <li>Resend: your email address and the emails we send you.</li>
          <li>Expo: your push token and the text of each notification.</li>
          <li>Stripe: if you pay on the web, your email address, billing address and payment details, which you enter on Stripe's own page. We never see your card number.</li>
          <li>Google Play: if you subscribe in the Android app, Google handles the payment under its own privacy policy.</li>
          <li>RevenueCat: your Companion account number and purchase history, to keep your subscription the same on the web and on Android. It does not receive your email address or your pets' data.</li>
        </ul>
        <h2 className="mt-6 text-2xl font-bold">4. Where It Is Stored</h2>
        <p className="mt-2 text-sm text-muted">
          Your information is stored on our server at Hetzner, in Finland, and so is the private dashboard. Stripe, Google and RevenueCat keep payment records on their own systems.
        </p>
        <h2 className="mt-6 text-2xl font-bold">5. Retention and Deletion</h2>
        <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted">
          <li>You can delete your account through Settings → Delete account. Your account, pets, records, photos and messages are erased straight away.</li>
          <li>Deleting a paying account also stops your subscription from renewing, on the web and on Google Play.</li>
          <li>So that one email address gets one free month, we keep a fingerprint of your email for one year after you delete your account or change your email address. It is a keyed one way hash: your email cannot be read back from it. It is erased automatically after the year.</li>
          <li>Stripe, Google and RevenueCat keep records of past payments as the law requires them to, under their own policies.</li>
          <li>The days you used Companion are erased after 13 months.</li>
          <li>When you delete your account, the purchase records above are kept for our accounts but are no longer linked to you. They hold no name or email address.</li>
          <li>If we suspend an account for misusing Companion, its data is kept until we decide to delete it, and its email address cannot be used to sign up again while the suspension lasts. For that we keep a keyed one way hash of the email, which is erased if the suspension is lifted.</li>
          <li>When we suspend an account or give it Premium, we keep a record of what was done, when, the account's email address and our reason. This record stays after the account is deleted.</li>
        </ul>
        <h2 className="mt-6 text-2xl font-bold">6. Security</h2>
        <p className="mt-2 text-sm text-muted">
          We use TLS to protect your information in transit and store passwords only as bcrypt hashes. Payment details never reach our servers.
        </p>
        <h2 className="mt-6 text-2xl font-bold">7. What We Do NOT Do</h2>
        <p className="mt-2 text-sm text-muted">
          We do not advertise, sell your information, or use outside analytics or tracking services. The usage figures described above stay on our server and are seen only by us.
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
          You can contact us at <a href="mailto:support@mycompanion.pet" className="text-primary hover:underline">support@mycompanion.pet</a>.
        </p>
      </div>
    </div>
  );
}