import Phaser from "phaser";

import {
  getConfiguredBgmVolume,
  loadParentalSettings,
  saveParentalSettings
} from "../settings/parentalSettings";
import { ASSET_KEYS } from "../utils/assetKeys";
import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";
import { playButtonClick, playButtonHover } from "../utils/uiSound";

interface TitleMenuButton {
  button: Phaser.GameObjects.Image;
  hitZone: Phaser.GameObjects.Zone;
  activeTextureKey: string;
  inactiveTextureKey: string;
  onClick: () => void;
}

const TITLE_BUTTON_HEIGHT = 64;
const TITLE_BUTTON_SELECTED_SCALE = 1.04;

export class TitleScene extends Phaser.Scene {
  private selectedIndex = 0;
  private buttons: TitleMenuButton[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private overlayVisible = false;
  private overlay?: Phaser.GameObjects.Container;
  private bgm?: Phaser.Sound.BaseSound;

  constructor() {
    super(SCENE_KEYS.TITLE);
  }

  create(): void {
    this.resetTitleCamera();
    this.startBackgroundMusic();

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

    this.createButton(
      0,
      540,
      ASSET_KEYS.TITLE_BUTTON_START_ACTIVE,
      ASSET_KEYS.TITLE_BUTTON_START_INACTIVE,
      () => this.startGame()
    );
    this.createButton(
      1,
      615,
      ASSET_KEYS.TITLE_BUTTON_SETTINGS_ACTIVE,
      ASSET_KEYS.TITLE_BUTTON_SETTINGS_INACTIVE,
      () => this.showSettingsOverlay()
    );
    this.createButton(
      2,
      690,
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

  private resetTitleCamera(): void {
    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(1);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
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

  private createButton(
    index: number,
    y: number,
    activeTextureKey: string,
    inactiveTextureKey: string,
    onClick: () => void
  ): void {
    const button = this.add
      .image(GAME_WIDTH / 2, y, inactiveTextureKey)
      .setDepth(7);
    const source = button.texture.getSourceImage() as { width: number; height: number };
    const scale = TITLE_BUTTON_HEIGHT / source.height;
    const width = source.width * scale;
    const height = source.height * scale;

    button.setDisplaySize(width, height);
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
      button,
      hitZone,
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
      entry.hitZone.setSize(
        source.width * baseScale,
        source.height * baseScale
      );
    });
  }

  private activateSelection(): void {
    if (!this.buttons[this.selectedIndex]) {
      return;
    }

    playButtonClick(this);
    this.buttons[this.selectedIndex].onClick();
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

  private startBackgroundMusic(): void {
    const existingSound = this.sound.get(ASSET_KEYS.DIG_BGM);
    const bgmVolume = getConfiguredBgmVolume();
    if (existingSound) {
      this.bgm = existingSound;
      (
        existingSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound
      ).setVolume(bgmVolume);
      if (!existingSound.isPlaying) {
        existingSound.play({
          loop: true,
          volume: bgmVolume
        });
      }
    } else {
      this.bgm = this.sound.add(ASSET_KEYS.DIG_BGM, {
        loop: true,
        volume: bgmVolume
      });
      this.bgm.play();
    }
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
    const settings = loadParentalSettings();
    this.destroyOverlay();

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
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 620, 520, 0xf6edd7)
      .setStrokeStyle(4, 0x5e4127)
      .setDepth(11);
    const title = this.add
      .text(GAME_WIDTH / 2, 176, "Parental Settings", {
        fontFamily: "Trebuchet MS",
        fontSize: "36px",
        color: "#2d1f14",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(12);
    const helpText = this.add
      .text(
        GAME_WIDTH / 2,
        226,
        "Adjust the CVC dig length to fit your child's attention span.",
        {
          fontFamily: "Trebuchet MS",
          fontSize: "22px",
          color: "#4b5563",
          align: "center"
        }
      )
      .setOrigin(0.5)
      .setDepth(12);
    const areaValue = this.add
      .text(416, 304, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "30px",
        color: "#2d1f14",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(12);
    const fossilValue = this.add
      .text(416, 390, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "30px",
        color: "#2d1f14",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(12);
    const bgmValue = this.add
      .text(472, 470, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "24px",
        color: "#2d1f14",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(12);
    const sfxValue = this.add
      .text(472, 548, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "24px",
        color: "#2d1f14",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(12);

    const refreshTexts = (): void => {
      areaValue.setText(String(settings.cvcDiggableAreaCount));
      fossilValue.setText(String(settings.cvcFossilsPerArea));
      bgmValue.setText(`${Math.round(settings.bgmVolume * 100)}%`);
      sfxValue.setText(`${Math.round(settings.sfxVolume * 100)}%`);
    };
    const syncBgmVolume = (): void => {
      const bgm = this.sound.get(ASSET_KEYS.DIG_BGM);

      if (!bgm) {
        return;
      }

      (
        bgm as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound
      ).setVolume(settings.bgmVolume);
    };
    const persistSettings = (): void => {
      const saved = saveParentalSettings(settings);
      settings.cvcDiggableAreaCount = saved.cvcDiggableAreaCount;
      settings.cvcFossilsPerArea = saved.cvcFossilsPerArea;
      settings.bgmVolume = saved.bgmVolume;
      settings.sfxVolume = saved.sfxVolume;
      syncBgmVolume();
      refreshTexts();
    };

    const controls = [
      this.add
        .text(242, 304, "Diggable Areas", {
          fontFamily: "Trebuchet MS",
          fontSize: "28px",
          color: "#2d1f14",
          fontStyle: "bold"
        })
        .setOrigin(0.5)
        .setDepth(12),
      this.add
        .text(242, 390, "Fossils Per Area", {
          fontFamily: "Trebuchet MS",
          fontSize: "28px",
          color: "#2d1f14",
          fontStyle: "bold"
        })
        .setOrigin(0.5)
        .setDepth(12),
      areaValue,
      fossilValue,
      ...this.createStepperButton(344, 304, "-", () => {
        settings.cvcDiggableAreaCount -= 1;
        persistSettings();
      }),
      ...this.createStepperButton(488, 304, "+", () => {
        settings.cvcDiggableAreaCount += 1;
        persistSettings();
      }),
      ...this.createStepperButton(344, 390, "-", () => {
        settings.cvcFossilsPerArea -= 1;
        persistSettings();
      }),
      ...this.createStepperButton(488, 390, "+", () => {
        settings.cvcFossilsPerArea += 1;
        persistSettings();
      }),
      this.add
        .text(182, 470, "BGM Volume", {
          fontFamily: "Trebuchet MS",
          fontSize: "28px",
          color: "#2d1f14",
          fontStyle: "bold"
        })
        .setOrigin(0.5)
        .setDepth(12),
      this.add
        .text(182, 548, "SFX Volume", {
          fontFamily: "Trebuchet MS",
          fontSize: "28px",
          color: "#2d1f14",
          fontStyle: "bold"
        })
        .setOrigin(0.5)
        .setDepth(12),
      bgmValue,
      sfxValue,
      ...this.createVolumeSlider(360, 470, 180, settings.bgmVolume, (value) => {
        settings.bgmVolume = value;
        persistSettings();
      }),
      ...this.createVolumeSlider(360, 548, 180, settings.sfxVolume, (value) => {
        settings.sfxVolume = value;
        persistSettings();
      })
    ];
    const doneButton = this.createPanelButton(
      GAME_WIDTH / 2,
      614,
      "Done",
      () => this.hideOverlay()
    );
    const footer = this.add
      .text(
        GAME_WIDTH / 2,
        666,
        "If diggable areas is 1, all fossils stay in one area and are announced one at a time.",
        {
          fontFamily: "Trebuchet MS",
          fontSize: "18px",
          color: "#4b5563",
          align: "center",
          wordWrap: { width: 520 }
        }
      )
      .setOrigin(0.5)
      .setDepth(12);

    refreshTexts();
    backdrop.on("pointerdown", () => {
      playButtonClick(this);
      this.hideOverlay();
    });

    this.overlay = this.add.container(0, 0, [
      backdrop,
      panel,
      title,
      helpText,
      footer,
      ...controls,
      ...doneButton
    ]);
    this.overlay.setDepth(10);
    this.overlayVisible = true;
  }

  private showOverlay(titleText: string, bodyText: string): void {
    this.destroyOverlay();
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
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 44, titleText, {
        fontFamily: "Trebuchet MS",
        fontSize: "36px",
        color: "#2d1f14",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(12);
    const message = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 14, bodyText, {
        fontFamily: "Trebuchet MS",
        fontSize: "22px",
        color: "#4b5563",
        align: "center"
      })
      .setOrigin(0.5)
      .setDepth(12);

    backdrop.on("pointerdown", () => {
      playButtonClick(this);
      this.hideOverlay();
    });

    this.overlay = this.add.container(0, 0, [backdrop, panel, title, message]);
    this.overlay.setDepth(10);
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

  private createStepperButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void
  ): Phaser.GameObjects.GameObject[] {
    const background = this.add
      .circle(x, y, 22, 0xffdc6b, 1)
      .setStrokeStyle(2, 0x5e4127)
      .setDepth(12);
    const text = this.add
      .text(x, y - 1, label, {
        fontFamily: "Trebuchet MS",
        fontSize: "28px",
        color: "#2d1f14",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(13);
    const zone = this.add
      .zone(x, y, 44, 44)
      .setDepth(14)
      .setInteractive({ useHandCursor: true });

    zone.on("pointerover", () => {
      playButtonHover(this);
      background.setScale(1.05);
      text.setScale(1.05);
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

  private createPanelButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void
  ): Phaser.GameObjects.GameObject[] {
    const background = this.add
      .rectangle(x, y, 168, 54, 0xffdc6b, 1)
      .setStrokeStyle(3, 0x5e4127)
      .setDepth(12);
    const text = this.add
      .text(x, y, label, {
        fontFamily: "Trebuchet MS",
        fontSize: "28px",
        color: "#2d1f14",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(13);
    const zone = this.add
      .zone(x, y, 168, 54)
      .setDepth(14)
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

  private createVolumeSlider(
    x: number,
    y: number,
    width: number,
    initialValue: number,
    onChange: (value: number) => void
  ): Phaser.GameObjects.GameObject[] {
    const track = this.add
      .rectangle(x, y, width, 8, 0xd0c3ab, 1)
      .setDepth(12)
      .setOrigin(0.5);
    const fill = this.add
      .rectangle(x - width / 2, y, width * initialValue, 8, 0xffdc6b, 1)
      .setDepth(13)
      .setOrigin(0, 0.5);
    const handle = this.add
      .circle(x - width / 2 + width * initialValue, y, 14, 0x5e4127, 1)
      .setStrokeStyle(3, 0xfff3ca)
      .setDepth(14);
    const zone = this.add
      .zone(x, y, width + 28, 34)
      .setDepth(15)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const applyValue = (rawValue: number): void => {
      const value = Math.round(Phaser.Math.Clamp(rawValue, 0, 1) * 100) / 100;
      fill.width = Math.max(0, width * value);
      handle.x = x - width / 2 + width * value;
      onChange(value);
    };

    const applyPointerValue = (pointerX: number): void => {
      const value = (pointerX - (x - width / 2)) / width;
      applyValue(value);
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
}
