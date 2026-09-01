import Phaser from "phaser";

import { warmSpeech } from "../../quiz/speech";
import { sightWords, type SightWord } from "../data/sightWords";
import { recordSightWordAttempt, RESPONSE_THRESHOLD_MS } from "../settings/sightWordSettings";
import { AudioFeedbackSystem } from "../systems/AudioFeedbackSystem";
import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { addGameNavigation, returnToLearningLibrary } from "../utils/gameNavigation";
import { SCENE_KEYS } from "../utils/sceneKeys";
import { playButtonClick, playButtonHover } from "../utils/uiSound";

type BrowserRecognition = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start(): void; abort(): void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};
type BrowserRecognitionConstructor = new () => BrowserRecognition;

function getCorrectionPrompt(word: SightWord): string {
  return `The word is ${word}.`;
}

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
  private isAwaitingChoice = false;
  private actionButtons: Array<{ container: Phaser.GameObjects.Container; zone: Phaser.GameObjects.Zone }> = [];
  private fallbackUi?: { root: HTMLDivElement; word: HTMLHeadingElement; status: HTMLParagraphElement; timer: HTMLDivElement; timerFill: HTMLDivElement; repeat: HTMLButtonElement; continue: HTMLButtonElement };

  constructor() { super(SCENE_KEYS.SIGHT_WORDS_QUIZ); }

  create(): void {
    this.finished = false;
    this.isAwaitingChoice = false;
    this.actionButtons = [];
    this.words = Phaser.Utils.Array.Shuffle([...sightWords]);
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
    this.createActionButton(GAME_WIDTH / 2 - 175, 700, "REPEAT WORD  (R)", 0xc681ff, () => void this.repeatWord());
    this.createActionButton(GAME_WIDTH / 2 + 175, 700, "CONTINUE  (ENTER)", 0x45f6e5, () => void this.continueToNextWord());
    this.setActionButtonsVisible(false);
    this.createFallbackUi();
    addGameNavigation(this);
    const repeatHandler = (): void => { if (this.isAwaitingChoice) void this.repeatWord(); };
    const continueHandler = (): void => { if (this.isAwaitingChoice) void this.continueToNextWord(); };
    this.input.keyboard?.on("keydown-R", repeatHandler);
    this.input.keyboard?.on("keydown-ENTER", continueHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.finished = true;
      this.listening = false;
      this.attemptId += 1;
      this.recognition?.abort();
      this.input.keyboard?.off("keydown-R", repeatHandler);
      this.input.keyboard?.off("keydown-ENTER", continueHandler);
    });
    void this.presentNextWord();
  }

  update(): void {
    if (!this.listening || !this.promptStartedAt) return;
    const elapsed = this.time.now - this.promptStartedAt;
    const remaining = Math.max(0, 7000 - elapsed);
    this.timerFill?.setDisplaySize(560 * remaining / 7000, 16).setFillStyle(remaining <= RESPONSE_THRESHOLD_MS ? 0xff70b8 : 0x45f6e5);
    this.timerText?.setText(`${(remaining / 1000).toFixed(1)} seconds`);
    if (this.fallbackUi) {
      this.fallbackUi.timer.textContent = `${(remaining / 1000).toFixed(1)} seconds`;
      this.fallbackUi.timerFill.style.width = `${remaining / 70}%`;
      this.fallbackUi.timerFill.style.background = remaining <= RESPONSE_THRESHOLD_MS ? "#ff70b8" : "#45f6e5";
    }
  }

  private async presentNextWord(): Promise<void> {
    if (!this.words.length) this.words = Phaser.Utils.Array.Shuffle([...sightWords]);
    this.currentWord = this.words.shift();
    if (!this.currentWord) return;
    await this.presentWord(this.currentWord);
  }

  private async presentWord(word: SightWord): Promise<void> {
    this.isAwaitingChoice = false;
    this.setActionButtonsVisible(false);
    this.timerFill?.setDisplaySize(0, 16).setFillStyle(0x45f6e5);
    this.timerText?.setText("");
    this.setFallbackTimer("", 0);
    this.wordText?.setText(word).setAlpha(0).setScale(0.8);
    this.setFallbackWord(word, "#ffe45c");
    this.tweens.add({ targets: this.wordText, alpha: 1, scale: 1, duration: 240, ease: "Back.Out" });
    this.setStatus("Read the word aloud when you hear the prompt.", "#c5b5df");
    await this.audio.speakPhrase("Read the word aloud.");
    if (this.finished || this.currentWord !== word) return;
    if (!await this.requestMicrophone()) { this.setStatus("Please allow microphone access to practice sight words.", "#ffb86b"); return; }
    if (this.finished || this.currentWord !== word) return;
    this.startListening(word);
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
    if (!Recognition) { this.setStatus("Speech recognition is not available in this browser.", "#ffb86b"); return; }
    const recognition = new Recognition(); this.recognition = recognition;
    recognition.lang = "en-US"; recognition.interimResults = false; recognition.continuous = false; recognition.maxAlternatives = 3;
    const attemptId = ++this.attemptId;
    this.promptStartedAt = this.time.now; this.listening = true;
    const nextWord = this.words[0];
    warmSpeech([getCorrectionPrompt(word), ...(nextWord ? [getCorrectionPrompt(nextWord)] : [])]);
    recognition.onresult = (event) => {
      const heard = Array.from(event.results[event.resultIndex], (alternative) => alternative.transcript.toLowerCase().match(/[a-z]+/g) ?? []).flat();
      void this.finishAttempt(word, heard.includes(word), attemptId);
    };
    recognition.onerror = () => { void this.finishAttempt(word, false, attemptId); };
    recognition.onend = () => { if (this.listening && this.attemptId === attemptId) void this.finishAttempt(word, false, attemptId); };
    this.time.delayedCall(7000, () => { if (this.listening && this.attemptId === attemptId) void this.finishAttempt(word, false, attemptId); });
    try { recognition.start(); } catch { void this.finishAttempt(word, false, attemptId); }
  }

  private async finishAttempt(word: SightWord, correct: boolean, attemptId: number): Promise<void> {
    if (!this.listening || this.attemptId !== attemptId) return;
    this.listening = false;
    const recognition = this.recognition;
    this.recognition = undefined;
    try { recognition?.abort(); } catch { /* Recognition may already have ended. */ }
    const responseMs = Math.max(1, this.time.now - this.promptStartedAt);
    const stats = recordSightWordAttempt(word, responseMs, correct);
    const seconds = (responseMs / 1000).toFixed(1);
    this.timerFill?.setDisplaySize(0, 16);
    this.timerText?.setText("Answer checked");
    this.setFallbackTimer("Answer checked", 0);
    if (correct) {
      this.setStatus(stats.mastered ? `Mastered! ${seconds}s — keep practicing!` : `Correct! ${seconds}s`, "#45f6e5");
      this.audio.playCorrectChime();
    } else {
      this.setStatus(`Not quite. Listen: the word is “${word}.”`, "#ff70b8");
      this.audio.playIncorrectFeedback();
      await new Promise<void>((resolve) => this.time.delayedCall(350, resolve));
      if (this.finished || this.attemptId !== attemptId) return;
      await this.audio.speakPhrase(getCorrectionPrompt(word));
    }
    if (this.finished || this.attemptId !== attemptId) return;
    this.isAwaitingChoice = true;
    this.setActionButtonsVisible(true);
  }

  private async repeatWord(): Promise<void> {
    if (!this.isAwaitingChoice || !this.currentWord) return;
    playButtonClick(this);
    await this.presentWord(this.currentWord);
  }

  private async continueToNextWord(): Promise<void> {
    if (!this.isAwaitingChoice) return;
    playButtonClick(this);
    await this.presentNextWord();
  }

  private setFallbackWord(word: string, color: string): void {
    if (!this.fallbackUi) return;
    this.fallbackUi.word.textContent = word;
    this.fallbackUi.word.style.color = color;
  }

  private setStatus(text: string, color: string): void {
    this.statusText?.setText(text).setColor(color);
    if (!this.fallbackUi) return;
    this.fallbackUi.status.textContent = text;
    this.fallbackUi.status.style.color = color;
  }

  private setFallbackTimer(text: string, widthPercent: number): void {
    if (!this.fallbackUi) return;
    this.fallbackUi.timer.textContent = text;
    this.fallbackUi.timerFill.style.width = `${widthPercent}%`;
  }

  private createActionButton(x: number, y: number, label: string, color: number, action: () => void): void {
    const background = this.add.rectangle(0, 0, 300, 58, 0x160f28).setStrokeStyle(3, color);
    const text = this.add.text(0, 0, label, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "19px", color: "#ffffff" }).setOrigin(0.5);
    const container = this.add.container(x, y, [background, text]);
    const zone = this.add.zone(x, y, 300, 58)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => { playButtonHover(this); background.setFillStyle(color, 0.3); container.setScale(1.04); })
      .on("pointerout", () => { background.setFillStyle(0x160f28); container.setScale(1); })
      .on("pointerup", action);
    this.actionButtons.push({ container, zone });
  }

  private setActionButtonsVisible(isVisible: boolean): void {
    this.actionButtons.forEach(({ container, zone }) => {
      container.setVisible(isVisible);
      zone.setVisible(isVisible);
      if (isVisible) zone.setInteractive({ useHandCursor: true });
      else zone.disableInteractive();
    });
    if (!this.fallbackUi) return;
    this.fallbackUi.repeat.hidden = !isVisible;
    this.fallbackUi.continue.hidden = !isVisible;
    this.fallbackUi.repeat.disabled = !isVisible;
    this.fallbackUi.continue.disabled = !isVisible;
    if (isVisible) this.fallbackUi.continue.focus();
  }

  private createFallbackUi(): void {
    document.querySelector("#sight-word-studio-fallback")?.remove();
    const root = document.createElement("div");
    root.id = "sight-word-studio-fallback";
    root.style.cssText = "position:fixed;inset:0;z-index:5;display:grid;place-content:center;justify-items:center;gap:18px;padding:32px;background:radial-gradient(circle at 50% 20%,#211735,#0a0714 58%);color:#fff;text-align:center;font-family:Arial Black,Trebuchet MS,sans-serif";
    const title = document.createElement("p"); title.textContent = "SIGHT WORD QUIZ"; title.style.cssText = "margin:0;font-size:clamp(28px,4vw,48px);letter-spacing:.12em";
    const word = document.createElement("h1"); word.style.cssText = "margin:32px 0 0;font-size:clamp(76px,15vw,160px);line-height:1";
    const status = document.createElement("p"); status.style.cssText = "max-width:700px;margin:0;font:500 clamp(20px,2.5vw,30px)/1.4 Trebuchet MS,sans-serif;color:#c5b5df";
    const meter = document.createElement("div"); meter.style.cssText = "width:min(560px,80vw);height:22px;border:2px solid #c681ff;background:#251a3e";
    const timerFill = document.createElement("div"); timerFill.style.cssText = "height:100%;width:0;background:#45f6e5;transition:width .1s linear"; meter.append(timerFill);
    const timer = document.createElement("div"); timer.style.cssText = "min-height:28px;font-size:22px";
    const actions = document.createElement("div"); actions.style.cssText = "display:flex;flex-wrap:wrap;justify-content:center;gap:18px";
    const repeat = document.createElement("button"); repeat.type = "button"; repeat.textContent = "REPEAT WORD  (R)"; repeat.style.cssText = "min-width:250px;padding:14px 22px;border:3px solid #c681ff;border-radius:8px;background:#1b1430;color:#fff;font:800 17px Arial Black,Trebuchet MS,sans-serif;cursor:pointer";
    const continueButton = document.createElement("button"); continueButton.type = "button"; continueButton.textContent = "CONTINUE  (ENTER)"; continueButton.style.cssText = "min-width:250px;padding:14px 22px;border:3px solid #45f6e5;border-radius:8px;background:#1b1430;color:#fff;font:800 17px Arial Black,Trebuchet MS,sans-serif;cursor:pointer";
    repeat.addEventListener("click", () => void this.repeatWord());
    continueButton.addEventListener("click", () => void this.continueToNextWord());
    actions.append(repeat, continueButton);
    const back = document.createElement("button"); back.textContent = "BACK TO GAMES"; back.style.cssText = "margin-top:12px;padding:14px 22px;border:2px solid #ff70b8;border-radius:6px;background:#1b1430;color:#fff;font:800 16px Arial Black,Trebuchet MS,sans-serif;cursor:pointer";
    back.addEventListener("click", () => returnToLearningLibrary(this));
    root.append(title, word, status, meter, timer, actions, back); document.body.append(root);
    this.fallbackUi = { root, word, status, timer, timerFill, repeat, continue: continueButton };
    this.setActionButtonsVisible(false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { root.remove(); this.fallbackUi = undefined; });
  }
}
