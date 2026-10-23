/**
 * Sonidos de Moka, sintetizados en el momento (Web Audio): no hay archivos
 * que descargar, así que también funcionan sin conexión. Están apagados hasta
 * que la persona los active; la preferencia se recuerda en este navegador.
 *
 * - moo: un "muuu" de caricatura (dos tonos que bajan, con vibrato y filtro).
 * - bell: la campanita (tres tonos que se apagan).
 * - munch: masticar (golpecitos de ruido filtrado).
 * - happy: dos notitas que suben (caricias).
 * - yawn: un suspiro suave al dormirse.
 */

const STORAGE_KEY = "kahy.3d-sound.v1";

export type MokaSound = "moo" | "bell" | "munch" | "happy" | "yawn";

let context: AudioContext | null = null;

export function soundEnabled() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function setSoundEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Sin almacenamiento: vale solo mientras la página siga abierta.
  }
  if (enabled) audio(); // Se crea con el clic que lo activa, como piden los navegadores.
}

function audio() {
  if (!context) {
    const Constructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return null;
    context = new Constructor();
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

function envelope(ctx: AudioContext, start: number, attack: number, hold: number, release: number, peak: number) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.setValueAtTime(peak, start + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
  return gain;
}

function moo(ctx: AudioContext, start: number) {
  const output = envelope(ctx, start, 0.08, 0.55, 0.35, 0.22);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(500, start);
  filter.frequency.linearRampToValueAtTime(950, start + 0.25);
  filter.frequency.linearRampToValueAtTime(600, start + 0.95);
  filter.Q.value = 6;
  const vibrato = ctx.createOscillator();
  const vibratoDepth = ctx.createGain();
  vibrato.frequency.value = 5.5;
  vibratoDepth.gain.value = 4;
  vibrato.connect(vibratoDepth);
  for (const [type, detune] of [["sawtooth", 0], ["triangle", 7]] as const) {
    const oscillator = ctx.createOscillator();
    oscillator.type = type;
    oscillator.detune.value = detune;
    oscillator.frequency.setValueAtTime(175, start);
    oscillator.frequency.linearRampToValueAtTime(205, start + 0.2);
    oscillator.frequency.exponentialRampToValueAtTime(130, start + 1);
    vibratoDepth.connect(oscillator.frequency);
    oscillator.connect(filter);
    oscillator.start(start);
    oscillator.stop(start + 1.05);
  }
  vibrato.start(start);
  vibrato.stop(start + 1.05);
  filter.connect(output).connect(ctx.destination);
}

function bell(ctx: AudioContext, start: number) {
  for (const [frequency, peak, decay] of [[1568, 0.09, 0.9], [2349, 0.05, 0.6], [3951, 0.03, 0.35]]) {
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    const gain = envelope(ctx, start, 0.005, 0, decay, peak);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + decay + 0.05);
  }
}

function munch(ctx: AudioContext, start: number) {
  const length = Math.floor(ctx.sampleRate * 0.07);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index++) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
  for (let bite = 0; bite < 5; bite++) {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900 + bite * 120;
    filter.Q.value = 1.5;
    const gain = ctx.createGain();
    gain.gain.value = 0.18;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(start + 0.55 + bite * 0.33);
  }
}

function notes(ctx: AudioContext, start: number, frequencies: number[], gap: number, peak: number) {
  frequencies.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    const at = start + index * gap;
    const gain = envelope(ctx, at, 0.01, 0.05, 0.18, peak);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.3);
  });
}

function yawn(ctx: AudioContext, start: number) {
  const oscillator = ctx.createOscillator();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(330, start);
  oscillator.frequency.exponentialRampToValueAtTime(180, start + 0.9);
  const gain = envelope(ctx, start, 0.2, 0.3, 0.5, 0.08);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + 1.05);
}

/** Toca un sonido si están activados. Nunca lanza error (si el navegador no tiene audio, no pasa nada). */
export function playSound(sound: MokaSound) {
  if (!soundEnabled()) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    const start = ctx.currentTime + 0.02;
    if (sound === "moo") {
      moo(ctx, start + 0.12);
      bell(ctx, start + 0.2);
    } else if (sound === "bell") bell(ctx, start);
    else if (sound === "munch") munch(ctx, start);
    else if (sound === "happy") notes(ctx, start, [880, 1175], 0.11, 0.07);
    else yawn(ctx, start);
  } catch {
    // Sin audio disponible.
  }
}
