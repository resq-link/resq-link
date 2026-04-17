'use client'

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { subscribeToEmergencyReports, type EmergencyReport } from '@packages/firebase'
import { playAlarmSound, initAudioContext } from '@/utils/alarmSound'
import { useAuth } from './AuthContext'

interface AlarmContextType {
  isAlarmMuted: boolean
  setIsAlarmMuted: (muted: boolean) => void
}

const AlarmContext = createContext<AlarmContextType | undefined>(undefined)

export function AlarmProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  
  // Persist mute state in localStorage
  const [isAlarmMuted, setIsAlarmMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resq-link-alarm-muted')
      return saved === 'true'
    }
    return false
  })

  // Watch for changes to persist
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('resq-link-alarm-muted', String(isAlarmMuted))
    }
  }, [isAlarmMuted])

  const previousIncidentIdsRef = useRef<Set<string>>(new Set())
  const isInitialLoadRef = useRef(true)
  const audioInitializedRef = useRef(false)

  // Initialize audio context interactively to bypass autoplay blocks
  useEffect(() => {
    const initAudio = () => {
      if (!audioInitializedRef.current) {
        const ctx = initAudioContext()
        if (ctx) {
          console.log('✅ Global Audio context initialized')
          audioInitializedRef.current = true
        }
      }
    }
    
    const events = ['click', 'touchstart', 'keydown', 'mousedown']
    const handlers: Array<() => void> = []
    
    events.forEach(event => {
      const handler = initAudio
      window.addEventListener(event, handler, { once: true, passive: true })
      handlers.push(() => window.removeEventListener(event, handler))
    })
    
    return () => {
      handlers.forEach(cleanup => cleanup())
    }
  }, [])

  // Global subscription to emergency reports for alarms
  useEffect(() => {
    if (!user) return

    const unsubscribe = subscribeToEmergencyReports(
      (reports: EmergencyReport[]) => {
        // Filter out completed ones, we only care about active/pending/new
        const activeReports = reports.filter(r => r.status !== 'done' && r.status !== 'resolved')
        
        if (!isInitialLoadRef.current) {
          const currentIds = new Set(activeReports.map(inc => inc.id as string))
          const previousIds = previousIncidentIdsRef.current
          
          // Find new incidents
          const newIncidents = activeReports.filter(inc => inc.id && !previousIds.has(inc.id))
          
          if (newIncidents.length > 0) {
            console.log(`🚨 Global Alarm: New incident(s) detected (${newIncidents.length})`)
            if (!isAlarmMuted) {
              playAlarmSound(false)
            } else {
              console.log('Global Alarm is muted, skipping sound')
            }
          }
        } else {
          isInitialLoadRef.current = false
        }
        
        previousIncidentIdsRef.current = new Set(activeReports.map(inc => inc.id as string))
      },
      {
        statusFilter: 'all',
        limitCount: 100,
      }
    )

    return () => unsubscribe()
  }, [user, isAlarmMuted])

  return (
    <AlarmContext.Provider value={{ isAlarmMuted, setIsAlarmMuted }}>
      {children}
    </AlarmContext.Provider>
  )
}

export function useAlarm() {
  const context = useContext(AlarmContext)
  if (context === undefined) {
    throw new Error('useAlarm must be used within an AlarmProvider')
  }
  return context
}
