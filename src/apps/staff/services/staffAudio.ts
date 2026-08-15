// Modern Interactive Sound Engine for Tawla Staff Dashboard
// Generates crystal-clear melodic chords & chimes via Web Audio API (Zero external assets required)

class StaffSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Load persisted mute preference
    const saved = typeof window !== 'undefined' ? localStorage.getItem('tawla_staff_sound_muted') : null;
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }
  }

  private getContext(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch (e) {
      console.warn('AudioContext initialization warning:', e);
      return null;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('tawla_staff_sound_muted', String(this.isMuted));
    if (!this.isMuted) {
      this.play('click');
    }
    return this.isMuted;
  }

  public getMutedState(): boolean {
    return this.isMuted;
  }

  public play(type: 'new_order' | 'call_waiter' | 'bill' | 'delivery_order' | 'click' | 'success' | 'action') {
    if (this.isMuted) return;

    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const playTone = (
      freq: number,
      startOffset: number,
      duration: number,
      wave: OscillatorType = 'sine',
      gainLevel: number = 0.18
    ) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, now + startOffset);

        gain.gain.setValueAtTime(0.001, now + startOffset);
        gain.gain.exponentialRampToValueAtTime(gainLevel, now + startOffset + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + startOffset);
        osc.stop(now + startOffset + duration);
      } catch (e) {
        console.warn('PlayTone error:', e);
      }
    };

    switch (type) {
      case 'new_order':
        // Ascending Crystal Chime (A5 -> C#6 -> E6)
        playTone(880.00, 0, 0.25, 'sine', 0.22);
        playTone(1108.73, 0.09, 0.28, 'sine', 0.25);
        playTone(1318.51, 0.18, 0.45, 'triangle', 0.28);
        break;

      case 'call_waiter':
        // Warm dual-bell ding (G5 -> E6)
        playTone(783.99, 0, 0.22, 'sine', 0.22);
        playTone(1318.51, 0.10, 0.40, 'triangle', 0.24);
        break;

      case 'bill':
        // Pleasant Cash Chime (B5 -> D#6 -> F#6)
        playTone(987.77, 0, 0.15, 'sine', 0.20);
        playTone(1244.51, 0.08, 0.20, 'sine', 0.22);
        playTone(1479.98, 0.16, 0.38, 'triangle', 0.24);
        break;

      case 'delivery_order':
        // Vibrant Dynamic Alert (D5 -> G5 -> B5 -> D6)
        playTone(587.33, 0, 0.12, 'sine', 0.18);
        playTone(783.99, 0.07, 0.14, 'sine', 0.20);
        playTone(987.77, 0.14, 0.18, 'sine', 0.22);
        playTone(1174.66, 0.22, 0.35, 'triangle', 0.25);
        break;

      case 'success':
        // Positive resolution chime
        playTone(523.25, 0, 0.12, 'sine', 0.15); // C5
        playTone(659.25, 0.08, 0.15, 'sine', 0.18); // E5
        playTone(783.99, 0.16, 0.30, 'sine', 0.20); // G5
        break;

      case 'action':
        // Subtle operation feedback
        playTone(800.00, 0, 0.06, 'sine', 0.12);
        playTone(1200.00, 0.05, 0.08, 'sine', 0.10);
        break;

      case 'click':
      default:
        // Subtle soft UI tap
        playTone(1050.00, 0, 0.04, 'sine', 0.06);
        break;
    }
  }
}

export const staffAudio = new StaffSoundEngine();
