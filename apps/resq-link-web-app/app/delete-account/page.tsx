import PublicInfoPage from '@/components/PublicInfoPage'
import AccountDeletionContent from '@/components/legal/AccountDeletionContent'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Delete Account & Data Removal | RESQ-Link',
  description: 'Request the permanent deletion of your RESQ-Link account and personal data in compliance with Google Play Store policies and data privacy regulations.',
}

export default function DeleteAccountPage() {
  return (
    <PublicInfoPage
      eyebrow="Privacy & Data Control"
      title="Delete Account & Data"
      description="Request permanent removal of your account, login credentials, identity verification (KYC) documents, and personal information."
    >
      <AccountDeletionContent />
    </PublicInfoPage>
  )
}
