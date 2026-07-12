import Phaser from "phaser";

import type { LetterCatchVariant } from "../modes/letter-catch/LetterCatchConfig";
import { COLORS, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";
import { playButtonClick, playButtonHover } from "../utils/uiSound";

type MenuFamily = "fossil-dig" | "cat-catch" | "barn-door-vowels";

interface MainMenuSceneData {
  family?: MenuFamily;
}

interface MenuOption {
  label: string;
  sceneKey: string;
  sceneData?: {
    variant?: "cvc" | LetterCatchVariant;
  };
}

export class MainMenuScene extends Phaser.Scene {
  private family: MenuFamily = "fossil-dig";
  private options: MenuOption[] = [];
  private selectedIndex = 0;
  private optionCards: Phaser.GameObjects.Container[] = [];
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENE_KEYS.MAIN_MENU);
  }

  init(data: MainMenuSceneData): void {
    this.family = data.family ?? "fossil-dig";
    this.options = this.getOptionsForFamily(this.family);
    this.selectedIndex = 0;
    this.optionCards = [];
    this.optionTexts = [];
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.SKY);

    let heading = "Kitten Catch";
    let subheading = "Choose whether to catch vowels or consonants.";

    switch (this.family) {
      case "fossil-dig":
        heading = "Fossil Dig";
        subheading = "Choose a Fossil Dig lesson.";
        break;
      case "barn-door-vowels":
        heading = "Barn Door Vowels";
        subheading = "Start learning about open and closed vowels.";
        break;
      case "cat-catch":
        break;
    }

    this.add
      .text(GAME_WIDTH / 2, 120, heading, {
        fontFamily: "Trebuchet MS",
        fontSize: "54px",
        fontStyle: "bold",
        color: "#2d1f14"
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        190,
        `${subheading}\nUse arrow keys + Enter, or click a card.`,
        {
          fontFamily: "Trebuchet MS",
          fontSize: "24px",
          color: "#4b5563",
          align: "center"
        }
      )
      .setOrigin(0.5);

    this.options.forEach((option, index) => {
      const y = 340 + index * 110;
      const card = this.add
        .rectangle(GAME_WIDTH / 2, y, 520, 84, 0xf6edd7)
        .setStrokeStyle(4, 0x5e4127);
      const text = this.add
        .text(GAME_WIDTH / 2, y, option.label, {
          fontFamily: "Trebuchet MS",
          fontSize: "30px",
          fontStyle: "bold",
          color: "#2d1f14"
        })
        .setOrigin(0.5);

      this.add
        .zone(GAME_WIDTH / 2, y, 520, 84)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          this.selectedIndex = index;
          playButtonHover(this);
          this.refreshSelection();
        })
        .on("pointerup", () => {
          this.selectedIndex = index;
          playButtonClick(this);
          this.startSelectedMode();
        });

      const container = this.add.container(0, 0, [card, text]);
      this.optionCards.push(container);
      this.optionTexts.push(text);
    });

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.enterKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );
    this.escapeKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );

    this.add
      .text(
        GAME_WIDTH / 2,
        650,
        "Press Esc to return to the game title screen.",
        {
          fontFamily: "Trebuchet MS",
          fontSize: "22px",
          color: "#4b5563"
        }
      )
      .setOrigin(0.5);

    this.refreshSelection();
  }

  update(): void {
    if (!this.cursors || !this.enterKey || !this.escapeKey) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      playButtonClick(this);
      this.scene.start(this.getTitleSceneForFamily());
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
      playButtonHover(this);
      this.refreshSelection();
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.selectedIndex =
        (this.selectedIndex - 1 + this.options.length) % this.options.length;
      playButtonHover(this);
      this.refreshSelection();
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      playButtonClick(this);
      this.startSelectedMode();
    }
  }

  private refreshSelection(): void {
    this.optionTexts.forEach((text, index) => {
      const isSelected = index === this.selectedIndex;
      const card = this.optionCards[index]?.list[0] as
        | Phaser.GameObjects.Rectangle
        | undefined;

      text.setScale(isSelected ? 1.04 : 1);
      text.setColor(isSelected ? COLORS.HIGHLIGHT : "#2d1f14");
      text.setStroke("#5e4127", isSelected ? 6 : 0);
      card?.setFillStyle(isSelected ? 0xfff6d8 : 0xf6edd7);
      card?.setStrokeStyle(4, isSelected ? 0xa35a14 : 0x5e4127);
    });
  }

  private startSelectedMode(): void {
    const option = this.options[this.selectedIndex];
    this.scene.start(option.sceneKey, option.sceneData);
  }

  private getOptionsForFamily(family: MenuFamily): MenuOption[] {
    if (family === "cat-catch") {
      return [
        {
          label: "Catch Vowels",
          sceneKey: SCENE_KEYS.LETTER_CATCH,
          sceneData: { variant: "vowels" }
        },
        {
          label: "Catch Consonants",
          sceneKey: SCENE_KEYS.LETTER_CATCH,
          sceneData: { variant: "consonants" }
        }
      ];
    }
    else if (family === "barn-door-vowels") {
      return [
        {
          label: "Open & Closed Vowels",
          sceneKey: SCENE_KEYS.BARN_DOOR_VOWELS,
          sceneData: { variant: "vowels" }
        }
      ]
    }

    return [
      {
        label: "CVC Words",
        sceneKey: SCENE_KEYS.FOSSIL_DIG,
        sceneData: { variant: "cvc" }
      }
    ];
  }

  private getTitleSceneForFamily(): string {
    switch (this.family) {
      case "cat-catch": return SCENE_KEYS.CAT_CATCH_TITLE;
      case "fossil-dig": return SCENE_KEYS.FOSSIL_DIG_TITLE;
      case "barn-door-vowels": return SCENE_KEYS.BARN_DOOR_VOWELS_TITLE;
    }
  }
}
