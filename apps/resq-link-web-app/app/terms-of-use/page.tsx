import PublicInfoPage from '@/components/PublicInfoPage'
import TermsOfUseContent from '@/components/legal/TermsOfUseContent'

export default function TermsOfUsePage() {
  return (
    <PublicInfoPage
      eyebrow="Legal"
      title="Terms of use"
      description="Rules for using RESQ-Link civilian services, including account verification and emergency reporting."
    >
      <TermsOfUseContent />
    </PublicInfoPage>
  )
}
