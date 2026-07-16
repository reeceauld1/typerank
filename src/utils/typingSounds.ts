// Typing keystroke sound: real recorded keyboard clicks (public/sounds/click/),
// decoded once and played back per keystroke via the Web Audio API so volume
// can be controlled with a GainNode without re-fetching/re-decoding.
const CLICK_SAMPLE_URLS = Array.from({ length: 6 }, (_, i) => `/sounds/click/click${i + 1}.wav`);

let audioCtx: AudioContext | null = null;
let buffersPromise: Promise<AudioBuffer[]> | null = null;
let lastIndex = -1;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') {
    // Browsers require a user gesture to start audio — a keydown counts,
    // but the context can still start out (or fall back into) suspended.
    void audioCtx.resume();
  }
  return audioCtx;
}

function loadBuffers(ctx: AudioContext): Promise<AudioBuffer[]> {
  if (!buffersPromise) {
    buffersPromise = Promise.all(
      CLICK_SAMPLE_URLS.map(async url => {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        return ctx.decodeAudioData(arrayBuffer);
      }),
    );
  }
  return buffersPromise;
}

// Cycles through the recorded samples at random, avoiding immediate repeats,
// so identical keys typed back-to-back don't sound like a robotic loop.
function pickIndex(count: number): number {
  if (count <= 1) return 0;
  let idx = Math.floor(Math.random() * count);
  if (idx === lastIndex) idx = (idx + 1) % count;
  lastIndex = idx;
  return idx;
}

// The recorded samples are already fairly loud (peak-normalized) — a full
// -6dB cut at 100% volume keeps the loudest setting from overpowering the
// rest of the UI.
const MAX_GAIN = 10 ** (-6 / 20);

// volume: 0-1
export function playTypingSound(volume: number): void {
  if (volume <= 0) return;
  const ctx = getContext();
  if (!ctx) return;

  loadBuffers(ctx)
    .then(buffers => {
      if (buffers.length === 0) return;
      const source = ctx.createBufferSource();
      source.buffer = buffers[pickIndex(buffers.length)];
      // Slight pitch jitter per hit so repeated keys don't sound identical.
      source.playbackRate.value = 0.97 + Math.random() * 0.06;

      const gain = ctx.createGain();
      gain.gain.value = volume * MAX_GAIN;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    })
    .catch(() => {
      // Sample fetch/decode failure shouldn't break typing — just skip the sound.
    });
}
