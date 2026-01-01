import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { ArrowLeft } from '@phosphor-icons/react'

export function TermsOfService() {
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
            Terms of Service
          </h1>
          <p className="text-muted-foreground text-lg mb-8">Last updated: December 8, 2024</p>

          <section className="space-y-6">
            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using openevent.my ("the Platform," "the Service"), you agree to be
                bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you
                must not access or use the Platform. These Terms constitute a legally binding
                agreement between you and openevent.my.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                2. Description of Service
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                openevent.my is an open-source event operations platform designed to connect event
                organizers with sponsors and vendors. Our services include event management tools,
                partner discovery, application processing, AI-powered matching, and communication
                facilitation. The Platform is provided "as is" and we continuously work to improve
                and expand our features.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">3. User Eligibility</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To use the Platform, you must:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Be at least 18 years of age</li>
                <li>Have the legal capacity to enter into binding contracts</li>
                <li>Not be prohibited from using the service under Malaysian law</li>
                <li>Provide accurate and truthful information during registration</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                If you are using the Platform on behalf of an organization, you represent that you
                have authority to bind that organization to these Terms.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">4. User Accounts</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                When you create an account, you agree to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your information as needed</li>
                <li>Keep your password secure and confidential</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Not share your account credentials with others</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We reserve the right to suspend or terminate accounts that violate these Terms or
                appear to be fraudulent.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">5. User Types and Roles</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Platform serves three main user types:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>Event Organizers:</strong> Create and manage events, post opportunities
                  for sponsors and vendors
                </li>
                <li>
                  <strong>Sponsors:</strong> Discover events and submit sponsorship applications
                </li>
                <li>
                  <strong>Vendors:</strong> Offer services and apply to provide for events
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Users may hold multiple roles. Each role has specific features and responsibilities
                as described in our platform documentation.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                6. Acceptable Use Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">You agree NOT to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Violate any applicable laws, regulations, or third-party rights</li>
                <li>Post false, misleading, or fraudulent information</li>
                <li>Impersonate another person or entity</li>
                <li>Spam, harass, or send unsolicited communications</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with the Platform's operation or security</li>
                <li>Scrape, crawl, or collect data without permission</li>
                <li>Use the Platform for money laundering or illegal activities</li>
                <li>Circumvent any security measures or access restrictions</li>
              </ul>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                7. Content and Intellectual Property
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong>Your Content:</strong> You retain ownership of content you submit (event
                details, profiles, images, documents). By submitting content, you grant us a
                worldwide, non-exclusive, royalty-free license to use, display, and distribute such
                content solely for operating and improving the Platform.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong>Platform Content:</strong> The openevent.my platform, including its source
                code, is open-source software. Usage is subject to the applicable open-source
                license terms available in our GitHub repository.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong>Trademarks:</strong> The openevent.my name, logo, and branding are our
                trademarks. You may not use these without prior written permission.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                8. Transactions Between Users
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                openevent.my facilitates connections between organizers, sponsors, and vendors but
                is not a party to any agreements made between users. We do not guarantee the
                quality, safety, or legality of services offered. Users are responsible for
                conducting their own due diligence before entering into any arrangement. Any
                disputes between users should be resolved directly between the parties involved.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">9. Fees and Payment</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Platform is currently free to use. We may introduce premium features or fees in
                the future, with advance notice. Any paid services will be clearly disclosed with
                pricing before purchase. Payments are processed through secure third-party
                providers. Fees, once paid, are non-refundable except as required by law or
                explicitly stated.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                10. Disclaimer of Warranties
              </h2>
              <p className="text-muted-foreground leading-relaxed font-mono text-sm bg-muted/50 p-4 rounded-lg">
                THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
                WHETHER EXPRESS, IMPLIED, OR STATUTORY. WE DISCLAIM ALL WARRANTIES INCLUDING
                MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT
                WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE OF
                VIRUSES. YOUR USE OF THE PLATFORM IS AT YOUR SOLE RISK.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                11. Limitation of Liability
              </h2>
              <p className="text-muted-foreground leading-relaxed font-mono text-sm bg-muted/50 p-4 rounded-lg">
                TO THE MAXIMUM EXTENT PERMITTED BY MALAYSIAN LAW, OPENEVENT.MY AND ITS AFFILIATES,
                DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR
                BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE OF THE PLATFORM. OUR TOTAL LIABILITY
                SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS, OR RM100, WHICHEVER
                IS GREATER.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">12. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify, defend, and hold harmless openevent.my and its affiliates
                from any claims, damages, losses, liabilities, costs, and expenses (including legal
                fees) arising from: (a) your use of the Platform, (b) your violation of these Terms,
                (c) your violation of any third-party rights, or (d) your content submitted to the
                Platform.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">13. Termination</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong>By You:</strong> You may terminate your account at any time by contacting us
                or using the account deletion feature (when available).
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong>By Us:</strong> We may suspend or terminate your access at any time, with or
                without cause, with or without notice. Reasons may include violation of these Terms,
                fraudulent activity, or extended inactivity.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Upon termination, your right to use the Platform ceases immediately. Provisions that
                should survive termination (including limitations of liability and indemnification)
                will continue to apply.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                14. Modifications to Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. Material changes will be
                communicated via email or platform notification at least 14 days before taking
                effect. Your continued use of the Platform after changes constitutes acceptance. If
                you disagree with the changes, you must stop using the Platform.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                15. Governing Law and Jurisdiction
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of
                Malaysia. Any disputes arising from these Terms or your use of the Platform shall be
                subject to the exclusive jurisdiction of the courts of Malaysia. Both parties agree
                to attempt good-faith resolution of disputes before pursuing legal action.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">16. General Provisions</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>Entire Agreement:</strong> These Terms constitute the entire agreement
                  between you and openevent.my
                </li>
                <li>
                  <strong>Severability:</strong> If any provision is found unenforceable, the
                  remaining provisions remain in effect
                </li>
                <li>
                  <strong>Waiver:</strong> Our failure to enforce any right does not waive that
                  right
                </li>
                <li>
                  <strong>Assignment:</strong> You may not assign your rights under these Terms
                  without our consent
                </li>
                <li>
                  <strong>Force Majeure:</strong> We are not liable for delays caused by events
                  beyond our control
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">17. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms:
              </p>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg text-muted-foreground">
                <p className="font-mono text-sm">
                  <strong>openevent.my</strong>
                  <br />
                  Email:{' '}
                  <a href="mailto:legal@openevent.my" className="text-foreground hover:underline">
                    legal@openevent.my
                  </a>
                  <br />
                  For urgent matters:{' '}
                  <a href="mailto:hello@openevent.my" className="text-foreground hover:underline">
                    hello@openevent.my
                  </a>
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
