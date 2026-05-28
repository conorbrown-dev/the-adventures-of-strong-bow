import Phaser from "phaser";

import type { FossilDigVariant } from "../modes/fossil-dig/FossilDigConfig";
import type { FossilDigStageTheme } from "../modes/fossil-dig/FossilDigStageTheme";
import { playButtonClick, playButtonHover } from "../utils/uiSound";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";

interface WinSceneData {
  variant?: FossilDigVariant;
  stageTheme?: FossilDigStageTheme;
  heading?: string;
  subheading?: string;
  playAgainLabel?: string;
  playAgainSceneKey?: string;
  playAgainData?: Record<string, unknown>;
}

export class WinScene extends Phaser.Scene {
  private variant: FossilDigVariant = "cvc";
  private stageTheme?: FossilDigStageTheme;
  private heading = "You escaped the Wordosaur!";
  private subheading = "Choose what to do next.";
  private playAgainLabel = "Play Again";
  private playAgainSceneKey: string = SCENE_KEYS.FOSSIL_DIG;
  private playAgainData: Record<string, unknown> = { variant: "cvc" };
  private enterKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENE_KEYS.WIN);
  }

  init(data: WinSceneData): void {
    this.variant = data.variant ?? "cvc";
    this.stageTheme = data.stageTheme;
    this.heading = data.heading ?? "You escaped the Wordosaur!";
    this.subheading = data.subheading ?? "Choose what to do next.";
    this.playAgainLabel = data.playAgainLabel ?? "Play Again";
    this.playAgainSceneKey = data.playAgainSceneKey ?? SCENE_KEYS.FOSSIL_DIG;
    this.playAgainData = data.playAgainData ?? {
      variant: this.variant,
      stageTheme: this.stageTheme
    };
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0xfff7d6);
    const confettiColors = [
      0xf97316,
      0x22c55e,
      0x0ea5e9,
      0xeab308,
      0xec4899,
      0x8b5cf6
    ];

    for (let index = 0; index < 18; index += 1) {
      this.add.circle(
        Phaser.Math.Between(40, GAME_WIDTH - 40),
        Phaser.Math.Between(40, GAME_HEIGHT - 40),
        Phaser.Math.Between(8, 18),
        confettiColors[index % confettiColors.length],
        0.8
      );
    }

    this.add
      .text(GAME_WIDTH / 2, 210, this.heading, {
        fontFamily: "Trebuchet MS",
        fontSize: "54px",
        fontStyle: "bold",
        color: "#2d1f14",
        align: "center"
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        308,
        this.subheading,
        {
          fontFamily: "Trebuchet MS",
          fontSize: "28px",
          color: "#4b5563"
        }
      )
      .setOrigin(0.5);

    this.createButton(
      GAME_WIDTH / 2,
      408,
      this.playAgainLabel,
      () => {
        this.scene.start(this.playAgainSceneKey, this.playAgainData);
      }
    );
    this.createButton(
      GAME_WIDTH / 2,
      500,
      "Title Screen",
      () => {
        this.scene.start(SCENE_KEYS.TITLE);
      }
    );

    this.add
      .text(
        GAME_WIDTH / 2,
        602,
        "Press Enter to play again or Esc for the title screen.",
        {
          fontFamily: "Trebuchet MS",
          fontSize: "24px",
          color: COLORS.TEXT_DARK
        }
      )
      .setOrigin(0.5);

    this.enterKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );
    this.escapeKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );
  }

  update(): void {
    if (this.enterKey && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.scene.start(this.playAgainSceneKey, this.playAgainData);
      return;
    }

    if (this.escapeKey && Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.scene.start(SCENE_KEYS.TITLE);
    }
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onActivate: () => void
  ): void {
    const background = this.add
      .rectangle(0, 0, 300, 62, 0xf6edd7, 1)
      .setStrokeStyle(3, 0x5e4127);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Trebuchet MS",
        fontSize: "30px",
        color: COLORS.TEXT_DARK,
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    const button = this.add.container(x, y, [background, text]);
    const hitArea = this.add
      .zone(x, y, 300, 62)
      .setInteractive({ useHandCursor: true });

    hitArea.on("pointerover", () => {
      playButtonHover(this);
      button.setScale(1.04);
    });
    hitArea.on("pointerout", () => {
      button.setScale(1);
    });
    hitArea.on("pointerup", () => {
      playButtonClick(this);
      onActivate();
    });
  }
}
