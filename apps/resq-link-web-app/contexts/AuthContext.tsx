'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getFirebaseAuth, type User, onAuthStateChanged, signOut as firebaseSignOut } from '@packages/firebase'
import { useRouter } from 'next/navigation'
import { routes } from '@/lib/routes'
import { clearAuthSession, syncAuthSession } from '@/lib/authSession'
import type { WebWorkspace } from '@/lib/workspace'

interface AuthContextType {
  user: User | null
  workspace: WebWorkspace | null
  authLoading: boolean
  workspaceLoading: boolean
  loading: boolean
  signOut: () => Promise<void>
  refreshWorkspace: () => Promise<WebWorkspace | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [workspace, setWorkspace] = useState<WebWorkspace | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const router = useRouter()

  const resolveWorkspaceForUser = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setWorkspace(null)
      await clearAuthSession()
      return null
    }

    setWorkspaceLoading(true)
    try {
      const token = await nextUser.getIdToken(true)
      const session = await syncAuthSession(token)
      if (session.forceTokenRefresh) {
        await nextUser.getIdToken(true)
      }
      setWorkspace(session.workspace)
      return session.workspace
    } finally {
      setWorkspaceLoading(false)
    }
  }, [])

  const refreshWorkspace = useCallback(async () => {
    return resolveWorkspaceForUser(getFirebaseAuth().currentUser)
  }, [resolveWorkspaceForUser])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (nextUser) => {
      setAuthLoading(true)
      setUser(nextUser)

      try {
        await resolveWorkspaceForUser(nextUser)
      } catch (error) {
        console.error('Failed to resolve workspace', error)
        setWorkspace(nextUser ? 'unauthorized' : null)
      } finally {
        setAuthLoading(false)
      }
    })

    return () => unsubscribe()
  }, [resolveWorkspaceForUser])

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(getFirebaseAuth())
      setUser(null)
      setWorkspace(null)
      await clearAuthSession()
      router.push(routes.login)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }, [router])

  const loading = authLoading || workspaceLoading

  const value = useMemo(
    () => ({
      user,
      workspace,
      authLoading,
      workspaceLoading,
      loading,
      signOut,
      refreshWorkspace,
    }),
    [user, workspace, authLoading, workspaceLoading, loading, signOut, refreshWorkspace]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
