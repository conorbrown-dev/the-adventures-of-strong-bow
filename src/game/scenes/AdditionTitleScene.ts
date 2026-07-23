import Phaser from "phaser";

import { type AdditionLayout, type AdditionSettings, type StarshipDifficulty, loadAdditionSettings, saveAdditionSettings } from "../settings/additionSettings";
import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";

const PURPLE = 0xc681ff;
const CYAN = 0x45f6e5;

export class AdditionTitleScene extends Phaser.Scene {
  private settings: AdditionSettings = loadAdditionSettings();
  private settingsPanel?: Phaser.GameObjects.Container;

  constructor() { super(SCENE_KEYS.ADDITION_TITLE); }

  create(): void {
    this.cameras.main.setBackgroundColor(0x05030b);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05030b);
    for (let index = 0; index < 70; index += 1) {
      this.add.circle(Phaser.Math.Between(10, GAME_WIDTH - 10), Phaser.Math.Between(10, GAME_HEIGHT - 10), 1, 0xffffff, Phaser.Math.FloatBetween(0.12, 0.45));
    }
    this.add.text(GAME_WIDTH / 2, 166, "NEON NUMBER LAB", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "62px", color: "#ffffff", letterSpacing: 4 }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 244, "practice addition at your own pace", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "27px", color: "#c5b5df" }).setOrigin(0.5);
    this.createButton(390, "START", CYAN, () => this.scene.start(SCENE_KEYS.ADDITION_GAME));
    this.createButton(494, "SETTINGS", PURPLE, () => this.showSettings());
    this.createButton(598, "BACK TO GAMES", 0xff70b8, () => this.scene.start(SCENE_KEYS.TITLE));
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start(SCENE_KEYS.TITLE));
  }

  private createButton(y: number, label: string, color: number, action: () => void): void {
    const bg = this.add.rectangle(GAME_WIDTH / 2, y, 350, 72, 0x160f28).setStrokeStyle(3, color, 0.95);
    const text = this.add.text(GAME_WIDTH / 2, y, label, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "26px", color: "#ffffff", letterSpacing: 2 }).setOrigin(0.5);
    this.add.zone(GAME_WIDTH / 2, y, 350, 72).setInteractive({ useHandCursor: true })
      .on("pointerover", () => { bg.setFillStyle(color, 0.32); text.setScale(1.06); })
      .on("pointerout", () => { bg.setFillStyle(0x160f28); text.setScale(1); })
      .on("pointerup", action);
  }

  private showSettings(): void {
    this.settingsPanel?.destroy(true);
    const panel = this.add.container(0, 0); this.settingsPanel = panel;
    const items: Phaser.GameObjects.GameObject[] = [];
    items.push(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 620, 650, 0x120b20, 0.98).setStrokeStyle(3, PURPLE));
    items.push(this.add.text(GAME_WIDTH / 2, 260, "ADDITION SETTINGS", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "30px", color: "#ffffff" }).setOrigin(0.5));
    items.push(this.add.text(430, 340, "Maximum sum", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "25px", color: "#c5b5df" }).setOrigin(1, 0.5));
    [5, 10, 20].forEach((value, index) => items.push(this.settingChoice(470 + index * 82, 340, 65, String(value), this.settings.maximumSum === value, () => { this.settings.maximumSum = value; this.showSettings(); })));
    items.push(this.add.text(430, 430, "Problem layout", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "25px", color: "#c5b5df" }).setOrigin(1, 0.5));
    (["horizontal", "vertical"] as AdditionLayout[]).forEach((layout, index) => items.push(this.settingChoice(480 + index * 142, 430, 120, layout.toUpperCase(), this.settings.layout === layout, () => { this.settings.layout = layout; this.showSettings(); })));
    items.push(this.add.text(430, 510, "Enemy ships", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "25px", color: "#c5b5df" }).setOrigin(1, 0.5));
    [5, 8, 12].forEach((value, index) => items.push(this.settingChoice(470 + index * 82, 510, 65, String(value), this.settings.enemyShipCount === value, () => { this.settings.enemyShipCount = value; this.showSettings(); })));
    items.push(this.add.text(430, 590, "Starship mode", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "25px", color: "#c5b5df" }).setOrigin(1, 0.5));
    (["easy", "normal", "hard"] as StarshipDifficulty[]).forEach((difficulty, index) => items.push(this.settingChoice(465 + index * 98, 590, 82, difficulty.toUpperCase(), this.settings.starshipDifficulty === difficulty, () => { this.settings.starshipDifficulty = difficulty; this.showSettings(); })));
    const done = this.add.rectangle(GAME_WIDTH / 2, 680, 170, 56, CYAN).setStrokeStyle(2, 0xffffff, 0.8);
    const doneText = this.add.text(GAME_WIDTH / 2, 680, "DONE", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "20px", color: "#090610" }).setOrigin(0.5);
    const doneZone = this.add.zone(GAME_WIDTH / 2, 680, 170, 56).setInteractive({ useHandCursor: true }).on("pointerup", () => { saveAdditionSettings(this.settings); this.settingsPanel?.destroy(true); this.settingsPanel = undefined; });
    items.push(done, doneText, doneZone); panel.add(items);
  }

  private settingChoice(x: number, y: number, width: number, label: string, active: boolean, action: () => void): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, width, 48, active ? PURPLE : 0x211735).setStrokeStyle(2, active ? CYAN : PURPLE, active ? 1 : 0.45);
    const text = this.add.text(0, 0, label, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "14px", color: "#ffffff" }).setOrigin(0.5);
    const group = this.add.container(x, y, [bg, text]);
    const zone = this.add.zone(0, 0, width, 48).setInteractive({ useHandCursor: true }).on("pointerup", action);
    group.add(zone); return group;
  }
}
