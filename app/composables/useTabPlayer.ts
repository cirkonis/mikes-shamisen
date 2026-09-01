import { buildSchedule } from '#shared/tab'
import type { TabContent } from '#shared/tab'

/**
 * Rudimentary playback: schedule every note up front on the Web Audio clock,
 * then poll that clock to report which note is sounding, so the playhead
 * follows the audio rather than the audio following a JS timer.
 *
 * Polling on an interval rather than requestAnimationFrame on purpose: rAF is
 * throttled to nothing in a backgrounded or non-painting tab, where the audio
 * keeps going regardless — the playhead would silently freeze mid-piece.
 */
export function useTabPlayer() {
  const bpm = ref(90)
  const isPlaying = ref(false)
  const playingEventId = ref<string | null>(null)

  let ctx: AudioContext | null = null
  let sources: OscillatorNode[] = []
  let poll: ReturnType<typeof setInterval> | undefined

  /** A struck string: near-instant attack, then it just rings down. */
  function pluck(
    audio: AudioContext,
    master: GainNode,
    frequency: number,
    at: number,
    hold: number,
  ) {
    const ring = Math.max(hold, 0.28) * 1.7

    const body = audio.createOscillator()
    body.type = 'triangle'
    body.frequency.value = frequency

    const gain = audio.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.22, at + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + ring)

    // A brief bright transient for the bachi hitting the string.
    const attack = audio.createOscillator()
    attack.type = 'sawtooth'
    attack.frequency.value = frequency * 2
    const attackGain = audio.createGain()
    attackGain.gain.setValueAtTime(0.0001, at)
    attackGain.gain.exponentialRampToValueAtTime(0.05, at + 0.003)
    attackGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.09)

    body.connect(gain).connect(master)
    attack.connect(attackGain).connect(master)

    body.start(at)
    attack.start(at)
    body.stop(at + ring + 0.05)
    attack.stop(at + 0.12)

    sources.push(body, attack)
  }

  function stop() {
    clearInterval(poll)
    poll = undefined
    for (const source of sources) {
      try {
        source.stop()
      } catch {
        // Already finished on its own — nothing to stop.
      }
    }
    sources = []
    ctx?.close()
    ctx = null
    isPlaying.value = false
    playingEventId.value = null
  }

  async function play(content: TabContent, tuningId: string) {
    stop()
    const { notes, duration } = buildSchedule(content, tuningId, bpm.value)
    if (!notes.length) return

    // Created inside the click handler so the browser counts it as a gesture.
    ctx = new AudioContext()
    await ctx.resume()
    if (ctx.state !== 'running') {
      // Autoplay policy refused the gesture. Bail out rather than leave the UI
      // showing "Stop" over a clock that will never advance.
      stop()
      return
    }

    const master = ctx.createGain()
    // Chords stack up to three notes; leave headroom so they don't clip.
    master.gain.value = 0.8
    master.connect(ctx.destination)

    const origin = ctx.currentTime + 0.08
    for (const note of notes) {
      for (const frequency of note.frequencies) {
        pluck(ctx, master, frequency, origin + note.at, note.duration)
      }
    }

    isPlaying.value = true

    poll = setInterval(() => {
      if (!ctx) return
      const elapsed = ctx.currentTime - origin
      if (elapsed > duration + 0.4) return stop()
      const current = notes.findLast((n) => n.at <= elapsed)
      playingEventId.value =
        current && elapsed < current.at + current.duration ? current.eventId : null
    }, 40)
  }

  onScopeDispose(stop)

  return { bpm, isPlaying, playingEventId, play, stop }
}
