import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { ArrowLeft } from '@phosphor-icons/react'

export function CookiePolicy() {
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
            Cookie Policy
          </h1>
          <p className="text-muted-foreground text-lg mb-8">Last updated: December 8, 2024</p>

          <section className="space-y-6">
            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">1. What Are Cookies?</h2>
              <p className="text-muted-foreground leading-relaxed">
                Cookies are small text files stored on your device (computer, tablet, or mobile)
                when you visit websites. They help websites function properly, remember your
                preferences, and provide insights into how visitors use the site. Cookies are widely
                used across the internet and are essential for many website features to work
                correctly.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">2. How We Use Cookies</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                openevent.my uses cookies and similar technologies for the following purposes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Keep you signed in to your account</li>
                <li>Remember your preferences (like dark/light theme)</li>
                <li>Understand how you use our platform</li>
                <li>Improve our services based on usage patterns</li>
                <li>Ensure the security of your account</li>
              </ul>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                3. Types of Cookies We Use
              </h2>

              <div className="mt-6 space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h3 className="font-mono font-semibold text-foreground mb-2">
                    Essential Cookies
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Required for the platform to function. Cannot be disabled.
                  </p>
                  <ul className="text-muted-foreground text-sm space-y-1 ml-4">
                    <li>
                      • <strong>Authentication:</strong> Keeps you logged in securely
                    </li>
                    <li>
                      • <strong>Session:</strong> Maintains your session across pages
                    </li>
                    <li>
                      • <strong>Security:</strong> Helps prevent fraud and protect your account
                    </li>
                    <li>
                      • <strong>Load balancing:</strong> Ensures fast and reliable service
                    </li>
                  </ul>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h3 className="font-mono font-semibold text-foreground mb-2">
                    Functional Cookies
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Remember your preferences for a better experience.
                  </p>
                  <ul className="text-muted-foreground text-sm space-y-1 ml-4">
                    <li>
                      • <strong>Theme preference:</strong> Remembers dark/light mode choice
                    </li>
                    <li>
                      • <strong>Language:</strong> Stores your language preference
                    </li>
                    <li>
                      • <strong>Dashboard settings:</strong> Remembers layout preferences
                    </li>
                  </ul>
                </div>

                <div className="p-4 border border-border rounded-lg">
                  <h3 className="font-mono font-semibold text-foreground mb-2">
                    Analytics Cookies
                  </h3>
                  <p className="text-muted-foreground text-sm mb-2">
                    Help us understand how visitors use the platform.
                  </p>
                  <ul className="text-muted-foreground text-sm space-y-1 ml-4">
                    <li>
                      • <strong>Page views:</strong> Which pages are most visited
                    </li>
                    <li>
                      • <strong>Feature usage:</strong> Which features are popular
                    </li>
                    <li>
                      • <strong>Performance:</strong> How fast pages load for users
                    </li>
                    <li>
                      • <strong>Errors:</strong> Technical issues that need fixing
                    </li>
                  </ul>
                  <p className="text-muted-foreground text-sm mt-2 italic">
                    We use privacy-focused analytics that do not track individual users.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">4. Third-Party Cookies</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Some third-party services we integrate with may set their own cookies:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>Google:</strong> For authentication (Sign in with Google)
                </li>
                <li>
                  <strong>Convex:</strong> Our backend service for real-time data
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                These third parties have their own privacy and cookie policies. We recommend
                reviewing their policies for more information about how they handle your data.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">5. Cookie Duration</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Cookies have different lifespans:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>Session cookies:</strong> Deleted when you close your browser
                </li>
                <li>
                  <strong>Persistent cookies:</strong> Remain until they expire or you delete them
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Our authentication cookies typically last for 30 days (or until you sign out).
                Preference cookies may last up to 1 year.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">6. Managing Cookies</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You can control cookies in several ways:
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-mono font-semibold text-foreground mb-2">Browser Settings</h3>
                  <p className="text-muted-foreground text-sm">
                    Most browsers allow you to view, manage, and delete cookies. Check your
                    browser's help section for instructions:
                  </p>
                  <ul className="text-muted-foreground text-sm mt-2 space-y-1 ml-4">
                    <li>• Chrome: Settings → Privacy and security → Cookies</li>
                    <li>• Firefox: Settings → Privacy & Security → Cookies</li>
                    <li>• Safari: Preferences → Privacy → Manage Website Data</li>
                    <li>• Edge: Settings → Cookies and site permissions</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-mono font-semibold text-foreground mb-2">Important Note</h3>
                  <p className="text-muted-foreground text-sm">
                    Blocking essential cookies will prevent you from using openevent.my properly.
                    You won't be able to sign in or access your account. If you block all cookies,
                    the platform will not function as intended.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">7. Local Storage</h2>
              <p className="text-muted-foreground leading-relaxed">
                In addition to cookies, we use browser local storage for certain features like theme
                preferences. Local storage works similarly to cookies but is stored differently in
                your browser. You can clear local storage through your browser's developer tools or
                settings.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">8. Do Not Track</h2>
              <p className="text-muted-foreground leading-relaxed">
                Some browsers have a "Do Not Track" (DNT) feature. Currently, there is no industry
                standard for how websites should respond to DNT signals. Our platform does not
                currently respond differently to DNT signals. However, we limit our tracking to
                what's necessary for providing and improving our services.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">
                9. Updates to This Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Cookie Policy as we add new features or technologies. Any changes
                will be reflected in the "Last updated" date at the top of this page. We encourage
                you to review this policy periodically.
              </p>
            </div>

            <div>
              <h2 className="font-mono text-xl font-semibold mt-8 mb-4">10. Questions?</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about our use of cookies:
              </p>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg text-muted-foreground">
                <p className="font-mono text-sm">
                  <strong>openevent.my</strong>
                  <br />
                  Email:{' '}
                  <a href="mailto:privacy@openevent.my" className="text-foreground hover:underline">
                    privacy@openevent.my
                  </a>
                </p>
              </div>
            </div>

            <div className="mt-12 p-6 border border-border rounded-lg bg-muted/30">
              <h3 className="font-mono font-semibold text-foreground mb-3">Quick Summary</h3>
              <ul className="text-muted-foreground text-sm space-y-2">
                <li>✓ We use cookies to make the platform work and improve it</li>
                <li>✓ Essential cookies are required — the platform won't work without them</li>
                <li>✓ We don't sell your data to advertisers</li>
                <li>✓ You can manage most cookies through your browser settings</li>
                <li>✓ We use privacy-focused analytics, not invasive tracking</li>
              </ul>
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
