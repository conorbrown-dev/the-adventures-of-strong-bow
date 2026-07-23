import Phaser from "phaser";

import {
  MAX_CATCH_GOAL,
  loadCatCatchSettings,
  MAX_YARN_FALL_SPEED,
  MIN_CATCH_GOAL,
  MIN_YARN_FALL_SPEED,
  saveCatCatchSettings
} from "../settings/catCatchSettings";
import { ASSET_KEYS } from "../utils/assetKeys";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";
import { playButtonClick, playButtonHover } from "../utils/uiSound";
import { returnToLearningLibrary } from "../utils/gameNavigation";

interface CatTitleButton {
  image: Phaser.GameObjects.Image;
  hitZone: Phaser.GameObjects.Zone;
  baseScale: number;
  visualWidth: number;
  visualHeight: number;
  onClick: () => void;
}

const BUTTON_HEIGHT = 78;
const START_BUTTON_VISIBLE_HEIGHT = 410;
const BUTTON_CANVAS_HEIGHT = 724;
const BUTTON_VISIBLE_HEIGHT =
  BUTTON_HEIGHT * START_BUTTON_VISIBLE_HEIGHT / BUTTON_CANVAS_HEIGHT;
const BUTTON_SELECTED_SCALE = 1.04;
const BASKET_BUTTON_GAP = 30;

export class CatCatchTitleScene extends Phaser.Scene {
  private selectedIndex = 0;
  private buttons: CatTitleButton[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private overlayVisible = false;
  private overlay?: Phaser.GameObjects.Container;
  private selectionBasket?: Phaser.GameObjects.Image;
  private selectionBasketBaseScale = 1;

  constructor() {
    super(SCENE_KEYS.CAT_CATCH_TITLE);
  }

  create(): void {
    this.stopFossilDigBackgroundMusic();
    this.cameras.main.setBackgroundColor(0xaadcf8);
    this.createBackground();

    this.createButton(
      0,
      506,
      ASSET_KEYS.KITTEN_CATCH_BUTTON_START,
      () => {
        this.scene.start(SCENE_KEYS.MAIN_MENU, { family: "cat-catch" });
      }
    );
    this.createButton(
      1,
      590,
      ASSET_KEYS.KITTEN_CATCH_BUTTON_SETTINGS,
      () => {
        this.showSettingsOverlay();
      }
    );
    this.createButton(
      2,
      674,
      ASSET_KEYS.KITTEN_CATCH_BUTTON_BACK,
      () => {
        returnToLearningLibrary(this);
      }
    );
    this.createSpinningBasket();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escapeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.refreshSelection();
  }

  private createSpinningBasket(): void {
    this.selectionBasket = this.add
      .image(0, 0, ASSET_KEYS.KITTEN_CATCH_BASKET)
      .setOrigin(0.5)
      .setDepth(7);
    const source = this.selectionBasket.texture.getSourceImage() as {
      height: number;
    };
    this.selectionBasketBaseScale = BUTTON_VISIBLE_HEIGHT / source.height;
    this.selectionBasket.setScale(this.selectionBasketBaseScale);

    this.tweens.add({
      targets: this.selectionBasket,
      angle: 360,
      duration: 3600,
      repeat: -1,
      ease: "Linear"
    });
  }

  update(): void {
    if (!this.cursors || !this.enterKey || !this.escapeKey) {
      return;
    }

    if (this.overlayVisible) {
      if (
        Phaser.Input.Keyboard.JustDown(this.enterKey) ||
        Phaser.Input.Keyboard.JustDown(this.escapeKey)
      ) {
        this.hideOverlay();
      }

      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      playButtonClick(this);
      returnToLearningLibrary(this);
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
      const selected = this.buttons[this.selectedIndex];

      if (!selected) {
        return;
      }

      playButtonClick(this);
      selected.onClick();
    }
  }

  private createBackground(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x161a28)
      .setDepth(-20);
    const background = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSET_KEYS.KITTEN_CATCH_TITLE_SCREEN)
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
    textureKey: string,
    onClick: () => void
  ): void {
    const image = this.add
      .image(GAME_WIDTH / 2, y, textureKey)
      .setDepth(6);
    const visibleBounds = this.getButtonVisibleBounds(textureKey);
    const baseScale = BUTTON_VISIBLE_HEIGHT / visibleBounds.height;
    const width = visibleBounds.width * baseScale;
    const height = visibleBounds.height * baseScale;

    image.setScale(baseScale);
    const hitZone = this.add
      .zone(GAME_WIDTH / 2, y, width, height)
      .setDepth(8)
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
      image,
      hitZone,
      baseScale,
      visualWidth: width,
      visualHeight: height,
      onClick
    });
  }

  private getButtonVisibleBounds(textureKey: string): {
    width: number;
    height: number;
  } {
    if (textureKey === ASSET_KEYS.KITTEN_CATCH_BUTTON_SETTINGS) {
      return { width: 1912, height: 582 };
    }

    if (textureKey === ASSET_KEYS.KITTEN_CATCH_BUTTON_BACK) {
      return { width: 1501, height: 588 };
    }

    return { width: 2013, height: START_BUTTON_VISIBLE_HEIGHT };
  }

  private refreshSelection(): void {
    this.buttons.forEach((entry, index) => {
      const isSelected = index === this.selectedIndex;

      entry.image.setScale(
        isSelected ? entry.baseScale * BUTTON_SELECTED_SCALE : entry.baseScale
      );
      entry.image.setAlpha(isSelected ? 1 : 0.94);
      entry.hitZone.setScale(isSelected ? BUTTON_SELECTED_SCALE : 1);
    });
    this.updateSelectionBasketPosition();
  }

  private updateSelectionBasketPosition(): void {
    if (!this.selectionBasket) {
      return;
    }

    const selected = this.buttons[this.selectedIndex];

    if (!selected) {
      return;
    }

    const visualWidth = selected.visualWidth * BUTTON_SELECTED_SCALE;

    this.selectionBasket.setScale(
      this.selectionBasketBaseScale * BUTTON_SELECTED_SCALE
    );
    this.selectionBasket.setPosition(
      selected.image.x -
        visualWidth / 2 -
        BASKET_BUTTON_GAP -
        this.selectionBasket.displayWidth / 2,
      selected.image.y
    );
  }

  private showSettingsOverlay(): void {
    const settings = loadCatCatchSettings();
    this.destroyOverlay();

    const backdrop = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1d3141, 0.74)
      .setDepth(20)
      .setInteractive();
    const panel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 660, 500, 0xfff5dd, 1)
      .setStrokeStyle(4, 0x28445a)
      .setDepth(21);
    const title = this.add
      .text(GAME_WIDTH / 2, 174, "Kitten Catch Settings", {
        fontFamily: "Trebuchet MS",
        fontSize: "36px",
        fontStyle: "bold",
        color: COLORS.TEXT_DARK
      })
      .setOrigin(0.5)
      .setDepth(22);
    const minValue = this.add
      .text(900, 294, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "26px",
        fontStyle: "bold",
        color: COLORS.TEXT_DARK
      })
      .setOrigin(0.5)
      .setDepth(22);
    const maxValue = this.add
      .text(900, 384, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "26px",
        fontStyle: "bold",
        color: COLORS.TEXT_DARK
      })
      .setOrigin(0.5)
      .setDepth(22);
    const catchGoalValue = this.add
      .text(900, 474, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "26px",
        fontStyle: "bold",
        color: COLORS.TEXT_DARK
      })
      .setOrigin(0.5)
      .setDepth(22);

    const refreshTexts = (): void => {
      minValue.setText(`${settings.minYarnFallSpeed} px/sec`);
      maxValue.setText(`${settings.maxYarnFallSpeed} px/sec`);
      catchGoalValue.setText(`${settings.catchGoal} letters`);
    };
    const persistSettings = (): void => {
      const saved = saveCatCatchSettings(settings);
      settings.minYarnFallSpeed = saved.minYarnFallSpeed;
      settings.maxYarnFallSpeed = saved.maxYarnFallSpeed;
      settings.catchGoal = saved.catchGoal;
      refreshTexts();
    };

    const controls = [
      this.add
        .text(430, 294, "Minimum Yarn Speed", {
          fontFamily: "Trebuchet MS",
          fontSize: "26px",
          fontStyle: "bold",
          color: COLORS.TEXT_DARK
        })
        .setOrigin(0.5)
        .setDepth(22),
      this.add
        .text(430, 384, "Maximum Yarn Speed", {
          fontFamily: "Trebuchet MS",
          fontSize: "26px",
          fontStyle: "bold",
          color: COLORS.TEXT_DARK
        })
        .setOrigin(0.5)
        .setDepth(22),
      this.add
        .text(430, 474, "Letters to Catch", {
          fontFamily: "Trebuchet MS",
          fontSize: "26px",
          fontStyle: "bold",
          color: COLORS.TEXT_DARK
        })
        .setOrigin(0.5)
        .setDepth(22),
      minValue,
      maxValue,
      catchGoalValue,
      ...this.createSpeedSlider(
        662,
        294,
        240,
        settings.minYarnFallSpeed,
        (value) => {
          settings.minYarnFallSpeed = value;
          if (settings.maxYarnFallSpeed < value) {
            settings.maxYarnFallSpeed = value;
          }
          persistSettings();
        }
      ),
      ...this.createSpeedSlider(
        662,
        384,
        240,
        settings.maxYarnFallSpeed,
        (value) => {
          settings.maxYarnFallSpeed = value;
          if (settings.minYarnFallSpeed > value) {
            settings.minYarnFallSpeed = value;
          }
          persistSettings();
        }
      ),
      ...this.createCatchGoalSlider(
        662,
        474,
        240,
        settings.catchGoal,
        (value) => {
          settings.catchGoal = value;
          persistSettings();
        }
      ),
      ...this.createPanelButton(GAME_WIDTH / 2, 594, "Done", () => {
        this.hideOverlay();
      })
    ];

    refreshTexts();
    backdrop.on("pointerdown", () => {
      playButtonClick(this);
      this.hideOverlay();
    });

    this.overlay = this.add.container(0, 0, [
      backdrop,
      panel,
      title,
      ...controls
    ]);
    this.overlay.setDepth(20);
    this.overlayVisible = true;
  }

  private hideOverlay(): void {
    this.destroyOverlay();
    this.overlayVisible = false;
  }

  private destroyOverlay(): void {
    this.overlay?.destroy(true);
    this.overlay = undefined;
  }

  private createSpeedSlider(
    x: number,
    y: number,
    width: number,
    initialValue: number,
    onChange: (value: number) => void
  ): Phaser.GameObjects.GameObject[] {
    const normalizedValue = this.speedToSliderValue(initialValue);
    const track = this.add
      .rectangle(x, y, width, 8, 0xcad7ce, 1)
      .setDepth(22)
      .setOrigin(0.5);
    const fill = this.add
      .rectangle(x - width / 2, y, width * normalizedValue, 8, 0xffdc6b, 1)
      .setDepth(23)
      .setOrigin(0, 0.5);
    const handle = this.add
      .circle(x - width / 2 + width * normalizedValue, y, 14, 0x28445a, 1)
      .setStrokeStyle(3, 0xfff5dd)
      .setDepth(24);
    const zone = this.add
      .zone(x, y, width + 28, 38)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });

    const applyValue = (rawValue: number): void => {
      const normalized = Phaser.Math.Clamp(rawValue, 0, 1);
      const speed = Math.round(
        MIN_YARN_FALL_SPEED +
          normalized * (MAX_YARN_FALL_SPEED - MIN_YARN_FALL_SPEED)
      );

      fill.width = Math.max(0, width * this.speedToSliderValue(speed));
      handle.x = x - width / 2 + width * this.speedToSliderValue(speed);
      onChange(speed);
    };
    const applyPointerValue = (pointerX: number): void => {
      applyValue((pointerX - (x - width / 2)) / width);
    };

    zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      playButtonClick(this);
      applyPointerValue(pointer.worldX);
    });
    zone.on("pointerover", () => {
      playButtonHover(this);
      handle.setScale(1.05);
    });
    zone.on("pointerout", () => {
      handle.setScale(1);
    });
    zone.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) {
        return;
      }

      applyPointerValue(pointer.worldX);
    });

    return [track, fill, handle, zone];
  }

  private createCatchGoalSlider(
    x: number,
    y: number,
    width: number,
    initialValue: number,
    onChange: (value: number) => void
  ): Phaser.GameObjects.GameObject[] {
    const normalizedValue = this.catchGoalToSliderValue(initialValue);
    const track = this.add
      .rectangle(x, y, width, 8, 0xcad7ce, 1)
      .setDepth(22)
      .setOrigin(0.5);
    const fill = this.add
      .rectangle(x - width / 2, y, width * normalizedValue, 8, 0xffdc6b, 1)
      .setDepth(23)
      .setOrigin(0, 0.5);
    const handle = this.add
      .circle(x - width / 2 + width * normalizedValue, y, 14, 0x28445a, 1)
      .setStrokeStyle(3, 0xfff5dd)
      .setDepth(24);
    const zone = this.add
      .zone(x, y, width + 28, 38)
      .setDepth(25)
      .setInteractive({ useHandCursor: true });

    const applyValue = (rawValue: number): void => {
      const normalized = Phaser.Math.Clamp(rawValue, 0, 1);
      const catchGoal = Math.round(
        MIN_CATCH_GOAL + normalized * (MAX_CATCH_GOAL - MIN_CATCH_GOAL)
      );

      fill.width = Math.max(0, width * this.catchGoalToSliderValue(catchGoal));
      handle.x = x - width / 2 + width * this.catchGoalToSliderValue(catchGoal);
      onChange(catchGoal);
    };
    const applyPointerValue = (pointerX: number): void => {
      applyValue((pointerX - (x - width / 2)) / width);
    };

    zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      playButtonClick(this);
      applyPointerValue(pointer.worldX);
    });
    zone.on("pointerover", () => {
      playButtonHover(this);
      handle.setScale(1.05);
    });
    zone.on("pointerout", () => {
      handle.setScale(1);
    });
    zone.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) {
        return;
      }

      applyPointerValue(pointer.worldX);
    });

    return [track, fill, handle, zone];
  }

  private createPanelButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void
  ): Phaser.GameObjects.GameObject[] {
    const background = this.add
      .rectangle(x, y, 168, 54, 0xffdc6b, 1)
      .setStrokeStyle(3, 0x28445a)
      .setDepth(22);
    const text = this.add
      .text(x, y, label, {
        fontFamily: "Trebuchet MS",
        fontSize: "28px",
        fontStyle: "bold",
        color: COLORS.TEXT_DARK
      })
      .setOrigin(0.5)
      .setDepth(23);
    const zone = this.add
      .zone(x, y, 168, 54)
      .setDepth(24)
      .setInteractive({ useHandCursor: true });

    zone.on("pointerover", () => {
      playButtonHover(this);
      background.setScale(1.03);
      text.setScale(1.03);
    });
    zone.on("pointerout", () => {
      background.setScale(1);
      text.setScale(1);
    });
    zone.on("pointerup", () => {
      playButtonClick(this);
      onClick();
    });

    return [background, text, zone];
  }

  private speedToSliderValue(speed: number): number {
    return (
      (speed - MIN_YARN_FALL_SPEED) /
      (MAX_YARN_FALL_SPEED - MIN_YARN_FALL_SPEED)
    );
  }

  private catchGoalToSliderValue(catchGoal: number): number {
    return (
      (catchGoal - MIN_CATCH_GOAL) /
      (MAX_CATCH_GOAL - MIN_CATCH_GOAL)
    );
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
