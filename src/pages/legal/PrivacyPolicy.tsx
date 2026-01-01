import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { ArrowLeft } from '@phosphor-icons/react'

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <main className="px-6 py-12 max-w-4xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <h1 className="font-mono text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground text-lg mb-8">Last updated: December 8, 2024</p>

          <section className="space-y-6">
            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to openevent.my ("we," "our," or "us"). We are committed to protecting your
                personal data in accordance with Malaysia's Personal Data Protection Act 2010 (PDPA)
                and international privacy standards. This policy explains how we collect, use,
                store, and protect your information when you use our platform.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                2. Information We Collect
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We collect information you provide directly to us:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>Account Information:</strong> Name, email address, phone number, profile
                  picture
                </li>
                <li>
                  <strong>Organization Details:</strong> Company name, registration number (SSM),
                  business address
                </li>
                <li>
                  <strong>Event Data:</strong> Event details, schedules, budgets, and related
                  documents
                </li>
                <li>
                  <strong>Communications:</strong> Messages between organizers, sponsors, and
                  vendors
                </li>
                <li>
                  <strong>Payment Information:</strong> Billing details (processed securely via
                  third-party providers)
                </li>
                <li>
                  <strong>Usage Data:</strong> How you interact with our platform, features used,
                  time spent
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use your information for the following purposes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide and maintain our event management services</li>
                <li>Connect event organizers with relevant sponsors and vendors</li>
                <li>Process applications and facilitate partnerships</li>
                <li>Send service notifications, updates, and support messages</li>
                <li>Improve our platform through analytics and user feedback</li>
                <li>Comply with legal obligations under Malaysian law</li>
                <li>Prevent fraud and ensure platform security</li>
              </ul>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">4. Information Sharing</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We do not sell your personal data. We may share your information only in these
                circumstances:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>With Your Consent:</strong> When you explicitly agree to share information
                  with sponsors or vendors
                </li>
                <li>
                  <strong>Platform Connections:</strong> Limited profile information visible to
                  potential partners on the platform
                </li>
                <li>
                  <strong>Service Providers:</strong> Trusted partners who help operate our platform
                  (hosting, analytics, payments)
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by Malaysian law or court
                  orders
                </li>
                <li>
                  <strong>Safety:</strong> To protect the rights, property, or safety of our users
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                5. Data Storage and Security
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Your data is stored on secure servers with industry-standard encryption. We
                implement technical and organizational measures including SSL/TLS encryption, access
                controls, regular security audits, and secure authentication. While we strive to
                protect your data, no system is 100% secure. We will notify you promptly of any data
                breach as required by PDPA.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">6. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal data only as long as necessary for the purposes outlined in
                this policy, or as required by law. Account data is retained while your account is
                active. Event data may be retained for record-keeping purposes. You can request
                deletion of your data at any time, subject to legal retention requirements.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                7. Your Rights Under PDPA
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Under Malaysia's Personal Data Protection Act 2010, you have the right to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>Access:</strong> Request a copy of your personal data we hold
                </li>
                <li>
                  <strong>Correction:</strong> Request correction of inaccurate or incomplete data
                </li>
                <li>
                  <strong>Withdrawal:</strong> Withdraw consent for data processing at any time
                </li>
                <li>
                  <strong>Prevent Processing:</strong> Request we stop processing your data for
                  certain purposes
                </li>
                <li>
                  <strong>Data Portability:</strong> Receive your data in a structured, commonly
                  used format
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise these rights, contact us at{' '}
                <a href="mailto:privacy@openevent.my" className="text-foreground hover:underline">
                  privacy@openevent.my
                </a>
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">8. Cookies and Tracking</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar technologies to enhance your experience. Essential
                cookies are required for the platform to function. Analytics cookies help us
                understand usage patterns. You can manage cookie preferences through your browser
                settings. See our{' '}
                <Link to="/cookies" className="text-foreground hover:underline">
                  Cookie Policy
                </Link>{' '}
                for more details.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">9. Third-Party Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our platform integrates with third-party services including Google (authentication),
                payment processors, and analytics providers. These services have their own privacy
                policies. We encourage you to review their policies. We only share the minimum
                information necessary for these integrations to function.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">10. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our services are intended for users aged 18 and above. We do not knowingly collect
                personal data from individuals under 18. If you believe we have inadvertently
                collected such information, please contact us immediately for deletion.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                11. International Data Transfers
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Your data may be processed on servers located outside Malaysia. We ensure
                appropriate safeguards are in place for any international transfers, including using
                service providers that comply with equivalent data protection standards.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                12. Changes to This Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this privacy policy from time to time. Material changes will be
                communicated via email or platform notification. The "Last updated" date at the top
                indicates when the policy was last revised. Continued use after changes constitutes
                acceptance of the updated policy.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">13. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                For privacy-related inquiries or to exercise your rights:
              </p>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg text-muted-foreground">
                <p className="font-mono text-sm">
                  <strong>openevent.my</strong>
                  <br />
                  Email:{' '}
                  <a href="mailto:privacy@openevent.my" className="text-foreground hover:underline">
                    privacy@openevent.my
                  </a>
                  <br />
                  Response time: Within 14 business days
                </p>
              </div>
            </div>
          </section>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="px-6 py-8 max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} openevent.my — All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
