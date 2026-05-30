/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio synthesizer for mining sound effects.
// Lazily created upon first interaction to bypass browser autoplay blocks.
let audioCtx: AudioContext | null = null;
let isMutedRef = false;

function getAudioContext(): AudioContext | null {
  if (isMutedRef) return null;
  if (!audioCtx) {
    // Standard cross-browser AudioContext initialization
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setMuteState(muted: boolean) {
  isMutedRef = muted;
  if (muted && audioCtx) {
    audioCtx.suspend();
  } else if (!muted && audioCtx) {
    audioCtx.resume();
  }
}

export function getMuteState() {
  return isMutedRef;
}

// Satisfying light metal/stone tap
export function playClickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

// Heavy rock/mineral drop sound
export function playDropSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);

  osc2.type = "sine";
  osc2.frequency.setValueAtTime(330, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);

  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc2.start();
  osc.stop(ctx.currentTime + 0.22);
  osc2.stop(ctx.currentTime + 0.22);
}

// Magical chime sound when merging ores. Higher levels produce deeper, more resonant sounds.
export function playMergeSound(level: number) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const chime = ctx.createOscillator();
  const gain = ctx.createGain();

  // Root pitch descends/ascends beautifully
  const baseFreq = 160 + level * 42; 
  const chimeFreq = baseFreq * 1.5;

  osc.type = "triangle";
  osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, ctx.currentTime + 0.25);

  chime.type = "sine";
  chime.frequency.setValueAtTime(chimeFreq, ctx.currentTime);
  chime.frequency.exponentialRampToValueAtTime(chimeFreq * 2.1, ctx.currentTime + 0.3);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

  // Add low pass filter for heavier ores
  const filter = ctx.createBiquadFilter();
  filter.type = level > 5 ? "peaking" : "highpass";
  filter.frequency.setValueAtTime(500 + level * 100, ctx.currentTime);

  osc.connect(filter);
  chime.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  chime.start();
  osc.stop(ctx.currentTime + 0.35);
  chime.stop(ctx.currentTime + 0.35);
}

// Triumphant upgrades sound
export function playUpgradeSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C major arpeggio

  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + index * 0.08);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + index * 0.08 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + index * 0.08);
    osc.stop(now + index * 0.08 + 0.26);
  });
}

// Failure/crash sound for Game Over
export function playGameOverSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [392.00, 349.23, 311.13, 261.63]; // Descending sad scale

  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, now + index * 0.15);
    osc.frequency.linearRampToValueAtTime(freq - 40, now + index * 0.15 + 0.12);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + index * 0.15 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.15 + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + index * 0.15);
    osc.stop(now + index * 0.15 + 0.25);
  });
}

// Action sound for power-ups (bombs, magnet)
export function playPowerupSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(100, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(1500, ctx.currentTime + 0.5);

  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}
