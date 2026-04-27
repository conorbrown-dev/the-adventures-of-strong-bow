import Phaser from "phaser";

import type { FossilDigVariant } from "../modes/fossil-dig/FossilDigConfig";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";

interface MenuOption {
  label: string;
  variant: FossilDigVariant;
}

export class MainMenuScene extends Phaser.Scene {
  private readonly options: MenuOption[] = [
    { label: "Fossil Dig: CVC Words", variant: "cvc" },
    { label: "Fossil Dig: Vowels & Consonants", variant: "letters" }
  ];

  private selectedIndex = 0;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private enterKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super(SCENE_KEYS.MAIN_MENU);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.SKY);

    this.add
      .text(GAME_WIDTH / 2, 120, "Molly's Learning Game", {
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
        "Pick a learning dig mode.\nUse arrow keys + Enter, or click a card.",
        {
          fontFamily: "Trebuchet MS",
          fontSize: "24px",
          color: "#4b5563",
          align: "center"
        }
      )
      .setOrigin(0.5);

    this.optionTexts = this.options.map((option, index) => {
      const text = this.add
        .text(GAME_WIDTH / 2, 320 + index * 110, option.label, {
          fontFamily: "Trebuchet MS",
          fontSize: "30px",
          fontStyle: "bold",
          color: "#2d1f14",
          backgroundColor: "#f6edd7",
          padding: { left: 22, right: 22, top: 18, bottom: 18 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          this.selectedIndex = index;
          this.refreshSelection();
        })
        .on("pointerdown", () => {
          this.startSelectedMode();
        });

      return text;
    });

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 70,
        "Prototype loop: dig -> collect fossils -> find gem -> run from the dino",
        {
          fontFamily: "Trebuchet MS",
          fontSize: "22px",
          color: "#2d1f14"
        }
      )
      .setOrigin(0.5);

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
      this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
      this.refreshSelection();
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.selectedIndex =
        (this.selectedIndex - 1 + this.options.length) % this.options.length;
      this.refreshSelection();
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.startSelectedMode();
    }
  }

  private refreshSelection(): void {
    this.optionTexts.forEach((text, index) => {
      const isSelected = index === this.selectedIndex;
      text.setScale(isSelected ? 1.04 : 1);
      text.setColor(isSelected ? COLORS.HIGHLIGHT : "#2d1f14");
      text.setStroke("#5e4127", isSelected ? 6 : 0);
    });
  }

  private startSelectedMode(): void {
    const option = this.options[this.selectedIndex];
    this.scene.start(SCENE_KEYS.FOSSIL_DIG, { variant: option.variant });
  }
}
