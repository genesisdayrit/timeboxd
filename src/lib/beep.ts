/**
 * Audio beep utility using Web Audio API.
 * Generates a simple square wave beep sound for notifications.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

interface BeepOptions {
  /** Frequency in Hz (default: 880) */
  frequency?: number;
  /** Duration in milliseconds (default: 150) */
  duration?: number;
  /** Volume from 0 to 1 (default: 0.3) */
  volume?: number;
}

/**
 * Plays a square wave beep sound.
 * Uses Web Audio API to generate a retro 8-bit style beep.
 */
export async function playBeep(options: BeepOptions = {}): Promise<void> {
  const { frequency = 880, duration = 150, volume = 0.3 } = options;

  try {
    const ctx = getAudioContext();

    // Resume context if suspended (browsers require user interaction first)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    // Quick fade out at the end to avoid click
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (error) {
    console.error('Failed to play beep:', error);
  }
}
