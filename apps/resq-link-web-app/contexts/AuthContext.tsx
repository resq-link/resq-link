'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getFirebaseAuth, type User, onAuthStateChanged, signOut as firebaseSignOut } from '@packages/firebase'
import { useRouter } from 'next/navigation'
import { routes } from '@/lib/routes'
import type { WebWorkspace } from '@/lib/workspace'

interface AuthContextType {
  user: User | null
  workspace: WebWorkspace | null
  loading: boolean
  signOut: () => Promise<void>
  refreshWorkspace: () => Promise<WebWorkspace | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function establishWorkspace(user: User | null): Promise<WebWorkspace | null> {
  if (!user) {
    await fetch('/api/auth/session', { method: 'DELETE' })
    return null
  }

  const token = await user.getIdToken()
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = (await response.json().catch(() => null)) as { workspace?: WebWorkspace } | null
  if (!response.ok) {
    return 'unauthorized'
  }
  return data?.workspace ?? 'unauthorized'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [workspace, setWorkspace] = useState<WebWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refreshWorkspace = useCallback(async () => {
    const nextWorkspace = await establishWorkspace(getFirebaseAuth().currentUser)
    setWorkspace(nextWorkspace)
    return nextWorkspace
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (nextUser) => {
      setUser(nextUser)
      try {
        const nextWorkspace = await establishWorkspace(nextUser)
        setWorkspace(nextWorkspace)
      } catch (error) {
        console.error('Failed to resolve workspace', error)
        setWorkspace(nextUser ? 'unauthorized' : null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(getFirebaseAuth())
      setWorkspace(null)
      await fetch('/api/auth/session', { method: 'DELETE' })
      router.push(routes.login)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }, [router])

  const value = useMemo(
    () => ({ user, workspace, loading, signOut, refreshWorkspace }),
    [user, workspace, loading, signOut, refreshWorkspace]
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
