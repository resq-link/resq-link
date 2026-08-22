import { redirect } from 'next/navigation'
import { routes } from '@/lib/routes'

export default function ProfileRedirectPage() {
  redirect(routes.admin.settings)
}
