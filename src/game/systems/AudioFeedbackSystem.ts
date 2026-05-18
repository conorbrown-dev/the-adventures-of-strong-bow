import Phaser from "phaser";

import { getConfiguredSfxVolume } from "../settings/parentalSettings";
import { ASSET_KEYS } from "../utils/assetKeys";

const CORRECT_FEEDBACK_VOICE_KEYS = [
  ASSET_KEYS.WAY_TO_GO,
  ASSET_KEYS.SUPERB,
  ASSET_KEYS.GREAT_JOB_MOLLY,
  ASSET_KEYS.EXCELLENT
] as const;

interface SpeakOptions {
  rate?: number;
  pitch?: number;
}

export class AudioFeedbackSystem {
  private audioContext?: AudioContext;
  private currentWord?: string;
  private currentWordVoiceKey?: string;
  private activeVoiceSound?: Phaser.Sound.BaseSound;
  private voiceSequenceToken = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroy();
    });
  }

  setCurrentWord(word: string, voiceAssetKey?: string): void {
    this.currentWord = word;
    this.currentWordVoiceKey = voiceAssetKey;
  }

  async speakCurrentWord(): Promise<void> {
    if (!this.currentWord) {
      return;
    }

    const token = this.beginVoiceSequence();

    if (this.currentWordVoiceKey) {
      await this.playVoiceClipInternal(
        ASSET_KEYS.FIND_THE_FOSSIL_FOR,
        {
          volume: 0.9
        },
        token
      );
      if (!this.isVoiceSequenceCurrent(token)) {
        return;
      }
      await this.playVoiceClipInternal(
        this.currentWordVoiceKey,
        {
          volume: 0.9
        },
        token
      );
      return;
    }

    await this.speak(this.currentWord, { rate: 0.78, pitch: 1.08 }, token);
  }

  async speakPhrase(text: string, options: SpeakOptions = {}): Promise<void> {
    if (!text) {
      return;
    }

    await this.speak(text, options, this.beginVoiceSequence());
  }

  async playCorrectFeedback(): Promise<void> {
    this.ensureAudioContext();
    this.playToneSequence([
      { frequency: 460, duration: 0.08, type: "sine" },
      { frequency: 620, duration: 0.1, type: "triangle" },
      { frequency: 820, duration: 0.14, type: "sine" }
    ]);

    await this.wait(120);
    await this.playVoiceClipInternal(
      Phaser.Utils.Array.GetRandom([...CORRECT_FEEDBACK_VOICE_KEYS]) ??
        CORRECT_FEEDBACK_VOICE_KEYS[0],
      {
        volume: 0.9
      },
      this.beginVoiceSequence()
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

  playShovelClink(): void {
    this.scene.sound.play(ASSET_KEYS.SHOVEL_CLINK, {
      volume: 0.55 * getConfiguredSfxVolume()
    });
  }

  playDigging(): void {
    this.scene.sound.play(ASSET_KEYS.DIGGING, {
      volume: 0.5 * getConfiguredSfxVolume()
    });
  }

  playFossilDiscovered(): void {
    this.scene.sound.play(ASSET_KEYS.FOSSIL_DISCOVERED, {
      volume: 0.65 * getConfiguredSfxVolume()
    });
  }

  async playVoiceClip(
    key: string,
    config: Phaser.Types.Sound.SoundConfig = {}
  ): Promise<void> {
    await this.playVoiceClipInternal(key, config, this.beginVoiceSequence());
  }

  private async playVoiceClipInternal(
    key: string,
    config: Phaser.Types.Sound.SoundConfig,
    token: number
  ): Promise<void> {
    if (!this.isVoiceSequenceCurrent(token)) {
      return;
    }

    this.stopActiveVoiceSound();
    await new Promise<void>((resolve) => {
      const sound = this.scene.sound.add(key, config);
      this.activeVoiceSound = sound;
      const finish = (): void => {
        if (this.activeVoiceSound === sound) {
          this.activeVoiceSound = undefined;
        }
        sound.destroy();
        resolve();
      };

      sound.once("complete", finish);
      sound.once("destroy", resolve);
      sound.play(config);
    });
  }

  private async speak(
    text: string,
    options: SpeakOptions = {},
    token = this.beginVoiceSequence()
  ): Promise<void> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    this.stopActiveVoiceSound();
    window.speechSynthesis.cancel();

    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? 0.86;
      utterance.pitch = options.pitch ?? 1;
      utterance.volume = 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      if (!this.isVoiceSequenceCurrent(token)) {
        resolve();
        return;
      }
      window.speechSynthesis.speak(utterance);
    });
  }

  private beginVoiceSequence(): number {
    this.voiceSequenceToken += 1;
    this.stopActiveVoiceSound();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    return this.voiceSequenceToken;
  }

  private isVoiceSequenceCurrent(token: number): boolean {
    return token === this.voiceSequenceToken;
  }

  private stopActiveVoiceSound(): void {
    if (!this.activeVoiceSound) {
      return;
    }

    const sound = this.activeVoiceSound;
    this.activeVoiceSound = undefined;
    if (sound.isPlaying) {
      sound.stop();
    }
    sound.destroy();
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

    const sfxVolume = getConfiguredSfxVolume();
    let startTime = this.audioContext.currentTime;

    steps.forEach((step) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      oscillator.type = step.type;
      oscillator.frequency.setValueAtTime(step.frequency, startTime);

      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, 0.12 * sfxVolume),
        startTime + 0.01
      );
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
