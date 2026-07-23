const PREFERRED_VOICE_NAMES = ["Microsoft Aria", "Microsoft Jenny", "Google US English", "Samantha", "Ava", "Karen", "Moira"];
let activeAudio: HTMLAudioElement | undefined;
let speechRequest = 0;

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  return PREFERRED_VOICE_NAMES.map((name) => voices.find((voice) => voice.name.includes(name))).find(Boolean) ?? voices.find((voice) => voice.localService) ?? voices[0];
}

export async function speak(text: string): Promise<boolean> {
  const request = ++speechRequest;
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (response.ok && response.headers.get("content-type")?.includes("audio/")) {
      const audio = new Audio(URL.createObjectURL(await response.blob()));
      activeAudio = audio;
      audio.onended = () => { URL.revokeObjectURL(audio.src); if (activeAudio === audio) activeAudio = undefined; };
      if (request === speechRequest) await audio.play();
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
  if (activeAudio) {
    activeAudio.pause();
    URL.revokeObjectURL(activeAudio.src);
    activeAudio = undefined;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
