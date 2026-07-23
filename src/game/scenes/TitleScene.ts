import Phaser from "phaser";

import { ASSET_KEYS } from "../utils/assetKeys";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";
import { playButtonClick, playButtonHover } from "../utils/uiSound";

interface GameSelectButton {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  hitZone: Phaser.GameObjects.Zone;
  onClick: () => void;
}

const BUTTON_SELECTED_SCALE = 1.04;

export class TitleScene extends Phaser.Scene {
  private selectedIndex = 0;
  private buttons: GameSelectButton[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private enterKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENE_KEYS.TITLE);
  }

  create(): void {
    this.stopFossilDigBackgroundMusic();
    this.resetTitleCamera();
    this.createBackground();

    this.add
      .text(GAME_WIDTH / 2, 126, "Molly's Learning Academy", {
        fontFamily: "Trebuchet MS",
        fontSize: "58px",
        fontStyle: "bold",
        color: "#fff8e8",
        stroke: "#233047",
        strokeThickness: 8
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 194, "Choose a game to play.", {
        fontFamily: "Trebuchet MS",
        fontSize: "28px",
        color: "#2edb37",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.createButton(0, 255, "Fossil Dig", () => {
      this.scene.start(SCENE_KEYS.FOSSIL_DIG_TITLE);
    });

    this.createButton(1, 360, "Kitten Catch", () => {
      this.scene.start(SCENE_KEYS.CAT_CATCH_TITLE);
    });

    this.createButton(2, 465, "Barn Door Vowels", () => {
      this.scene.start(SCENE_KEYS.BARN_DOOR_VOWELS_TITLE);
    });
    this.createButton(3, 570, "Addition Lab", () => {
      this.scene.start(SCENE_KEYS.ADDITION_TITLE);
    });
    this.createButton(4, 675, "Sight Word Studio", () => {
      this.scene.start(SCENE_KEYS.SIGHT_WORDS_TITLE);
    });

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.enterKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );

    this.refreshSelection();
  }

  update(): void {
    if (!this.cursors || !this.enterKey) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.selectedIndex = (this.selectedIndex + 1) % this.buttons.length;
      playButtonHover(this);
      this.refreshSelection();
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.selectedIndex =
        (this.selectedIndex - 1 + this.buttons.length) % this.buttons.length;
      playButtonHover(this);
      this.refreshSelection();
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.activateSelection();
    }
  }

  private resetTitleCamera(): void {
    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(1);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
  }

  private createBackground(): void {
    this.cameras.main.setBackgroundColor(0x161a28);
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x161a28)
      .setDepth(-20);
    const background = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSET_KEYS.LEARNING_ACADEMY_BACKGROUND)
      .setOrigin(0.5)
      .setDepth(-18);
    const containScale = Math.min(
      GAME_WIDTH / background.width,
      GAME_HEIGHT / background.height
    );

    background.setScale(containScale);
  }

  private createButton(
    index: number,
    y: number,
    label: string,
    onClick: () => void
  ): void {
    const background = this.add
      .rectangle(GAME_WIDTH / 2, y, 420, 86, 0xfff6d8, 0.98)
      .setStrokeStyle(4, 0x233047);
    const text = this.add
      .text(GAME_WIDTH / 2, y, label, {
        fontFamily: "Trebuchet MS",
        fontSize: "38px",
        fontStyle: "bold",
        color: COLORS.TEXT_DARK
      })
      .setOrigin(0.5);
    const container = this.add.container(0, 0, [background, text]);
    const hitZone = this.add
      .zone(GAME_WIDTH / 2, y, 420, 86)
      .setInteractive({ useHandCursor: true });

    hitZone.on("pointerover", () => {
      this.selectedIndex = index;
      playButtonHover(this);
      this.refreshSelection();
    });
    hitZone.on("pointerup", () => {
      playButtonClick(this);
      onClick();
    });

    this.buttons.push({
      container,
      background,
      label: text,
      hitZone,
      onClick
    });
  }

  private refreshSelection(): void {
    this.buttons.forEach((entry, index) => {
      const isSelected = index === this.selectedIndex;

      entry.container.setScale(isSelected ? BUTTON_SELECTED_SCALE : 1);
      entry.background.setFillStyle(isSelected ? 0xffdc6b : 0xfff6d8, 0.98);
      entry.background.setStrokeStyle(4, isSelected ? 0xa35a14 : 0x233047);
      entry.label.setColor(isSelected ? "#2d1f14" : COLORS.TEXT_DARK);
    });
  }

  private activateSelection(): void {
    const selected = this.buttons[this.selectedIndex];

    if (!selected) {
      return;
    }

    playButtonClick(this);
    selected.onClick();
  }

  private stopFossilDigBackgroundMusic(): void {
    const bgm = this.sound.get(ASSET_KEYS.DIG_BGM);

    if (!bgm) {
      return;
    }

    if (bgm.isPlaying) {
      bgm.stop();
    }

    bgm.destroy();
  }
}
