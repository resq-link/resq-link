/**
 * Tiered priority alert sounds for the command center / dispatcher dashboard (Web Audio API).
 * All active priorities repeat until stopPriorityAlerts / stopSoundByIncidentId is called.
 */

import type { IncidentPriority } from '@packages/firebase'
import { initAudioContext } from '@/utils/alarmSound'

type ActivePlayback = {
  priority: IncidentPriority
  stop: () => void
}

/**
 * Time until the next cycle starts (pattern length + tiny gap).
 * Keeps alerts feeling continuous — no multi-second silence between replays.
 */
const PRIORITY_CYCLE_MS: Record<IncidentPriority, number> = {
  critical: 2830, // ~2.8s siren + ~30ms gap
  high: 640, // ~0.62s triple beep + ~20ms gap
  medium: 920, // ~0.36s double beep + ~80ms gap
  low: 1500, // ~0.28s tone + ~120ms gap (softest cadence, still tight)
}

const INTENSIFIED_CRITICAL_CYCLE_MS = 2780

let activePlayback: ActivePlayback | null = null
let repeatTimeoutId: ReturnType<typeof setTimeout> | null = null
let playbackSession = 0
let activeLoopIncidentId: string | null = null

function clearTimers() {
  playbackSession += 1
  if (repeatTimeoutId) {
    clearTimeout(repeatTimeoutId)
    repeatTimeoutId = null
  }
}

export function getActiveLoopIncidentId(): string | null {
  return activeLoopIncidentId
}

export function stopPriorityAlerts(): void {
  clearTimers()
  activeLoopIncidentId = null
  if (activePlayback) {
    activePlayback.stop()
    activePlayback = null
  }
}

/** Stop looping/repeating audio for a specific incident (no-op if another incident is active). */
export function stopPriorityAlertForIncident(incidentId: string): void {
  if (activeLoopIncidentId !== incidentId) return
  stopPriorityAlerts()
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  startOffset: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine'
): void {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  oscillator.frequency.value = frequency
  oscillator.type = type
  const start = ctx.currentTime + startOffset
  const end = start + duration
  gainNode.gain.setValueAtTime(0, start)
  gainNode.gain.linearRampToValueAtTime(volume, start + 0.02)
  gainNode.gain.linearRampToValueAtTime(0, end - 0.02)
  oscillator.start(start)
  oscillator.stop(end + 0.05)
}

function playCriticalSiren(ctx: AudioContext, intensified = false): () => void {
  const oscillators: OscillatorNode[] = []
  const freqs = intensified ? [880, 1100, 1320] : [720, 960, 1200]
  const volume = intensified ? 0.65 : 0.5
  const duration = 2.8

  freqs.forEach((freq, index) => {
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.frequency.value = freq
    oscillator.type = 'square'
    const start = ctx.currentTime + index * 0.08
    const end = start + duration
    gainNode.gain.setValueAtTime(0, start)
    gainNode.gain.linearRampToValueAtTime(volume, start + 0.04)
    gainNode.gain.setValueAtTime(volume * 0.85, end - 0.15)
    gainNode.gain.linearRampToValueAtTime(0, end)
    oscillator.start(start)
    oscillator.stop(end + 0.1)
    oscillators.push(oscillator)
  })

  return () => {
    oscillators.forEach((osc) => {
      try {
        osc.stop()
      } catch {
        /* already stopped */
      }
    })
  }
}

function playHighTripleBeep(ctx: AudioContext): void {
  ;[0, 0.22, 0.44].forEach((offset) => {
    playTone(ctx, 1000, offset, 0.14, 0.45)
  })
}

function playMediumDoubleBeep(ctx: AudioContext): void {
  playTone(ctx, 720, 0, 0.12, 0.3)
  playTone(ctx, 720, 0.2, 0.12, 0.3)
}

function playLowSoftTone(ctx: AudioContext): void {
  playTone(ctx, 520, 0, 0.25, 0.18)
}

function runPriorityCycle(
  ctx: AudioContext,
  priority: IncidentPriority,
  intensified = false
): (() => void) | void {
  if (priority === 'critical') {
    if (activePlayback?.priority === 'critical') {
      activePlayback.stop()
    }
    return playCriticalSiren(ctx, intensified)
  }
  if (priority === 'high') {
    playHighTripleBeep(ctx)
    return
  }
  if (priority === 'medium') {
    playMediumDoubleBeep(ctx)
    return
  }
  playLowSoftTone(ctx)
}

function startRepeatingPlayback(
  ctx: AudioContext,
  priority: IncidentPriority,
  intensified: boolean
): void {
  const session = playbackSession
  const cycleMs =
    priority === 'critical' && intensified
      ? INTENSIFIED_CRITICAL_CYCLE_MS
      : PRIORITY_CYCLE_MS[priority]

  const run = () => {
    if (session !== playbackSession) return

    const stopFn = runPriorityCycle(ctx, priority, intensified)
    if (priority === 'critical' && typeof stopFn === 'function') {
      activePlayback = { priority: 'critical', stop: stopFn }
    } else {
      activePlayback = {
        priority,
        stop: () => clearTimers(),
      }
    }
  }

  const scheduleNext = () => {
    if (session !== playbackSession) return
    repeatTimeoutId = setTimeout(() => {
      run()
      scheduleNext()
    }, cycleMs)
  }

  run()
  scheduleNext()
}

async function ensureRunningContext(): Promise<AudioContext | null> {
  const ctx = initAudioContext()
  if (!ctx) return null
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      return null
    }
  }
  return ctx
}

/** Resume Web Audio after user gesture so the first alert is not delayed. */
export async function warmPriorityAudio(): Promise<boolean> {
  const ctx = await ensureRunningContext()
  return Boolean(ctx && ctx.state === 'running')
}

export async function playPriorityAlert(
  priority: IncidentPriority,
  options?: { intensified?: boolean; allowOverlap?: boolean; incidentId?: string }
): Promise<void> {
  if (!options?.allowOverlap) {
    stopPriorityAlerts()
  }

  const ctx = await ensureRunningContext()
  if (!ctx) return

  if (options?.incidentId) {
    activeLoopIncidentId = options.incidentId
  }

  startRepeatingPlayback(ctx, priority, Boolean(options?.intensified))
}

/** Play tiered alert bound to one incident (used by the real-time alert provider). */
export async function playPriorityAlertForIncident(
  incidentId: string,
  priority: IncidentPriority,
  options?: { intensified?: boolean }
): Promise<void> {
  return playPriorityAlert(priority, { ...options, incidentId })
}

/** Alias used by the alert pipeline — triggers sound immediately for a priority tier. */
export function playSoundByPriority(
  incidentId: string,
  priority: IncidentPriority,
  options?: { intensified?: boolean }
): void {
  void playPriorityAlertForIncident(incidentId, priority, options)
}

export function stopSoundByIncidentId(incidentId: string): void {
  stopPriorityAlertForIncident(incidentId)
}

export function testPrioritySound(priority: IncidentPriority): void {
  void playPriorityAlert(priority)
}
