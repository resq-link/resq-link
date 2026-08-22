'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getFirebaseAuth, signInWithEmailAndPassword, signOut } from '@packages/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { LoginView } from '@/components/auth/LoginView'
import { mapLoginError } from '@/lib/loginErrors'
import { destinationForWorkspace, navigateAfterLogin } from '@/lib/authRouting'
import { clearAuthSession } from '@/lib/authSession'

function LoginPageInner() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next')
  const {
    user,
    workspace,
    authLoading,
    workspaceLoading,
    refreshWorkspace,
    signOut: contextSignOut,
  } = useAuth()

  useEffect(() => {
    if (authLoading || workspaceLoading) return
    if (!user) return
    if (workspace === null) return

    if (workspace === 'super_admin' || workspace === 'command_center') {
      router.replace(destinationForWorkspace(workspace, nextPath))
      return
    }

    if (workspace === 'unauthorized') {
      void contextSignOut()
      setError('You do not have access to this workspace.')
    }
  }, [authLoading, workspaceLoading, user, workspace, router, contextSignOut, nextPath])

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      await clearAuthSession()
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password)
      const nextWorkspace = await refreshWorkspace()
      if (nextWorkspace === 'super_admin' || nextWorkspace === 'command_center') {
        navigateAfterLogin(nextWorkspace, nextPath)
        return
      }
      await signOut(getFirebaseAuth())
      await clearAuthSession()
      setError('You do not have access to this workspace.')
    } catch (err: unknown) {
      setError(mapLoginError(err))
    } finally {
      setLoading(false)
    }
  }

  const checkingSession =
    authLoading ||
    workspaceLoading ||
    Boolean(user && workspace === null) ||
    Boolean(user && (workspace === 'super_admin' || workspace === 'command_center'))

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
