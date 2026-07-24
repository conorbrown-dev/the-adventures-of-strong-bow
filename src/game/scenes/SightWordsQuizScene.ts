import Phaser from "phaser";

import { type SightWord } from "../data/sightWords";
import { loadSightWordSettings, loadSightWordStats, recordSightWordAttempt, RESPONSE_THRESHOLD_MS } from "../settings/sightWordSettings";
import { AudioFeedbackSystem } from "../systems/AudioFeedbackSystem";
import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { addGameNavigation, returnToLearningLibrary } from "../utils/gameNavigation";
import { SCENE_KEYS } from "../utils/sceneKeys";

type BrowserRecognition = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start(): void; abort(): void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};
type BrowserRecognitionConstructor = new () => BrowserRecognition;

export class SightWordsQuizScene extends Phaser.Scene {
  private audio!: AudioFeedbackSystem;
  private words: SightWord[] = [];
  private currentWord?: SightWord;
  private wordText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private timerFill?: Phaser.GameObjects.Rectangle;
  private promptStartedAt = 0;
  private listening = false;
  private microphoneGranted = false;
  private recognition?: BrowserRecognition;
  private finished = false;
  private attemptId = 0;

  constructor() { super(SCENE_KEYS.SIGHT_WORDS_QUIZ); }

  create(): void {
    const settings = loadSightWordSettings();
    const stats = loadSightWordStats();
    this.words = Phaser.Utils.Array.Shuffle([...settings.selectedWords.filter((word) => !stats[word]?.mastered)]);
    this.audio = new AudioFeedbackSystem(this);
    this.cameras.main.setBackgroundColor(0x0a0714);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0714);
    for (let index = 0; index < 55; index += 1) this.add.circle(Phaser.Math.Between(15, GAME_WIDTH - 15), Phaser.Math.Between(15, GAME_HEIGHT - 15), Phaser.Math.Between(1, 2), 0xffffff, Phaser.Math.FloatBetween(0.12, 0.4));
    this.add.text(GAME_WIDTH / 2, 100, "SIGHT WORD QUIZ", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "34px", color: "#ffffff", letterSpacing: 2 }).setOrigin(0.5);
    this.wordText = this.add.text(GAME_WIDTH / 2, 360, "", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "130px", color: "#ffe45c" }).setOrigin(0.5);
    this.statusText = this.add.text(GAME_WIDTH / 2, 505, "", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "25px", color: "#c5b5df", align: "center" }).setOrigin(0.5);
    this.add.rectangle(GAME_WIDTH / 2, 590, 560, 22, 0x251a3e).setStrokeStyle(2, 0xc681ff);
    this.timerFill = this.add.rectangle(GAME_WIDTH / 2 - 278, 590, 0, 16, 0x45f6e5).setOrigin(0, 0.5);
    this.timerText = this.add.text(GAME_WIDTH / 2, 635, "", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "23px", color: "#ffffff" }).setOrigin(0.5);
    addGameNavigation(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.recognition?.abort());
    if (!this.words.length) this.showFinished(); else void this.presentNextWord();
  }

  update(): void {
    if (!this.listening || !this.promptStartedAt) return;
    const elapsed = this.time.now - this.promptStartedAt;
    const remaining = Math.max(0, 7000 - elapsed);
    this.timerFill?.setDisplaySize(560 * remaining / 7000, 16).setFillStyle(remaining <= RESPONSE_THRESHOLD_MS ? 0xff70b8 : 0x45f6e5);
    this.timerText?.setText(`${(remaining / 1000).toFixed(1)} seconds`);
  }

  private async presentNextWord(): Promise<void> {
    this.currentWord = this.words.shift();
    if (!this.currentWord) { this.showFinished(); return; }
    this.wordText?.setText(this.currentWord).setAlpha(0).setScale(0.8);
    this.tweens.add({ targets: this.wordText, alpha: 1, scale: 1, duration: 240, ease: "Back.Out" });
    this.statusText?.setText("Read the word aloud when you hear the prompt.").setColor("#c5b5df");
    await this.audio.speakPhrase("Read the word aloud.", { rate: 0.84, pitch: 1.04 });
    if (this.finished || !this.currentWord) return;
    if (!await this.requestMicrophone()) { this.statusText?.setText("Please allow microphone access to practice sight words.").setColor("#ffb86b"); return; }
    this.startListening(this.currentWord);
  }

  private async requestMicrophone(): Promise<boolean> {
    if (this.microphoneGranted) return true;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      this.microphoneGranted = true;
      return true;
    } catch { return false; }
  }

  private startListening(word: SightWord): void {
    const recognitionWindow = window as typeof window & { SpeechRecognition?: BrowserRecognitionConstructor; webkitSpeechRecognition?: BrowserRecognitionConstructor; };
    const Recognition = recognitionWindow.SpeechRecognition ?? recognitionWindow.webkitSpeechRecognition;
    if (!Recognition) { this.statusText?.setText("Speech recognition is not available in this browser.").setColor("#ffb86b"); return; }
    const recognition = new Recognition(); this.recognition = recognition;
    recognition.lang = "en-US"; recognition.interimResults = false; recognition.continuous = false; recognition.maxAlternatives = 3;
    const attemptId = ++this.attemptId;
    this.promptStartedAt = this.time.now; this.listening = true;
    recognition.onresult = (event) => {
      const heard = Array.from(event.results[event.resultIndex], (alternative) => alternative.transcript.toLowerCase().match(/[a-z]+/g) ?? []).flat();
      this.finishAttempt(word, heard.includes(word), attemptId);
    };
    recognition.onerror = () => this.finishAttempt(word, false, attemptId);
    recognition.onend = () => { if (this.listening && this.attemptId === attemptId) this.finishAttempt(word, false, attemptId); };
    this.time.delayedCall(7000, () => { if (this.listening && this.attemptId === attemptId) { recognition.abort(); this.finishAttempt(word, false, attemptId); } });
    try { recognition.start(); } catch { this.finishAttempt(word, false, attemptId); }
  }

  private finishAttempt(word: SightWord, correct: boolean, attemptId: number): void {
    if (!this.listening || this.attemptId !== attemptId) return;
    this.listening = false;
    this.recognition = undefined;
    const responseMs = Math.max(1, this.time.now - this.promptStartedAt);
    const stats = recordSightWordAttempt(word, responseMs, correct);
    const seconds = (responseMs / 1000).toFixed(1);
    if (correct) {
      this.statusText?.setText(stats.mastered ? `Mastered! ${seconds}s — this word will now rotate out.` : `Correct! ${seconds}s`).setColor("#45f6e5");
      void this.audio.playCorrectFeedback();
    } else {
      this.statusText?.setText(`Try again next time. Response: ${seconds}s`).setColor("#ff70b8");
      this.audio.playIncorrectFeedback();
    }
    this.time.delayedCall(1200, () => void this.presentNextWord());
  }

  private showFinished(): void {
    this.finished = true; this.listening = false;
    this.wordText?.setText("Great work!").setFontSize(78).setColor("#45f6e5");
    this.statusText?.setText("This practice pool is complete. Return to the game menu to choose another activity.").setColor("#ffffff");
    this.timerFill?.setDisplaySize(0, 16); this.timerText?.setText("");
    const button = this.add.rectangle(GAME_WIDTH / 2, 650, 250, 56, 0xc681ff).setStrokeStyle(2, 0xffffff, 0.8);
    const label = this.add.text(GAME_WIDTH / 2, 650, "GAME MENU", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "19px", color: "#ffffff" }).setOrigin(0.5);
    this.add.zone(GAME_WIDTH / 2, 650, 250, 56).setInteractive({ useHandCursor: true }).on("pointerdown", () => returnToLearningLibrary(this));
    void button; void label;
  }
}
