import Phaser from "phaser";

import { sightWords, type SightWord } from "../data/sightWords";
import { loadSightWordSettings, loadSightWordStats, saveSightWordSettings, type SightWordSettings } from "../settings/sightWordSettings";
import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";
import { returnToLearningLibrary } from "../utils/gameNavigation";

const PURPLE = 0xc681ff;
const CYAN = 0x45f6e5;

export class SightWordsTitleScene extends Phaser.Scene {
  private settings: SightWordSettings = loadSightWordSettings();
  private panel?: Phaser.GameObjects.Container;
  private settingsPage = 0;

  constructor() { super(SCENE_KEYS.SIGHT_WORDS_TITLE); }

  create(): void {
    this.cameras.main.setBackgroundColor(0x080613);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x080613);
    for (let index = 0; index < 60; index += 1) this.add.circle(Phaser.Math.Between(12, GAME_WIDTH - 12), Phaser.Math.Between(12, GAME_HEIGHT - 12), 1, 0xffffff, Phaser.Math.FloatBetween(0.12, 0.4));
    this.add.text(GAME_WIDTH / 2, 150, "SIGHT WORD STUDIO", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "54px", color: "#ffffff", letterSpacing: 3 }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 220, "read the word aloud before the timer runs out", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "25px", color: "#c5b5df" }).setOrigin(0.5);
    this.createButton(385, "START QUIZ", CYAN, () => this.scene.start(SCENE_KEYS.SIGHT_WORDS_QUIZ));
    this.createButton(484, "WORD POOL & PROGRESS", PURPLE, () => this.showSettings());
    this.createButton(583, "BACK TO GAMES", 0xff70b8, () => returnToLearningLibrary(this));
    this.input.keyboard?.once("keydown-ESC", () => returnToLearningLibrary(this));
  }

  private createButton(y: number, label: string, color: number, action: () => void): void {
    const background = this.add.rectangle(GAME_WIDTH / 2, y, 410, 72, 0x160f28).setStrokeStyle(3, color);
    const text = this.add.text(GAME_WIDTH / 2, y, label, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "24px", color: "#ffffff", letterSpacing: 1 }).setOrigin(0.5);
    this.add.zone(GAME_WIDTH / 2, y, 410, 72).setInteractive({ useHandCursor: true })
      .on("pointerover", () => { background.setFillStyle(color, 0.3); text.setScale(1.05); })
      .on("pointerout", () => { background.setFillStyle(0x160f28); text.setScale(1); })
      .on("pointerdown", action);
  }

  private showSettings(): void {
    this.panel?.destroy(true);
    const panel = this.add.container(0, 0); this.panel = panel;
    const items: Phaser.GameObjects.GameObject[] = [];
    items.push(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 920, 630, 0x120b20, 0.99).setStrokeStyle(3, PURPLE));
    items.push(this.add.text(GAME_WIDTH / 2, 112, "CHOOSE A SMALL PRACTICE POOL", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "27px", color: "#ffffff" }).setOrigin(0.5));
    items.push(this.add.text(GAME_WIDTH / 2, 150, "Mastered words are automatically skipped. A word is mastered after 3 correct responses within 3.5 seconds.", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "17px", color: "#c5b5df" }).setOrigin(0.5));
    const stats = loadSightWordStats();
    const wordsPerPage = 20;
    const pageCount = Math.ceil(sightWords.length / wordsPerPage);
    this.settingsPage = Phaser.Math.Clamp(this.settingsPage, 0, pageCount - 1);
    const pageWords = sightWords.slice(this.settingsPage * wordsPerPage, (this.settingsPage + 1) * wordsPerPage);
    pageWords.forEach((word, index) => {
      const col = index % 5; const row = Math.floor(index / 5);
      const x = 350 + col * 165; const y = 230 + row * 92;
      const selected = this.settings.selectedWords.includes(word);
      const wordStats = stats[word];
      const background = this.add.rectangle(x, y, 145, 68, selected ? PURPLE : 0x211735).setStrokeStyle(2, wordStats?.mastered ? 0x45f6e5 : PURPLE, selected ? 1 : 0.45);
      const label = this.add.text(x, y - 11, word, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "24px", color: "#ffffff" }).setOrigin(0.5);
      const detail = this.add.text(x, y + 18, wordStats?.mastered ? "MASTERED" : `${wordStats?.testedCount ?? 0} tested`, { fontFamily: "Trebuchet MS, sans-serif", fontSize: "12px", color: wordStats?.mastered ? "#45f6e5" : "#c5b5df" }).setOrigin(0.5);
      const zone = this.add.zone(x, y, 145, 68).setInteractive({ useHandCursor: true }).on("pointerdown", () => this.toggleWord(word));
      items.push(background, label, detail, zone);
    });
    items.push(this.add.text(GAME_WIDTH / 2, 590, `PAGE ${this.settingsPage + 1} / ${pageCount}`, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "16px", color: "#c5b5df" }).setOrigin(0.5));
    if (this.settingsPage > 0) items.push(this.pageButton(400, 590, "‹ PREVIOUS", () => { this.settingsPage -= 1; this.showSettings(); }));
    if (this.settingsPage < pageCount - 1) items.push(this.pageButton(966, 590, "NEXT ›", () => { this.settingsPage += 1; this.showSettings(); }));
    const done = this.add.rectangle(GAME_WIDTH / 2, 664, 180, 52, CYAN).setStrokeStyle(2, 0xffffff, 0.8);
    const doneText = this.add.text(GAME_WIDTH / 2, 664, "DONE", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "19px", color: "#090610" }).setOrigin(0.5);
    const doneZone = this.add.zone(GAME_WIDTH / 2, 664, 180, 52).setInteractive({ useHandCursor: true }).on("pointerdown", () => { saveSightWordSettings(this.settings); this.panel?.destroy(true); this.panel = undefined; });
    items.push(done, doneText, doneZone); panel.add(items);
  }

  private toggleWord(word: SightWord): void {
    const selected = this.settings.selectedWords;
    this.settings.selectedWords = selected.includes(word) ? selected.filter((entry) => entry !== word) : [...selected, word];
    if (this.settings.selectedWords.length === 0) this.settings.selectedWords = [word];
    this.showSettings();
  }

  private pageButton(x: number, y: number, label: string, action: () => void): Phaser.GameObjects.Container {
    const background = this.add.rectangle(0, 0, 125, 38, 0x211735).setStrokeStyle(2, PURPLE);
    const text = this.add.text(0, 0, label, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "13px", color: "#ffffff" }).setOrigin(0.5);
    const button = this.add.container(x, y, [background, text]);
    button.add(this.add.zone(0, 0, 125, 38).setInteractive({ useHandCursor: true }).on("pointerdown", action));
    return button;
  }
}
