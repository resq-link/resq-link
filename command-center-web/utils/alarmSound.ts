/**
 * Utility functions for playing alarm sounds when new incidents are detected
 */

let audioContext: AudioContext | null = null
let audioInitialized = false

/**
 * Initialize the AudioContext (required for Web Audio API)
 * Must be called after user interaction due to browser autoplay policies
 */
export function initAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    
    // Resume audio context if suspended (required after user interaction)
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('Audio context resumed successfully')
        audioInitialized = true
      }).catch(err => {
        console.error('Failed to resume audio context:', err)
      })
    } else if (audioContext.state === 'running') {
      audioInitialized = true
    }
    
    return audioContext
  } catch (error) {
    console.error('Failed to initialize audio context:', error)
    return null
  }
}

/**
 * Play an emergency alarm sound
 * Creates a programmatic alarm sound using Web Audio API
 */
export function playAlarmSound(isMuted: boolean = false): void {
  if (isMuted) {
    console.log('Alarm is muted, skipping sound')
    return
  }
  
  if (typeof window === 'undefined') {
    console.warn('Window not available, cannot play sound')
    return
  }

  console.log('Attempting to play alarm sound...')
  
  const ctx = initAudioContext()
  if (!ctx) {
    console.warn('Audio context not available')
    // Fallback: Try using HTML5 Audio with a simple beep
    playFallbackAlarm()
    return
  }

  // Ensure context is running
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      console.log('Audio context resumed, playing alarm...')
      playWebAudioAlarm(ctx)
    }).catch(err => {
      console.error('Failed to resume audio context:', err)
      playFallbackAlarm()
    })
  } else {
    playWebAudioAlarm(ctx)
  }
}

/**
 * Play alarm using Web Audio API
 */
function playWebAudioAlarm(ctx: AudioContext): void {
  try {
    // Create multiple oscillators for a richer alarm sound
    const frequencies = [800, 1000, 1200] // Three-tone alarm
    const playDuration = 10 // 10 seconds
    const beepDuration = 0.2 // Each beep is 0.2 seconds (short)
    const pauseDuration = 0.1 // Very short pause between beeps for faster rhythm
    
    frequencies.forEach((freq, index) => {
      const oscillator: OscillatorNode = ctx.createOscillator()
      const gainNode: GainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.frequency.value = freq
      oscillator.type = 'sine'
      
      const startTime = ctx.currentTime + (index * 0.15) // Stagger the frequencies slightly
      const endTime = startTime + playDuration
      
      // Create beeping pattern - consistent fast beeps
      const beepInterval = beepDuration + pauseDuration // Total time per beep cycle
      let beepStart = startTime
      let beepIndex = 0
      
      while (beepStart < endTime) {
        const beepEnd = beepStart + beepDuration
        
        // Quick fade in and out for crisp beeps
        gainNode.gain.setValueAtTime(0, beepStart)
        gainNode.gain.linearRampToValueAtTime(0.5, beepStart + 0.02) // Quick fade in
        gainNode.gain.setValueAtTime(0.5, beepStart + 0.02)
        gainNode.gain.linearRampToValueAtTime(0, beepEnd - 0.02) // Quick fade out
        
        beepIndex++
        beepStart = startTime + (beepIndex * beepInterval)
      }
      
      oscillator.start(startTime)
      oscillator.stop(endTime)
    })
    
    console.log('✅ Alarm sound played successfully')
  } catch (error) {
    console.error('Failed to play alarm sound with Web Audio API:', error)
    playFallbackAlarm()
  }
}

/**
 * Fallback alarm using HTML5 Audio (more reliable but simpler sound)
 */
function playFallbackAlarm(): void {
  try {
    // Create a simple beep using Audio API
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator: OscillatorNode = ctx.createOscillator()
    const gainNode: GainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    // Play longer beeps
    [800, 1000, 1200].forEach((freq, i) => {
      setTimeout(() => {
        const osc: OscillatorNode = ctx.createOscillator()
        const gain: GainNode = ctx.createGain()
        
        osc.connect(gain)
        gain.connect(ctx.destination)
        
        osc.frequency.value = freq
        osc.type = 'sine'
        
        gain.gain.setValueAtTime(0, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2)
        
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.2)
      }, i * 300)
    })
    
    console.log('✅ Fallback alarm sound played')
  } catch (error) {
    console.error('Failed to play fallback alarm:', error)
  }
}

/**
 * Test the alarm sound (for debugging)
 */
export function testAlarmSound(): void {
  console.log('Testing alarm sound...')
  playAlarmSound(false)
}

/**
 * Play a subtle notification sound (for less urgent alerts)
 */
export function playNotificationSound(isMuted: boolean = false): void {
  if (isMuted || typeof window === 'undefined') return

  const ctx = initAudioContext()
  if (!ctx) return

  try {
    const oscillator: OscillatorNode = ctx.createOscillator()
    const gainNode: GainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    oscillator.frequency.value = 600
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1)
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
    
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
    
  } catch (error) {
    console.error('Failed to play notification sound:', error)
  }
}
