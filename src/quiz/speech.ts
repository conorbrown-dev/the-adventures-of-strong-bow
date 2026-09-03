import shortAUrl from "../game/assets/audio/phonemes/a-near-open-front-unrounded-vowel.ogg?url";
import kUrl from "../game/assets/audio/phonemes/k-voiceless-velar-plosive.ogg?url";
import mUrl from "../game/assets/audio/phonemes/m-bilabial-nasal.ogg?url";
import nUrl from "../game/assets/audio/phonemes/n-alveolar-nasal.ogg?url";
import pUrl from "../game/assets/audio/phonemes/p-voiceless-bilabial-plosive.ogg?url";
import sUrl from "../game/assets/audio/phonemes/s-voiceless-alveolar-sibilant.ogg?url";
import tUrl from "../game/assets/audio/phonemes/t-voiceless-alveolar-plosive.ogg?url";

const PREFERRED_VOICE_NAMES = ["Microsoft Aria", "Microsoft Jenny", "Google US English", "Samantha", "Ava", "Karen", "Moira"];
let activeAudio: HTMLAudioElement | undefined;
let resolveActiveAudio: (() => void) | undefined;
let speechRequest = 0;
let pendingHoverSpeech: number | undefined;
const modelAudioCache = new Map<string, Blob>();
const pendingModelAudio = new Map<string, Promise<Blob | undefined>>();
export const CURRICULUM_CUE_IDS = [
  "phoneme.m.continuous",
  "phoneme.s.continuous",
  "phoneme.t.stop",
  "phoneme.p.stop",
  "phoneme.n.continuous",
  "phoneme.k.stop",
  "phoneme.a.short",
] as const;
export type CurriculumCueId = (typeof CURRICULUM_CUE_IDS)[number];

// These licensed IPA samples are a private-use bridge, not qualified curriculum recordings.
// A missing isolated phoneme must never fall through to model or browser TTS.
const curriculumCueSources: Readonly<Record<CurriculumCueId, string>> = {
  "phoneme.m.continuous": mUrl,
  "phoneme.s.continuous": sUrl,
  "phoneme.t.stop": tUrl,
  "phoneme.p.stop": pUrl,
  "phoneme.n.continuous": nUrl,
  "phoneme.k.stop": kUrl,
  "phoneme.a.short": shortAUrl,
};

function cacheModelAudio(text: string, audio: Blob): void {
  if (modelAudioCache.size >= 100) {
    const oldest = modelAudioCache.keys().next().value;
    if (oldest) modelAudioCache.delete(oldest);
  }
  modelAudioCache.set(text, audio);
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  return PREFERRED_VOICE_NAMES.map((name) => voices.find((voice) => voice.name.includes(name))).find(Boolean) ?? voices.find((voice) => voice.localService) ?? voices[0];
}

async function loadModelAudio(text: string): Promise<Blob | undefined> {
  const cached = modelAudioCache.get(text);
  if (cached) return cached;

  const pending = pendingModelAudio.get(text);
  if (pending) return pending;

  const request = fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  }).then(async (response) => {
    if (!response.ok || !response.headers.get("content-type")?.includes("audio/")) return undefined;
    const audio = await response.blob();
    cacheModelAudio(text, audio);
    return audio;
  }).catch(() => undefined).finally(() => pendingModelAudio.delete(text));

  pendingModelAudio.set(text, request);
  return request;
}

/** Preloads model speech for controls that are likely to be used next. */
export async function warmSpeech(texts: readonly string[]): Promise<void> {
  await Promise.all(texts.map((text) => loadModelAudio(text)));
}

/**
 * Announces a control only after hover settles, preventing rapid pointer
 * movement from creating a stream of competing labels.
 */
export function speakOnHover(text: string): void {
  if (pendingHoverSpeech !== undefined) window.clearTimeout(pendingHoverSpeech);
  stopSpeaking();
  pendingHoverSpeech = window.setTimeout(() => {
    pendingHoverSpeech = undefined;
    void speak(text);
  }, 180);
}

export async function speak(text: string): Promise<boolean> {
  const request = ++speechRequest;
  try {
    const blob = await loadModelAudio(text);
    if (blob) {
      stopActiveAudio();
      const audio = new Audio(URL.createObjectURL(blob));
      activeAudio = audio;
      const completed = new Promise<void>((resolve) => {
        resolveActiveAudio = resolve;
        audio.onended = () => {
          URL.revokeObjectURL(audio.src);
          if (activeAudio === audio) activeAudio = undefined;
          if (resolveActiveAudio === resolve) resolveActiveAudio = undefined;
          resolve();
        };
      });
      if (request !== speechRequest) return false;
      await audio.play();
      await completed;
      return true;
    }
  } catch {
    // Use the installed browser voice while the local service is unavailable.
  }
  if (!("speechSynthesis" in window) || request !== speechRequest) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = pickVoice() ?? null;
  utterance.lang = "en-US";
  utterance.rate = 0.82;
  utterance.pitch = 1.04;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  speechRequest += 1;
  if (pendingHoverSpeech !== undefined) {
    window.clearTimeout(pendingHoverSpeech);
    pendingHoverSpeech = undefined;
  }
  stopActiveAudio();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function isCurriculumCueAvailable(cueId: string): cueId is CurriculumCueId {
  return (CURRICULUM_CUE_IDS as readonly string[]).includes(cueId) && Boolean(curriculumCueSources[cueId as CurriculumCueId]);
}

export async function playCurriculumCue(cueId: CurriculumCueId): Promise<boolean> {
  const source = curriculumCueSources[cueId];
  if (!source) return false;
  stopSpeaking();
  const request = speechRequest;
  const audio = new Audio(source);
  activeAudio = audio;
  const completed = new Promise<void>((resolve) => {
    resolveActiveAudio = resolve;
    audio.onended = () => {
      if (activeAudio === audio) activeAudio = undefined;
      if (resolveActiveAudio === resolve) resolveActiveAudio = undefined;
      resolve();
    };
  });
  if (request !== speechRequest) return false;
  try {
    await audio.play();
    await completed;
    return true;
  } catch {
    if (activeAudio === audio) activeAudio = undefined;
    return false;
  }
}

function stopActiveAudio(): void {
  if (activeAudio) {
    activeAudio.pause();
    URL.revokeObjectURL(activeAudio.src);
    activeAudio = undefined;
  }
  resolveActiveAudio?.();
  resolveActiveAudio = undefined;
}
