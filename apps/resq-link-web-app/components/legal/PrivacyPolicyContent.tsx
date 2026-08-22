import LegalSection from './LegalSection'

const EFFECTIVE_DATE = 'August 22, 2026'

export default function PrivacyPolicyContent() {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Effective date: {EFFECTIVE_DATE}</p>

      <LegalSection title="1. Introduction">
        <p>
          RESQ-Link (&quot;RESQ-Link,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is an emergency-response platform
          that connects civilians, dispatch command centers, and field responders. This Privacy Policy explains how we
          collect, use, disclose, retain, and protect personal information when you use the RESQ-Link civilian mobile
          application, related websites (including www.resq-link.com), and associated services (collectively, the
          &quot;Services&quot;).
        </p>
        <p>
          The Services are developed and operated in coordination with St. Paul University Philippines Institutional
          Innovations and municipal emergency-response stakeholders in Tuguegarao City, Philippines. By creating an
          account or using the Services, you acknowledge that you have read and understood this Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p><strong>Account and profile information.</strong> When you register, we collect your name, residential address,
          mobile phone number, email address, and account credentials. This information is required to create and secure
          your account.</p>
        <p><strong>Identity verification (KYC) information.</strong> To reduce misuse of emergency services and protect
          responders and the public, we require identity verification before full access is granted. This includes the
          type of government-issued ID you select (for example, Philippine national ID, driver&apos;s license, passport, or
          other accepted IDs) and a photograph of the front of that ID. ID images are uploaded to secure cloud storage
          and reviewed manually by authorized RESQ-Link administrators.</p>
        <p><strong>Location information.</strong> With your permission, we collect precise or approximate location data
          when you use location features such as auto-filling your address during registration or submitting an
          emergency report with your current position. Location may be collected in the foreground while you are using
          the app.</p>
        <p><strong>Emergency report content.</strong> When you file a report, we collect the information you submit,
          which may include incident type, description, photos, timestamps, and location coordinates associated with
          the incident.</p>
        <p><strong>Communications and verification.</strong> We send email one-time passwords (OTP) for account
          verification and may retain logs of verification attempts. We do not send marketing SMS without separate
          consent.</p>
        <p><strong>Device and usage information.</strong> We automatically collect technical data such as device type,
          operating system version, app version, IP address, and diagnostic logs needed to maintain security, prevent
          abuse, and troubleshoot errors.</p>
      </LegalSection>

      <LegalSection title="3. How we use your information">
        <p>We use personal information for the following purposes:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Creating, authenticating, and managing your account;</li>
          <li>Verifying your identity through our KYC review process;</li>
          <li>Receiving, routing, and coordinating emergency reports to authorized dispatch and responder personnel;</li>
          <li>Displaying incident status and response activity relevant to your reports;</li>
          <li>Improving reliability, security, and performance of the Services;</li>
          <li>Complying with legal obligations and responding to lawful requests;</li>
          <li>Communicating with you about your account, verification status, or critical service notices.</li>
        </ul>
        <p>
          We do not sell your personal information. We do not use government ID images for advertising or unrelated
          profiling.
        </p>
      </LegalSection>

      <LegalSection title="4. Legal basis for processing (Philippines)">
        <p>
          Where the Philippine Data Privacy Act of 2012 (Republic Act No. 10173, &quot;DPA&quot;) applies, we process
          personal information based on one or more of the following:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Consent</strong> — for example, when you agree to this policy, upload an ID photo, or enable
            location access;</li>
          <li><strong>Contract</strong> — to provide the Services you request, including account registration and
            emergency reporting;</li>
          <li><strong>Legitimate interest</strong> — to secure the platform, prevent fraud, and improve emergency
            coordination, balanced against your privacy rights;</li>
          <li><strong>Vital interest or public interest</strong> — where processing is necessary to protect life,
            physical safety, or public safety in emergency-response contexts.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Identity verification (KYC) — important disclosure">
        <p>
          RESQ-Link requires manual review of government-issued identification before approving civilian accounts. This
          is not a credit check and we do not use third-party identity scoring services for KYC at this time.
        </p>
        <p><strong>What happens to your ID photo:</strong></p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Uploaded to Firebase Cloud Storage under a path restricted to your account and authorized administrators;</li>
          <li>Reviewed by trained super-admin personnel through the RESQ-Link admin console;</li>
          <li>Used solely to confirm that the registrant matches the submitted ID and is eligible to use civilian
            reporting features;</li>
          <li>Retained only as long as necessary for verification, account integrity, audit, and legal compliance, then
            deleted or anonymized in accordance with our retention schedule (see Section 9).</li>
        </ul>
        <p>
          If you do not wish to provide a government ID, you cannot complete civilian registration. You may still
          contact local emergency services directly by telephone (for example, 911 in the Philippines where available).
        </p>
      </LegalSection>

      <LegalSection title="6. How we share information">
        <p>We share personal information only as described below:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Authorized emergency personnel</strong> — dispatch operators and verified responders who need
            incident and reporter contact details to respond to your reports;</li>
          <li><strong>Service providers</strong> — infrastructure partners that host and operate the Services under
            contractual safeguards, including Google Firebase (authentication, database, storage, hosting), Mapbox
            (mapping), and Resend (transactional email). These providers process data on our instructions and may not
            use it for their own marketing;</li>
          <li><strong>Institutional partners</strong> — St. Paul University Philippines and municipal stakeholders
            involved in operating or auditing the platform, subject to confidentiality and access controls;</li>
          <li><strong>Legal and safety</strong> — when required by law, court order, or to protect the rights, safety,
            or property of users, responders, or the public.</li>
        </ul>
        <p>We do not publicly publish your government ID images or sell personal data to data brokers.</p>
      </LegalSection>

      <LegalSection title="7. International data transfers">
        <p>
          Our cloud infrastructure may process and store information in data centers outside the Philippines (for
          example, United States or other regions used by Google Cloud/Firebase). Where required, we implement
          appropriate contractual and organizational safeguards consistent with the DPA and applicable cross-border
          transfer requirements.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          We use industry-standard measures including encrypted transport (HTTPS/TLS), Firebase security rules,
          role-based access controls for admin consoles, and secure authentication. No method of transmission or storage
          is completely secure; we cannot guarantee absolute security, but we work to protect information against
          unauthorized access, alteration, disclosure, or destruction.
        </p>
      </LegalSection>

      <LegalSection title="9. Data retention">
        <p>We retain personal information only as long as reasonably necessary for the purposes described in this
          policy, including:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Account data</strong> — for the life of your account and a reasonable period after closure for
            audit and dispute resolution;</li>
          <li><strong>KYC / ID images</strong> — for the verification period and thereafter as required for fraud
            prevention, legal compliance, or institutional audit (typically reviewed for deletion when no longer
            needed, unless retention is required by law);</li>
          <li><strong>Emergency reports</strong> — for operational, safety, and historical response records as required
            by participating agencies and applicable regulations;</li>
          <li><strong>Logs</strong> — for a limited period for security and diagnostics.</li>
        </ul>
        <p>You may request deletion subject to Section 10 and applicable legal exceptions.</p>
      </LegalSection>

      <LegalSection title="10. Your privacy rights">
        <p>Under the DPA and our internal policies, you may have the right to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Be informed about how your personal data is processed;</li>
          <li>Access and obtain a copy of your personal data;</li>
          <li>Object to or restrict certain processing;</li>
          <li>Correct inaccurate or incomplete data;</li>
          <li>Withdraw consent where processing is consent-based (withdrawal may limit Service availability);</li>
          <li>Request erasure where applicable;</li>
          <li>File a complaint with the National Privacy Commission (NPC) of the Philippines.</li>
        </ul>
        <p>
          To exercise these rights, contact us at{' '}
          <a href="mailto:mvgumabay@spup.edu.ph" className="text-primary-400 underline-offset-2 hover:underline">
            mvgumabay@spup.edu.ph
          </a>
          . We may need to verify your identity before fulfilling requests. We will respond within the timeframes required
          by applicable law.
        </p>
      </LegalSection>

      <LegalSection title="11. App permissions (mobile)">
        <p>The civilian mobile app may request the following device permissions:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Location</strong> — to attach accurate coordinates to emergency reports and optionally fill your
            registration address;</li>
          <li><strong>Camera</strong> — to photograph your government ID and incident-related images you choose to
            attach;</li>
          <li><strong>Photo library</strong> — to select an existing photo of your government ID or incident images;</li>
          <li><strong>Notifications</strong> (if enabled) — to alert you about report status updates.</li>
        </ul>
        <p>You can change many permissions in your device settings. Denying required permissions may limit features.</p>
      </LegalSection>

      <LegalSection title="12. Children&apos;s privacy">
        <p>
          The Services are not directed to children under 13, and we do not knowingly collect personal information from
          children under 13 without appropriate parental or guardian consent and legal authorization. If you believe a
          child has provided personal information without consent, contact us and we will take appropriate steps to
          delete it.
        </p>
      </LegalSection>

      <LegalSection title="13. Third-party links">
        <p>
          The Services may link to third-party websites or services (for example, map providers or institutional
          pages). We are not responsible for the privacy practices of those third parties. Review their policies before
          providing personal information.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. We will post the revised policy on www.resq-link.com and
          update the effective date. Material changes may be communicated through the app or email where appropriate.
          Continued use after changes take effect constitutes acceptance of the updated policy.
        </p>
      </LegalSection>

      <LegalSection title="15. Contact us">
        <p>
          For privacy questions, data subject requests, or concerns about identity verification:
        </p>
        <p>
          <strong>RESQ-Link Privacy Office</strong><br />
          Email:{' '}
          <a href="mailto:mvgumabay@spup.edu.ph" className="text-primary-400 underline-offset-2 hover:underline">
            mvgumabay@spup.edu.ph
          </a>
          <br />
          Web:{' '}
          <a href="/contact" className="text-primary-400 underline-offset-2 hover:underline">
            www.resq-link.com/contact
          </a>
        </p>
        <p className="text-slate-500">
          Institutional development: St. Paul University Philippines — Institutional Innovations, Tuguegarao City,
          Philippines.
        </p>
      </LegalSection>
    </>
  )
}
