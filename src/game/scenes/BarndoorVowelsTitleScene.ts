import Phaser from "phaser";

import { ASSET_KEYS } from "../utils/assetKeys";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";
import { playButtonClick, playButtonHover } from "../utils/uiSound";
import { returnToLearningLibrary } from "../utils/gameNavigation";

export class BarnDoorVowelsTitleScene extends Phaser.Scene {
  private selectedIndex = 0;
  private buttons: Array<{ panel: Phaser.GameObjects.Rectangle; action: () => void }> = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENE_KEYS.BARN_DOOR_VOWELS_TITLE);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x9bd8f2);
    this.createFarmBackdrop();
    this.add
      .text(GAME_WIDTH / 2, 155, "Barn Door Vowels", {
        fontFamily: "Trebuchet MS",
        fontSize: "68px",
        fontStyle: "bold",
        color: COLORS.TEXT_LIGHT,
        stroke: COLORS.TEXT_DARK,
        strokeThickness: 10
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.add
      .text(GAME_WIDTH / 2, 225, "Guide open and closed vowel sounds home!", {
        fontFamily: "Trebuchet MS",
        fontSize: "30px",
        fontStyle: "bold",
        color: COLORS.TEXT_DARK
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.createButton(0, 430, "PLAY", () => {
      this.scene.start(SCENE_KEYS.BARN_DOOR_VOWELS);
    });
    this.createButton(1, 535, "BACK", () => {
      returnToLearningLibrary(this);
    });

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.enterKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escapeKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.refreshSelection();
  }

  update(): void {
    if (!this.cursors || !this.enterKey || !this.escapeKey) {
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      playButtonClick(this);
      returnToLearningLibrary(this);
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.selectedIndex = (this.selectedIndex + 1) % this.buttons.length;
      playButtonHover(this);
      this.refreshSelection();
    } else if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      playButtonClick(this);
      this.buttons[this.selectedIndex]?.action();
    }
  }

  private createFarmBackdrop(): void {
    const background = this.add
      .image(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        ASSET_KEYS.BARN_DOOR_VOWELS_TITLE_SCREEN
      )
      .setOrigin(0.5)
      .setDepth(-2);
    const containScale = Math.min(
      GAME_WIDTH / background.width,
      GAME_HEIGHT / background.height
    );
    background.setScale(containScale);
  }

  private createButton(index: number, y: number, label: string, action: () => void): void {
    const panel = this.add
      .rectangle(GAME_WIDTH / 2, y, 380, 78, 0xf6edd7)
      .setStrokeStyle(5, 0x5e4127)
      .setDepth(8)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(GAME_WIDTH / 2, y, label, {
        fontFamily: "Trebuchet MS",
        fontSize: "34px",
        fontStyle: "bold",
        color: COLORS.TEXT_DARK
      })
      .setOrigin(0.5)
      .setDepth(9);
    panel.on("pointerover", () => {
      this.selectedIndex = index;
      playButtonHover(this);
      this.refreshSelection();
    });
    panel.on("pointerup", () => {
      playButtonClick(this);
      action();
    });
    this.buttons.push({ panel, action });
  }

  private refreshSelection(): void {
    this.buttons.forEach(({ panel }, index) => {
      panel.setFillStyle(index === this.selectedIndex ? 0xffdf72 : 0xf6edd7);
      panel.setScale(index === this.selectedIndex ? 1.04 : 1);
    });
  }
}
