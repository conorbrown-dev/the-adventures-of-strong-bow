import Phaser from "phaser";

import { ASSET_KEYS } from "../utils/assetKeys";
import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";

interface TitleMenuButton {
  button: Phaser.GameObjects.Image;
  activeTextureKey: string;
  inactiveTextureKey: string;
  onClick: () => void;
}

const TITLE_BUTTON_HEIGHT = 72;
const TITLE_BUTTON_SELECTED_SCALE = 1.04;

export class TitleScene extends Phaser.Scene {
  private selectedIndex = 0;
  private buttons: TitleMenuButton[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private overlayVisible = false;
  private overlay?: Phaser.GameObjects.Container;

  constructor() {
    super(SCENE_KEYS.TITLE);
  }

  create(): void {
    this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSET_KEYS.TITLE_SCREEN)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setDepth(0);

    this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        0x08111a,
        0.15
      )
      .setDepth(1);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 132,
        "Use arrow keys and Enter, or click a button.",
        {
          fontFamily: "Trebuchet MS",
          fontSize: "24px",
          color: "#fff8e8",
          fontStyle: "bold",
          stroke: "#2d1f14",
          strokeThickness: 6
        }
      )
      .setOrigin(0.5)
      .setDepth(3);

    this.createButton(
      0,
      450,
      ASSET_KEYS.TITLE_BUTTON_START_ACTIVE,
      ASSET_KEYS.TITLE_BUTTON_START_INACTIVE,
      () => this.startGame()
    );
    this.createButton(
      1,
      540,
      ASSET_KEYS.TITLE_BUTTON_SETTINGS_ACTIVE,
      ASSET_KEYS.TITLE_BUTTON_SETTINGS_INACTIVE,
      () => this.showSettingsOverlay()
    );
    this.createButton(
      2,
      630,
      ASSET_KEYS.TITLE_BUTTON_EXIT_ACTIVE,
      ASSET_KEYS.TITLE_BUTTON_EXIT_INACTIVE,
      () => this.exitGame()
    );

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

    if (this.overlayVisible) {
      if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this.hideOverlay();
      }

      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.selectedIndex = (this.selectedIndex + 1) % this.buttons.length;
      this.refreshSelection();
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.selectedIndex =
        (this.selectedIndex - 1 + this.buttons.length) % this.buttons.length;
      this.refreshSelection();
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.activateSelection();
    }
  }

  private createButton(
    index: number,
    y: number,
    activeTextureKey: string,
    inactiveTextureKey: string,
    onClick: () => void
  ): void {
    const button = this.add
      .image(GAME_WIDTH / 2, y, inactiveTextureKey)
      .setDepth(3);
    const source = button.texture.getSourceImage() as { width: number; height: number };
    const scale = TITLE_BUTTON_HEIGHT / source.height;
    const width = source.width * scale;
    const height = source.height * scale;

    button.setDisplaySize(width, height);
    button.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    button.on("pointerover", () => {
      this.selectedIndex = index;
      this.refreshSelection();
    });
    button.on("pointerdown", () => onClick());

    this.buttons.push({
      button,
      activeTextureKey,
      inactiveTextureKey,
      onClick
    });
  }

  private refreshSelection(): void {
    this.buttons.forEach((entry, index) => {
      const isSelected = index === this.selectedIndex;
      entry.button.setTexture(
        isSelected ? entry.activeTextureKey : entry.inactiveTextureKey
      );
      const source = entry.button.texture.getSourceImage() as {
        width: number;
        height: number;
      };
      const baseScale = TITLE_BUTTON_HEIGHT / source.height;
      entry.button.setScale(
        isSelected ? baseScale * TITLE_BUTTON_SELECTED_SCALE : baseScale
      );
      entry.button.setAlpha(isSelected ? 1 : 0.96);
    });
  }

  private activateSelection(): void {
    this.buttons[this.selectedIndex]?.onClick();
  }

  private startGame(): void {
    if (this.overlayVisible) {
      this.hideOverlay();
    }

    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.time.delayedCall(240, () => {
      this.scene.start(SCENE_KEYS.MAIN_MENU);
    });
  }

  private exitGame(): void {
    try {
      window.close();
    } catch {
      // Ignore close failures. Most browsers will block this for normal tabs.
    }

    this.showOverlay(
      "Thanks for playing!",
      "This browser tab cannot be closed automatically.\nPress Enter or click anywhere to return."
    );
  }

  private showSettingsOverlay(): void {
    this.showOverlay(
      "Settings Coming Soon",
      "Audio, accessibility, and gameplay settings will be added here.\nPress Enter or click anywhere to return."
    );
  }

  private showOverlay(titleText: string, bodyText: string): void {
    if (!this.overlay) {
      const backdrop = this.add
        .rectangle(
          GAME_WIDTH / 2,
          GAME_HEIGHT / 2,
          GAME_WIDTH,
          GAME_HEIGHT,
          0x1b120d,
          0.74
        )
        .setDepth(10)
        .setInteractive();

      const panel = this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 540, 220, 0xf6edd7)
        .setStrokeStyle(4, 0x5e4127)
        .setDepth(11);

      const title = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 44, "Thanks for playing!", {
          fontFamily: "Trebuchet MS",
          fontSize: "36px",
          color: "#2d1f14",
          fontStyle: "bold"
        })
        .setOrigin(0.5)
        .setDepth(12);

      const message = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 14, "", {
          fontFamily: "Trebuchet MS",
          fontSize: "22px",
          color: "#4b5563",
          align: "center"
        })
        .setOrigin(0.5)
        .setDepth(12);

      backdrop.on("pointerdown", () => this.hideOverlay());

      this.overlay = this.add.container(0, 0, [backdrop, panel, title, message]);
      this.overlay.setDepth(10);
      this.overlay.setData("titleText", title);
      this.overlay.setData("messageText", message);
    }

    const title = this.overlay.getData("titleText") as Phaser.GameObjects.Text;
    const message = this.overlay.getData("messageText") as Phaser.GameObjects.Text;
    title.setText(titleText);
    message.setText(bodyText);
    this.overlay.setVisible(true);
    this.overlayVisible = true;
  }

  private hideOverlay(): void {
    this.overlay?.setVisible(false);
    this.overlayVisible = false;
  }
}
