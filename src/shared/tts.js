// Groq TTS (Orpheus) with an automatic fallback to the browser's built-in speechSynthesis,
// so AEGIS is never left silent — missing/rejected key, network failure, or the Groq org
// not having accepted the model's terms yet at console.groq.com all degrade gracefully.
const DEFAULT_MODEL = 'canopylabs/orpheus-v1-english';
const DEFAULT_VOICE = 'troy'; // deep/warm male voice — closest match on Groq's own roster

let currentAudio = null;

async function speakGroq({ apiKey, text, voice, model, onStart, onEnd }) {
  const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      input: text,
      voice: voice || DEFAULT_VOICE,
      response_format: 'wav',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `TTS HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  await new Promise((resolve, reject) => {
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onplay = () => onStart && onStart();
    audio.onended = () => {
      onEnd && onEnd();
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      reject(new Error('Audio playback failed'));
    };
    audio.play().catch(reject);
  });
}

function speakBrowser(text, { onStart, onEnd, voicePredicate } = {}) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferred = (voicePredicate && voices.find(voicePredicate)) || voices.find((v) => v.lang === 'en-GB');
    if (preferred) u.voice = preferred;
    u.rate = 1.0;
    u.pitch = 0.9;
    u.onstart = () => onStart && onStart();
    u.onend = () => onEnd && onEnd();
    u.onerror = () => onEnd && onEnd();
    window.speechSynthesis.speak(u);
  } catch (e) {
    /* speech unavailable */
  }
}

export async function speak(text, { apiKey, voice, model, onStart, onEnd, voicePredicate } = {}) {
  if (apiKey) {
    try {
      await speakGroq({ apiKey, text, voice, model, onStart, onEnd });
      return;
    } catch (e) {
      console.warn('Groq TTS unavailable, falling back to browser speech:', e.message);
    }
  }
  speakBrowser(text, { onStart, onEnd, voicePredicate });
}

export function cancelSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}
