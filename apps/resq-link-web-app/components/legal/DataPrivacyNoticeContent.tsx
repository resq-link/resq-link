import LegalSection from './LegalSection'

const EFFECTIVE_DATE = 'August 22, 2026'

export default function DataPrivacyNoticeContent() {
  return (
    <>
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Effective date: {EFFECTIVE_DATE}</p>

      <LegalSection title="Data Privacy Notice (Philippines)">
        <p>
          This Data Privacy Notice is issued pursuant to Republic Act No. 10173 (Data Privacy Act of 2012) and its
          implementing rules. It supplements the RESQ-Link Privacy Policy and provides specific information about our
          data protection commitments for users in the Philippines.
        </p>
        <p>
          <strong>Personal Information Controller (PIC):</strong> RESQ-Link Program / City of Tuguegarao emergency-response
          initiative, operated in coordination with St. Paul University Philippines Institutional Innovations.
        </p>
        <p>
          <strong>Data Protection contact:</strong>{' '}
          <a href="mailto:privacy@resq-link.com" className="text-primary-400 underline-offset-2 hover:underline">
            privacy@resq-link.com
          </a>
        </p>
      </LegalSection>

      <LegalSection title="Categories of personal data processed">
        <ul className="list-disc space-y-2 pl-5">
          <li>Identity and contact data (name, address, phone, email);</li>
          <li>Sensitive personal information: government ID type and ID photograph submitted for KYC verification;</li>
          <li>Location data related to registration and emergency reporting;</li>
          <li>Incident report content (descriptions, photos, timestamps);</li>
          <li>Authentication and security logs.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Purposes of processing">
        <p>Personal data is processed to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Register and authenticate civilian users;</li>
          <li>Verify identity before granting access to reporting features;</li>
          <li>Coordinate emergency response with authorized dispatch and responder personnel;</li>
          <li>Maintain audit trails for public-safety operations;</li>
          <li>Secure the platform against fraud, abuse, and unauthorized access;</li>
          <li>Comply with legal and regulatory obligations.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Sensitive personal information — government ID">
        <p>
          Photographs of government-issued identification constitute sensitive personal information under the DPA. We
          collect this data only with your explicit consent at registration, after you are shown this notice and our
          Privacy Policy. Processing is limited to manual verification by authorized administrators and is not used for
          unrelated commercial purposes.
        </p>
        <p>
          Access to ID images is restricted through Firebase Storage security rules and admin role controls. Only
          personnel with a legitimate operational need may view KYC submissions.
        </p>
      </LegalSection>

      <LegalSection title="Recipients and disclosure">
        <p>Personal data may be disclosed to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Verified emergency responders and dispatch operators handling your reports;</li>
          <li>Cloud infrastructure providers (Google Firebase / Google Cloud) under data processing arrangements;</li>
          <li>Mapping and email service providers (Mapbox, Resend) as necessary to operate the Services;</li>
          <li>Government or law-enforcement agencies when required by valid legal process or to protect vital interests.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Retention">
        <p>
          We retain personal data only for as long as necessary to fulfill the purposes above, unless a longer retention
          period is required by law or legitimate public-safety record-keeping requirements. KYC documents are retained
          for verification and audit purposes and reviewed periodically for deletion when no longer required.
        </p>
      </LegalSection>

      <LegalSection title="Your rights as a data subject">
        <p>Under the DPA, you have the right to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Be informed of the existence and scope of processing;</li>
          <li>Reasonable access to your personal data;</li>
          <li>Dispute the accuracy and request correction;</li>
          <li>Suspend, withdraw, or order blocking, removal, or destruction of data in appropriate cases;</li>
          <li>Data portability where applicable;</li>
          <li>File a complaint with the National Privacy Commission.</li>
        </ul>
        <p>
          Submit requests to{' '}
          <a href="mailto:privacy@resq-link.com" className="text-primary-400 underline-offset-2 hover:underline">
            privacy@resq-link.com
          </a>
          . We may verify your identity before acting on a request.
        </p>
      </LegalSection>

      <LegalSection title="Security measures">
        <p>
          We implement organizational, physical, and technical safeguards appropriate to the nature of emergency-response
          data, including access controls, encrypted connections, authenticated admin access, and Firebase security rules.
        </p>
      </LegalSection>

      <LegalSection title="Automated decision-making">
        <p>
          KYC approval is performed through human review by authorized administrators. We do not make fully automated
          decisions that produce legal or similarly significant effects without human oversight.
        </p>
      </LegalSection>

      <LegalSection title="Apple App Store privacy summary">
        <p>
          For transparency with mobile app users and app store reviewers, RESQ-Link collects the following categories of
          data linked to your identity:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Contact info</strong> — name, email, phone, address;</li>
          <li><strong>Identifiers</strong> — user ID, device identifiers in logs;</li>
          <li><strong>Location</strong> — precise location when reporting or using location features;</li>
          <li><strong>User content</strong> — emergency reports, photos, government ID image;</li>
          <li><strong>Photos or videos</strong> — ID and incident images you upload;</li>
          <li><strong>Usage / diagnostics</strong> — crash and performance data for app stability.</li>
        </ul>
        <p>
          Purposes: app functionality, account management, fraud prevention / KYC, and product analytics limited to
          reliability. Data is not sold. See our Privacy Policy for full details.
        </p>
      </LegalSection>

      <LegalSection title="Questions and NPC complaints">
        <p>
          Privacy inquiries:{' '}
          <a href="mailto:privacy@resq-link.com" className="text-primary-400 underline-offset-2 hover:underline">
            privacy@resq-link.com
          </a>
        </p>
        <p>
          National Privacy Commission:{' '}
          <a
            href="https://privacy.gov.ph"
            className="text-primary-400 underline-offset-2 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            privacy.gov.ph
          </a>
        </p>
      </LegalSection>
    </>
  )
}
