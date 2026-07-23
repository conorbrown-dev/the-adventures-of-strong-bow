import Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";
import { returnToLearningLibrary } from "../utils/gameNavigation";

interface PauseOverlayData { pausedSceneKey?: string; }

export class PauseOverlayScene extends Phaser.Scene {
  private pausedSceneKey?: string;

  constructor() { super(SCENE_KEYS.PAUSE); }

  init(data: PauseOverlayData): void { this.pausedSceneKey = data.pausedSceneKey; }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x06030c, 0.72);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 460, 290, 0x160f28, 0.98).setStrokeStyle(3, 0x45f6e5);
    this.add.text(GAME_WIDTH / 2, 290, "GAME PAUSED", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "38px", color: "#ffffff" }).setOrigin(0.5);
    this.createButton(390, "RESUME", 0x45f6e5, () => this.resumeGame());
    this.createButton(476, "MAIN MENU", 0xff70b8, () => {
      if (this.pausedSceneKey) this.scene.stop(this.pausedSceneKey);
      returnToLearningLibrary(this);
    });
    this.input.keyboard?.once("keydown-ESC", () => this.resumeGame());
  }

  private createButton(y: number, label: string, color: number, action: () => void): void {
    const background = this.add.rectangle(GAME_WIDTH / 2, y, 280, 58, 0x211735).setStrokeStyle(2, color);
    const text = this.add.text(GAME_WIDTH / 2, y, label, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "20px", color: "#ffffff" }).setOrigin(0.5);
    this.add.zone(GAME_WIDTH / 2, y, 280, 58).setInteractive({ useHandCursor: true })
      .on("pointerover", () => background.setFillStyle(color, 0.45))
      .on("pointerout", () => background.setFillStyle(0x211735))
      .on("pointerup", action);
    void text;
  }

  private resumeGame(): void {
    if (this.pausedSceneKey) this.scene.resume(this.pausedSceneKey);
    this.scene.stop();
  }
}
