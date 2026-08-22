import PublicInfoPage from '@/components/PublicInfoPage'
import PrivacyPolicyContent from '@/components/legal/PrivacyPolicyContent'

export default function PrivacyPolicyPage() {
  return (
    <PublicInfoPage
      eyebrow="Legal"
      title="Privacy policy"
      description="How RESQ-Link collects, uses, and protects personal information — including identity verification for civilian accounts."
    >
      <PrivacyPolicyContent />
    </PublicInfoPage>
  )
}
