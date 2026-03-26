export const metadata = {
  title: 'Terms of Service — WorkersCraft AI',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-3">Terms of Service</h1>
          <p className="text-muted-foreground">Effective date: March 21, 2026</p>
        </div>

        <div className="bg-card border rounded-lg shadow-sm p-8 md:p-12 space-y-8">
          <section>
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of WorkersCraft AI
              (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) and its services. By creating an account or using the platform,
              you agree to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">1. The Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              WorkersCraft AI is an AI-powered platform that generates, edits, and deploys software
              applications. You may use the platform to build web and mobile apps through natural
              language prompts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must provide accurate information when creating an account. You are responsible
              for all activity under your account. You must be at least 18 years old to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">You agree not to use WorkersCraft AI to:</p>
            <ul className="space-y-2 text-muted-foreground ml-6">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Generate malicious, illegal, or harmful software</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Violate any applicable laws or third-party rights</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Attempt to reverse-engineer or abuse the platform infrastructure</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Resell or redistribute access to the service without permission</span>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We reserve the right to suspend accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Subscriptions and Billing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Paid plans are billed on a recurring basis through Paddle, our payment processor.
              By subscribing, you authorize recurring charges to your payment method. You may
              cancel your subscription at any time from your billing dashboard; cancellation takes
              effect at the end of the current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Refund Policy</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              All purchases are final and non-refundable, except where required by law.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              For customers in the EU, EEA, and UK: You have the right to withdraw within 14 days 
              of purchase. However, by using WorkersCraft AI to generate code or create projects, 
              you agree to immediate delivery of digital content and waive your 14-day withdrawal 
              right as permitted under consumer law.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              For refund requests, contact{' '}
              <a href="mailto:hello@workerscraft.com" className="text-primary hover:underline">
                hello@workerscraft.com
              </a>{' '}
              within 14 days of your purchase date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              You own the code and applications generated through your use of the platform.
              WorkersCraft AI retains ownership of the platform itself, including its UI, models
              integration, and infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Privacy Policy</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We collect and process the following data to operate the service:
            </p>
            <ul className="space-y-2 text-muted-foreground ml-6">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong className="text-foreground">Account data</strong>: email address and authentication information via Supabase</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong className="text-foreground">Usage data</strong>: projects created, prompts submitted, and feature usage via PostHog</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong className="text-foreground">Billing data</strong>: subscription and payment information processed by Paddle</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><strong className="text-foreground">Generated content</strong>: code and app data stored to enable project continuity</span>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We do not sell your personal data. Data is shared only with the third-party services
              necessary to operate the platform: Supabase (database and auth), Paddle (billing),
              PostHog (analytics), E2B (sandbox execution), and GitHub (repository integration).
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You may request deletion of your account and associated data at any time by emailing{' '}
              <a href="mailto:hello@workerscraft.com" className="text-primary hover:underline">
                hello@workerscraft.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              WorkersCraft AI is provided &ldquo;as is&rdquo;. We make no guarantees about uptime, accuracy of
              generated code, or fitness for a particular purpose. To the maximum extent permitted
              by law, we are not liable for any indirect, incidental, or consequential damages
              arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your account at any time for violation of these Terms.
              You may delete your account at any time. Upon termination, your access to the service
              ends and your data may be deleted after a reasonable retention period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Changes to These Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. Continued use of the service after
              changes are posted constitutes acceptance of the updated Terms. We will notify users
              of material changes via email.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">11. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For any questions about these Terms, contact us at{' '}
              <a href="mailto:hello@workerscraft.com" className="text-primary hover:underline">
                hello@workerscraft.com
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to home
          </a>
        </div>
      </main>
    </div>
  )
}
