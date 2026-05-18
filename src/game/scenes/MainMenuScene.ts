import Phaser from "phaser";

import type { FossilDigVariant } from "../modes/fossil-dig/FossilDigConfig";
import { COLORS, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";
import { playButtonClick, playButtonHover } from "../utils/uiSound";

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
  private optionCards: Phaser.GameObjects.Container[] = [];
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

    this.options.forEach((option, index) => {
      const y = 320 + index * 110;
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

    this.refreshSelection();
  }

  update(): void {
    if (!this.cursors || !this.enterKey) {
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
    this.scene.start(SCENE_KEYS.FOSSIL_DIG, { variant: option.variant });
  }
}
