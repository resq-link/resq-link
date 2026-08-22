'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getFirebaseAuth, signInWithEmailAndPassword, signOut } from '@packages/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { LoginView } from '@/components/auth/LoginView'
import { mapLoginError } from '@/lib/loginErrors'
import { routes } from '@/lib/routes'
import { homeForWorkspace, type WebWorkspace } from '@/lib/workspace'

function destinationForWorkspace(workspace: WebWorkspace, nextPath: string | null): string {
  const home = homeForWorkspace(workspace)
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) return home
  if (workspace === 'super_admin' && nextPath.startsWith(routes.admin.root)) return nextPath
  if (workspace === 'command_center' && nextPath.startsWith(routes.commandCenter.root)) return nextPath
  return home
}

function LoginPageInner() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next')
  const { user, workspace, loading: authLoading, refreshWorkspace, signOut: contextSignOut } = useAuth()

  useEffect(() => {
    if (authLoading) return
    if (!user) return

    if (workspace === 'super_admin' || workspace === 'command_center') {
      router.replace(destinationForWorkspace(workspace, nextPath))
      return
    }

    if (workspace === 'unauthorized') {
      void contextSignOut()
      setError('You do not have access to this workspace.')
    }
  }, [authLoading, user, workspace, router, contextSignOut, nextPath])

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password)
      const nextWorkspace = await refreshWorkspace()
      if (nextWorkspace === 'super_admin' || nextWorkspace === 'command_center') {
        router.replace(destinationForWorkspace(nextWorkspace, nextPath))
        return
      }
      await signOut(getFirebaseAuth())
      await fetch('/api/auth/session', { method: 'DELETE' })
      setError('You do not have access to this workspace.')
    } catch (err: unknown) {
      setError(mapLoginError(err))
    } finally {
      setLoading(false)
    }
  }

  const checkingSession =
    authLoading || Boolean(user && (workspace === 'super_admin' || workspace === 'command_center'))

  return (
    <LoginView
      email={email}
      password={password}
      loading={loading}
      checkingSession={checkingSession}
      error={error}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
    />
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}
