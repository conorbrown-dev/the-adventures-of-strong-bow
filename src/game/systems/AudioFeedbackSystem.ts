import Phaser from "phaser";

const AFFIRMATIONS = [
  "Great job!",
  "You got it!",
  "Clever girl!",
  "Nice work!",
  "That is right!"
] as const;

interface SpeakOptions {
  rate?: number;
  pitch?: number;
}

export class AudioFeedbackSystem {
  private audioContext?: AudioContext;
  private currentWord?: string;

  constructor(private readonly scene: Phaser.Scene) {
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroy();
    });
  }

  setCurrentWord(word: string): void {
    this.currentWord = word;
  }

  async speakCurrentWord(): Promise<void> {
    if (!this.currentWord) {
      return;
    }

    await this.speak(this.currentWord, { rate: 0.78, pitch: 1.08 });
  }

  async playCorrectFeedback(): Promise<void> {
    this.ensureAudioContext();
    this.playToneSequence([
      { frequency: 460, duration: 0.08, type: "sine" },
      { frequency: 620, duration: 0.1, type: "triangle" },
      { frequency: 820, duration: 0.14, type: "sine" }
    ]);

    await this.wait(120);
    await this.speak(
      AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)],
      {
      rate: 0.94,
      pitch: 1.16
      }
    );
  }

  playIncorrectFeedback(): void {
    this.ensureAudioContext();
    this.playToneSequence([
      { frequency: 220, duration: 0.06, type: "sawtooth" },
      { frequency: 180, duration: 0.07, type: "square" },
      { frequency: 130, duration: 0.09, type: "triangle" }
    ]);
  }

  private async speak(text: string, options: SpeakOptions = {}): Promise<void> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? 0.86;
      utterance.pitch = options.pitch ?? 1;
      utterance.volume = 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  private ensureAudioContext(): void {
    if (typeof window === "undefined") {
      return;
    }

    if (!this.audioContext) {
      const AudioContextCtor = window.AudioContext ?? (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

      if (!AudioContextCtor) {
        return;
      }

      this.audioContext = new AudioContextCtor();
    }

    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }
  }

  private playToneSequence(
    steps: Array<{
      frequency: number;
      duration: number;
      type: OscillatorType;
    }>
  ): void {
    if (!this.audioContext) {
      return;
    }

    let startTime = this.audioContext.currentTime;

    steps.forEach((step) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      oscillator.type = step.type;
      oscillator.frequency.setValueAtTime(step.frequency, startTime);

      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.12, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        startTime + step.duration
      );

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + step.duration);

      startTime += step.duration * 0.92;
    });
  }

  private wait(duration: number): Promise<void> {
    return new Promise((resolve) => {
      this.scene.time.delayedCall(duration, () => resolve());
    });
  }

  private destroy(): void {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }
}
