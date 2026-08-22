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
  /** True while Firebase auth or workspace resolution is still in progress. */
  loading: boolean
  signOut: () => Promise<void>
  refreshWorkspace: () => Promise<WebWorkspace | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [workspace, setWorkspace] = useState<WebWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refreshWorkspace = useCallback(async () => {
    const currentUser = getFirebaseAuth().currentUser
    if (!currentUser) {
      setWorkspace(null)
      await clearAuthSession()
      return null
    }

    setLoading(true)
    try {
      const token = await currentUser.getIdToken(true)
      const nextWorkspace = await syncAuthSession(token)
      setWorkspace(nextWorkspace)
      return nextWorkspace
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (nextUser) => {
      setLoading(true)
      setUser(nextUser)

      try {
        if (!nextUser) {
          setWorkspace(null)
          await clearAuthSession()
          return
        }

        const token = await nextUser.getIdToken()
        const nextWorkspace = await syncAuthSession(token)
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
      setUser(null)
      setWorkspace(null)
      await clearAuthSession()
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
