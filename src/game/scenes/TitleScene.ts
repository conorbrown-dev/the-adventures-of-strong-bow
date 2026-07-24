import Phaser from "phaser";

import { ASSET_KEYS } from "../utils/assetKeys";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";
import { playButtonClick, playButtonHover } from "../utils/uiSound";

type HubSection = "home" | "learning" | "games";

interface HubButton {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  onClick: () => void;
}

export class TitleScene extends Phaser.Scene {
  private section: HubSection = "home";
  private buttons: HubButton[] = [];
  private selectedIndex = 0;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;

  constructor() { super(SCENE_KEYS.TITLE); }

  create(): void {
    this.stopFossilDigBackgroundMusic();
    this.createBackground();
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.escapeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.showSection("home");
  }

  update(): void {
    if (!this.cursors || !this.enterKey || !this.escapeKey || !this.buttons.length) return;
    if (Phaser.Input.Keyboard.JustDown(this.escapeKey) && this.section !== "home") {
      this.showSection("home");
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.selectedIndex = (this.selectedIndex + 1) % this.buttons.length;
      playButtonHover(this);
      this.refreshSelection();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this.selectedIndex = (this.selectedIndex - 1 + this.buttons.length) % this.buttons.length;
      playButtonHover(this);
      this.refreshSelection();
    }
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) this.activateSelection();
  }

  private createBackground(): void {
    this.cameras.main.setBackgroundColor(0x070b2e);
    const background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSET_KEYS.LEARNING_ACADEMY_BACKGROUND).setDepth(-2);
    background.setScale(Math.max(GAME_WIDTH / background.width, GAME_HEIGHT / background.height));
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05051c, 0.24).setDepth(-1);
  }

  private showSection(section: HubSection): void {
    this.section = section;
    this.buttons.forEach((button) => button.container.destroy(true));
    this.buttons = [];
    this.selectedIndex = 0;
    this.add.text(GAME_WIDTH / 2, 105, "Molly's Learning Academy", {
      fontFamily: "Trebuchet MS", fontSize: "56px", fontStyle: "bold", color: "#fff8e8", stroke: "#233047", strokeThickness: 8
    }).setOrigin(0.5);
    const heading = section === "home" ? "Choose an adventure" : section === "learning" ? "Lessons & Quizzes" : "Learning Games";
    this.add.text(GAME_WIDTH / 2, 180, heading, { fontFamily: "Trebuchet MS", fontSize: "30px", fontStyle: "bold", color: "#8ff8ff" }).setOrigin(0.5);

    if (section === "home") {
      this.addButton(300, "Lessons & Quizzes", "Open lessons and quizzes", () => this.showSection("learning"));
      this.addButton(420, "Games", "Open learning games", () => this.showSection("games"));
    } else if (section === "learning") {
      this.addButton(280, "Math Lessons", "Math Lessons", () => window.dispatchEvent(new Event("quiz-ui:open")));
      this.addButton(400, "Reading & Language", "Reading and Language Lessons", () => window.dispatchEvent(new Event("quiz-ui:open")));
      this.addButton(520, "Back", "Back", () => this.showSection("home"));
    } else {
      this.addButton(250, "Vowel Sounds", "Vowel Sounds", () => this.scene.start(SCENE_KEYS.BARN_DOOR_VOWELS_TITLE));
      this.addButton(350, "Sight Word Studio", "Sight Word Studio", () => this.scene.start(SCENE_KEYS.SIGHT_WORDS_TITLE));
      this.addButton(450, "Addition Lab", "Addition Lab", () => this.scene.start(SCENE_KEYS.ADDITION_TITLE));
      this.addButton(550, "Fossil Dig", "Fossil Dig", () => this.scene.start(SCENE_KEYS.FOSSIL_DIG_TITLE));
      this.addButton(650, "Back", "Back", () => this.showSection("home"));
    }
    this.add.text(GAME_WIDTH / 2, 735, section === "home" ? "Use arrow keys + Enter, or click a button." : "Press Esc to go back.", { fontFamily: "Trebuchet MS", fontSize: "20px", color: "#fff8e8" }).setOrigin(0.5);
    this.refreshSelection();
  }

  private addButton(y: number, label: string, spokenLabel: string, onClick: () => void): void {
    const background = this.add.rectangle(GAME_WIDTH / 2, y, 470, 82, 0xfff6d8, 0.98).setStrokeStyle(4, 0x233047);
    const text = this.add.text(GAME_WIDTH / 2, y, label, { fontFamily: "Trebuchet MS", fontSize: "34px", fontStyle: "bold", color: COLORS.TEXT_DARK }).setOrigin(0.5);
    const container = this.add.container(0, 0, [background, text]);
    this.add.zone(GAME_WIDTH / 2, y, 470, 82).setInteractive({ useHandCursor: true })
      .on("pointerover", () => { this.selectedIndex = this.buttons.length; playButtonHover(this); this.speak(spokenLabel); this.refreshSelection(); })
      .on("pointerup", () => { playButtonClick(this); onClick(); });
    this.buttons.push({ container, background, label: text, onClick });
  }

  private refreshSelection(): void {
    this.buttons.forEach((button, index) => {
      const selected = index === this.selectedIndex;
      button.container.setScale(selected ? 1.04 : 1);
      button.background.setFillStyle(selected ? 0xffdc6b : 0xfff6d8, 0.98);
      button.background.setStrokeStyle(4, selected ? 0xa35a14 : 0x233047);
    });
  }

  private activateSelection(): void { const button = this.buttons[this.selectedIndex]; if (button) { playButtonClick(this); button.onClick(); } }
  private speak(text: string): void { if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } }
  private stopFossilDigBackgroundMusic(): void { const bgm = this.sound.get(ASSET_KEYS.DIG_BGM); if (bgm?.isPlaying) bgm.stop(); bgm?.destroy(); }
}
