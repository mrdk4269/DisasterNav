/**
 * Web Audio API based Alert Sound Generator
 * Compliant with browser autoplay policy:
 * Resumes audio context seamlessly upon user gesture and provides realistic 1-2s emergency chime/siren.
 */

let audioCtx = null;
let soundEnabled = false;
let userHasInteracted = false;

// Listen to user's first window interaction to unlock audio policy
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    userHasInteracted = true;
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  };
  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
}

export function hasUserInteracted() {
  return userHasInteracted;
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  if (enabled && !audioCtx) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } catch (e) {
      console.warn('Web Audio not supported:', e);
    }
  }
}

/**
 * Plays short (1-2s) tactical emergency alert siren/sonar
 * Guaranteed to only play if enabled and once per event.
 */
export function playAlertSound(type = 'warning') {
  if (!soundEnabled) return;

  try {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'critical' || type === 'siren') {
      // 1.4s tactical two-tone warble emergency siren
      osc.type = 'sawtooth';
      
      // Sweep between 800Hz and 520Hz over 1.4 seconds
      osc.frequency.setValueAtTime(840, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.35);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.7);
      osc.frequency.exponentialRampToValueAtTime(560, now + 1.05);
      osc.frequency.exponentialRampToValueAtTime(800, now + 1.4);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.setValueAtTime(0.25, now + 1.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);

      osc.start(now);
      osc.stop(now + 1.45);
    } else {
      // 1.0s clean sonar telemetry double-ping
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.25); // B5

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      osc.start(now);
      osc.stop(now + 0.85);
    }
  } catch (err) {
    console.warn('Could not play alert audio:', err);
  }
}
