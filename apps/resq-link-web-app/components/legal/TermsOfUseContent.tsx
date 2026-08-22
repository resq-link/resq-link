import LegalSection from './LegalSection'

const EFFECTIVE_DATE = 'August 22, 2026'

export default function TermsOfUseContent() {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Effective date: {EFFECTIVE_DATE}</p>

      <LegalSection title="1. Agreement">
        <p>
          These Terms of Use (&quot;Terms&quot;) govern your access to and use of RESQ-Link websites, the civilian mobile
          application, and related services (collectively, the &quot;Services&quot;). By registering for or using the
          Services, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the Services.
        </p>
      </LegalSection>

      <LegalSection title="2. Emergency services disclaimer">
        <p>
          <strong>RESQ-Link is a coordination platform. It does not replace direct emergency telephone services.</strong>
          {' '}In a life-threatening emergency, call your local emergency number (for example, 911 in the Philippines where
          available) or use official government emergency channels. Network conditions, device limitations, or review
          delays may affect report delivery. We do not guarantee response times or outcomes.
        </p>
      </LegalSection>

      <LegalSection title="3. Eligibility">
        <p>
          You must be at least 18 years old, or the age of majority in your jurisdiction, to register as a civilian user.
          You represent that information you provide is accurate and that you have the legal capacity to enter into these
          Terms.
        </p>
      </LegalSection>

      <LegalSection title="4. Account registration and KYC">
        <p>
          Civilian accounts require email verification and submission of a valid government-issued ID for manual review.
          You agree to provide truthful information and an ID image that belongs to you. Impersonation, forged documents,
          or misuse of another person&apos;s identity is prohibited and may be reported to authorities.
        </p>
        <p>
          Accounts remain in a pending state until approved by authorized administrators. We may approve, reject, or
          suspend accounts at our discretion to protect public safety and platform integrity.
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Submit false, prank, or malicious emergency reports;</li>
          <li>Harass, threaten, or endanger responders or other users;</li>
          <li>Attempt to bypass security, access unauthorized data, or interfere with the Services;</li>
          <li>Use the Services for unlawful purposes or in violation of applicable regulations;</li>
          <li>Upload content you do not have the right to share or that contains others&apos; personal data without
            consent.</li>
        </ul>
        <p>Violations may result in immediate suspension or termination and referral to law enforcement where appropriate.</p>
      </LegalSection>

      <LegalSection title="6. Your content">
        <p>
          You retain ownership of content you submit (such as report descriptions and photos). You grant RESQ-Link a
          non-exclusive, royalty-free license to use, store, display, and share that content with authorized emergency
          personnel solely to operate and improve emergency-response functions.
        </p>
      </LegalSection>

      <LegalSection title="7. Responder and dispatch access">
        <p>
          Verified responders and dispatch operators may access incident and reporter information necessary to respond to
          emergencies. Operational access is logged and limited by role. Details are described in our Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection title="8. Service availability">
        <p>
          We strive for reliable operation but do not warrant uninterrupted or error-free Services. Maintenance, outages,
          third-party provider failures, or force majeure events may cause interruptions. Features may change as the
          platform evolves.
        </p>
      </LegalSection>

      <LegalSection title="9. Termination">
        <p>
          You may stop using the Services at any time. We may suspend or terminate access for violations of these Terms,
          safety concerns, or legal requirements. Provisions that by nature should survive termination (including
          disclaimers and limitations of liability) will survive.
        </p>
      </LegalSection>

      <LegalSection title="10. Disclaimer of warranties">
        <p>
          THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
          WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          AND NON-INFRINGEMENT, TO THE MAXIMUM EXTENT PERMITTED BY LAW.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, RESQ-LINK AND ITS DEVELOPERS, PARTNERS, AND SUPPLIERS WILL
          NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF
          PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICES, EVEN IF ADVISED OF THE
          POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p>
          Our aggregate liability for claims relating to the Services shall not exceed the greater of (a) the amount you
          paid us in the twelve months before the claim, or (b) one hundred Philippine pesos (PHP 100), where permitted by
          law.
        </p>
      </LegalSection>

      <LegalSection title="12. Governing law">
        <p>
          These Terms are governed by the laws of the Republic of the Philippines, without regard to conflict-of-law
          principles. Disputes shall be subject to the exclusive jurisdiction of the courts of Tuguegarao City, Cagayan,
          Philippines, unless mandatory consumer protection rules provide otherwise.
        </p>
      </LegalSection>

      <LegalSection title="13. Changes">
        <p>
          We may modify these Terms by posting an updated version on www.resq-link.com. Material changes may be notified
          through the app or email. Continued use after the effective date constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>
          Questions about these Terms:{' '}
          <a href="mailto:privacy@resq-link.com" className="text-primary-400 underline-offset-2 hover:underline">
            privacy@resq-link.com
          </a>
          {' '}or{' '}
          <a href="/contact" className="text-primary-400 underline-offset-2 hover:underline">
            www.resq-link.com/contact
          </a>
          .
        </p>
      </LegalSection>
    </>
  )
}
