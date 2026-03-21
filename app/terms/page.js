export const metadata = {
  title: 'Terms of Service — WorkersCraft AI',
}

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 prose prose-neutral dark:prose-invert">
      <h1>Terms of Service</h1>
      <p className="text-muted-foreground text-sm">Effective date: March 21, 2026</p>

      <p>
        These Terms of Service ("Terms") govern your access to and use of WorkersCraft AI
        ("we", "us", "our") and its services. By creating an account or using the platform,
        you agree to these Terms.
      </p>

      <h2>1. The Service</h2>
      <p>
        WorkersCraft AI is an AI-powered platform that generates, edits, and deploys software
        applications. You may use the platform to build web and mobile apps through natural
        language prompts.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You must provide accurate information when creating an account. You are responsible
        for all activity under your account. You must be at least 18 years old to use the service.
      </p>

      <h2>3. Acceptable Use</h2>
      <p>You agree not to use WorkersCraft AI to:</p>
      <ul>
        <li>Generate malicious, illegal, or harmful software</li>
        <li>Violate any applicable laws or third-party rights</li>
        <li>Attempt to reverse-engineer or abuse the platform infrastructure</li>
        <li>Resell or redistribute access to the service without permission</li>
      </ul>
      <p>We reserve the right to suspend accounts that violate these terms.</p>

      <h2>4. Subscriptions and Billing</h2>
      <p>
        Paid plans are billed on a recurring basis through Paddle, our payment processor.
        By subscribing, you authorize recurring charges to your payment method. You may
        cancel your subscription at any time from your billing dashboard; cancellation takes
        effect at the end of the current billing period.
      </p>

      <h2>5. Refund Policy</h2>
      <p>
        All subscription payments are generally non-refundable. However, we may issue a
        refund at our sole discretion under exceptional circumstances — for example, if you
        were charged due to a technical error on our end or if the service was completely
        unavailable for an extended period. To request a refund, contact us at{' '}
        <a href="mailto:workerscraftai@gmail.com">workerscraftai@gmail.com</a> with your
        account details and reason. We will review each request individually.
      </p>

      <h2>6. Intellectual Property</h2>
      <p>
        You own the code and applications generated through your use of the platform.
        WorkersCraft AI retains ownership of the platform itself, including its UI, models
        integration, and infrastructure.
      </p>

      <h2>7. Privacy Policy</h2>
      <p>We collect and process the following data to operate the service:</p>
      <ul>
        <li><strong>Account data</strong>: email address and authentication information via Supabase</li>
        <li><strong>Usage data</strong>: projects created, prompts submitted, and feature usage via PostHog</li>
        <li><strong>Billing data</strong>: subscription and payment information processed by Paddle</li>
        <li><strong>Generated content</strong>: code and app data stored to enable project continuity</li>
      </ul>
      <p>
        We do not sell your personal data. Data is shared only with the third-party services
        necessary to operate the platform: Supabase (database and auth), Paddle (billing),
        PostHog (analytics), E2B (sandbox execution), and GitHub (repository integration).
      </p>
      <p>
        You may request deletion of your account and associated data at any time by emailing{' '}
        <a href="mailto:workerscraftai@gmail.com">workerscraftai@gmail.com</a>.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        WorkersCraft AI is provided "as is". We make no guarantees about uptime, accuracy of
        generated code, or fitness for a particular purpose. To the maximum extent permitted
        by law, we are not liable for any indirect, incidental, or consequential damages
        arising from your use of the service.
      </p>

      <h2>9. Termination</h2>
      <p>
        We may suspend or terminate your account at any time for violation of these Terms.
        You may delete your account at any time. Upon termination, your access to the service
        ends and your data may be deleted after a reasonable retention period.
      </p>

      <h2>10. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the service after
        changes are posted constitutes acceptance of the updated Terms. We will notify users
        of material changes via email.
      </p>

      <h2>11. Contact</h2>
      <p>
        For any questions about these Terms, contact us at{' '}
        <a href="mailto:workerscraftai@gmail.com">workerscraftai@gmail.com</a>.
      </p>
    </main>
  )
}
