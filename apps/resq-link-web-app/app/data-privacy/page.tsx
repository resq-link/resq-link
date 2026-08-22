import PublicInfoPage from '@/components/PublicInfoPage'
import DataPrivacyNoticeContent from '@/components/legal/DataPrivacyNoticeContent'

export default function DataPrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Legal"
      title="Data privacy notice"
      description="Philippines Data Privacy Act notice for RESQ-Link users, including KYC and emergency-response data handling."
    >
      <DataPrivacyNoticeContent />
    </PublicInfoPage>
  )
}
