import Phaser from "phaser";

import { PHONICS_CHALLENGES, type PhonicsChallenge } from "../data/phonicsChallenges";
import { ASSET_KEYS } from "../utils/assetKeys";
import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { addGameNavigation } from "../utils/gameNavigation";
import { SCENE_KEYS } from "../utils/sceneKeys";

const NEON = {
  yellow: 0xffe45c, blue: 0x43baff, orange: 0xff8a3d, purple: 0xc681ff,
  cyan: 0x45f6e5, pink: 0xff70b8, dark: 0x0b0714, panel: 0x130d25,
  ink: "#f7f2ff", muted: "#a99ac3"
} as const;
const CORRECT_ANSWERS_TO_LAUNCH = 5;
const CAR_COLORS = [
  { name: "BLUE", color: 0x2787ff }, { name: "RED", color: 0xef3e43 },
  { name: "HOT PINK", color: 0xff3ca6 }, { name: "NEON GREEN", color: 0x5cff35 },
  { name: "NEON YELLOW", color: 0xf7ff28 }, { name: "NEON ORANGE", color: 0xff8a25 },
  { name: "CYAN", color: 0x27f8ff }, { name: "PURPLE", color: 0x9a58ff },
  { name: "WHITE", color: 0xffffff }
] as const;
type CarColor = (typeof CAR_COLORS)[number];
interface RivalCar { car: Phaser.GameObjects.Image; trail: Phaser.GameObjects.Image; color: CarColor; speed: number; }

export class PhonicsStarshipGameScene extends Phaser.Scene {
  private problem: PhonicsChallenge = PHONICS_CHALLENGES[0];
  private answer = "";
  private problemLayer?: Phaser.GameObjects.Container;
  private answerText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private correctCount = 0;
  private correctCountText?: Phaser.GameObjects.Text;
  private keypadLayer?: Phaser.GameObjects.Container;
  private mathObjects: Phaser.GameObjects.GameObject[] = [];
  private mathStagePanels: Phaser.GameObjects.Rectangle[] = [];
  private backgroundStars: Phaser.GameObjects.Arc[] = [];

  private phase: "learning" | "color-select" | "racing" | "ended" = "learning";
  private player?: Phaser.GameObjects.Image;
  private playerTrail?: Phaser.GameObjects.Image;
  private selectedColor?: CarColor;
  private rivals: RivalCar[] = [];
  private raceStatusText?: Phaser.GameObjects.Text;
  private raceProgressText?: Phaser.GameObjects.Text;
  private boostUntil = 0;
  private brakeUntil = 0;
  private keyboardHandler?: (event: KeyboardEvent) => void;

  constructor() { super(SCENE_KEYS.PHONICS_STARSHIP_GAME); }

  init(): void {
    this.phase = "learning";
    this.answer = "";
    this.correctCount = 0;
    this.mathObjects = [];
    this.mathStagePanels = [];
    this.backgroundStars = [];
    this.rivals = [];
    this.selectedColor = undefined;
    this.boostUntil = 0;
    this.brakeUntil = 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(NEON.dark);
    this.createBackground();
    this.createHeader();
    this.createAnswerArea();
    this.createKeypad();
    this.bindKeyboard();
    addGameNavigation(this);
    this.newProblem();
  }

  update(time: number, delta: number): void {
    if (this.phase === "racing") this.updateRace(time, delta);
  }

  private trackMath<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.mathObjects.push(object);
    return object;
  }

  private createBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, NEON.dark);
    for (let index = 0; index < 75; index += 1) {
      const dot = this.add.circle(Phaser.Math.Between(16, GAME_WIDTH - 16), Phaser.Math.Between(18, GAME_HEIGHT - 18), Phaser.Math.Between(1, 2), 0xffffff, Phaser.Math.FloatBetween(0.12, 0.42));
      dot.setData("scrollSpeed", Phaser.Math.FloatBetween(0.05, 0.28));
      this.backgroundStars.push(dot);
      this.tweens.add({ targets: dot, alpha: 0.08, duration: Phaser.Math.Between(900, 2200), yoyo: true, repeat: -1 });
    }
    this.mathStagePanels.push(
      this.add.rectangle(683, 404, 760, 546, NEON.panel, 0.92).setStrokeStyle(2, NEON.purple, 0.35),
      this.add.rectangle(683, 404, 730, 516, 0x090610, 0.64).setStrokeStyle(1, NEON.cyan, 0.12)
    );
  }

  private createHeader(): void {
    this.trackMath(this.add.text(76, 58, "PHONICS RACING", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "27px", color: "#ffffff", letterSpacing: 2 }));
    this.trackMath(this.add.text(77, 94, "vowels, teams, silent e, and digraphs", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "19px", color: NEON.muted, letterSpacing: 1 }));
    this.correctCountText = this.trackMath(this.add.text(GAME_WIDTH - 75, 70, `CORRECT  0 / ${CORRECT_ANSWERS_TO_LAUNCH}`, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "19px", color: "#ffe45c", letterSpacing: 1 }).setOrigin(1, 0.5));
  }

  private createAnswerArea(): void {
    this.answerText = this.trackMath(this.add.text(GAME_WIDTH / 2, 620, "", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "28px", color: "#45f6e5" }).setOrigin(0.5));
    this.statusText = this.trackMath(this.add.text(GAME_WIDTH / 2, 666, "Choose an answer, or press 1, 2, or 3", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "20px", color: NEON.muted }).setOrigin(0.5));
  }

  private createKeypad(): void {
    const keypadLayer = this.trackMath(this.add.container(0, 0));
    this.keypadLayer = keypadLayer;
  }

  private bindKeyboard(): void {
    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP, Phaser.Input.Keyboard.KeyCodes.DOWN, Phaser.Input.Keyboard.KeyCodes.SPACE
    ]);
    this.keyboardHandler = (event: KeyboardEvent) => {
      if (this.phase === "ended" && event.key.toLowerCase() === "r") { this.scene.restart(); return; }
      if (this.phase === "color-select" && /^[1-9]$/.test(event.key)) { this.selectCarColor(Number(event.key) - 1); return; }
      if (this.phase === "racing") {
        if (event.code === "Space" || event.key === "ArrowUp") this.accelerate();
        if (event.key === "ArrowDown" || event.key.toLowerCase() === "b") this.brake();
        return;
      }
      if (this.phase !== "learning") return;
      if (/^[1-3]$/.test(event.key)) this.selectChoice(Number(event.key) - 1);
    };
    this.input.keyboard?.on("keydown", this.keyboardHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyboardHandler) this.input.keyboard?.off("keydown", this.keyboardHandler);
      this.keyboardHandler = undefined;
      this.input.keyboard?.removeCapture([
        Phaser.Input.Keyboard.KeyCodes.UP, Phaser.Input.Keyboard.KeyCodes.DOWN, Phaser.Input.Keyboard.KeyCodes.SPACE
      ]);
    });
  }

  private refreshAnswer(): void {
    const choiceIndex = Number(this.answer);
    this.answerText?.setText(Number.isInteger(choiceIndex) ? `Selected: ${this.problem.choices[choiceIndex]}` : "");
  }

  private selectChoice(choiceIndex: number): void {
    if (this.phase !== "learning" || choiceIndex >= this.problem.choices.length) return;
    this.answer = String(choiceIndex);
    this.refreshAnswer();
    this.checkAnswer();
  }

  private newProblem(): void {
    this.problem = PHONICS_CHALLENGES[Phaser.Math.Between(0, PHONICS_CHALLENGES.length - 1)] ?? PHONICS_CHALLENGES[0];
    this.answer = "";
    this.statusText?.setText("Choose an answer, or press 1, 2, or 3").setColor(NEON.muted);
    this.refreshAnswer(); this.renderProblem();
  }

  private renderProblem(): void {
    this.problemLayer?.destroy(true);
    const layer = this.trackMath(this.add.container(0, 0)); this.problemLayer = layer;
    layer.add(this.add.text(GAME_WIDTH / 2, 285, this.problem.prompt, {
      fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "36px", color: "#f7f2ff",
      align: "center", wordWrap: { width: 820 }, lineSpacing: 10
    }).setOrigin(0.5));
    this.keypadLayer?.removeAll(true);
    this.problem.choices.forEach((choice, index) => this.createChoiceButton(340 + index * 340, 500, index, choice));
  }

  private createChoiceButton(x: number, y: number, index: number, choice: string): void {
    const bg = this.add.rectangle(x, y, 300, 100, 0x1b1430, 1).setStrokeStyle(3, [NEON.yellow, NEON.cyan, NEON.orange][index], 0.9);
    const label = this.add.text(x, y, `${index + 1}. ${choice}`, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "30px", color: NEON.ink }).setOrigin(0.5);
    const zone = this.add.zone(x, y, 300, 100).setInteractive({ useHandCursor: true })
      .on("pointerover", () => { bg.setFillStyle(0x33244f); label.setScale(1.06); })
      .on("pointerout", () => { bg.setFillStyle(0x1b1430); label.setScale(1); })
      .on("pointerup", () => this.selectChoice(index));
    this.keypadLayer?.add([bg, label, zone]);
  }

  private checkAnswer(): void {
    if (!this.answer) return;
    if (Number(this.answer) !== this.problem.correctChoice) {
      this.statusText?.setText("TRY AGAIN — YOU'VE GOT THIS!").setColor("#ff70b8");
      this.tweens.add({ targets: this.answerText, x: "+=10", duration: 55, yoyo: true, repeat: 3 }); return;
    }
    this.correctCount += 1;
    this.correctCountText?.setText(`CORRECT  ${this.correctCount} / ${CORRECT_ANSWERS_TO_LAUNCH}`);
    this.statusText?.setText(this.correctCount >= CORRECT_ANSWERS_TO_LAUNCH ? "LAUNCH SEQUENCE READY!" : `${this.problem.teachingNote}  NEXT QUESTION LOADING...`).setColor("#45f6e5");
    this.createCorrectAnswerConfetti();
    this.time.delayedCall(750, () => this.correctCount >= CORRECT_ANSWERS_TO_LAUNCH ? this.launchCombat() : this.newProblem());
  }

  private createCorrectAnswerConfetti(): void {
    const colors = [NEON.yellow, NEON.cyan, NEON.pink, NEON.purple, NEON.orange];
    for (let index = 0; index < 32; index += 1) {
      const confetti = this.add.rectangle(
        GAME_WIDTH / 2 + Phaser.Math.Between(-70, 70),
        365 + Phaser.Math.Between(-30, 30),
        Phaser.Math.Between(7, 12),
        Phaser.Math.Between(12, 20),
        Phaser.Utils.Array.GetRandom(colors) ?? NEON.cyan
      ).setRotation(Phaser.Math.FloatBetween(-0.8, 0.8)).setDepth(8);
      this.tweens.add({
        targets: confetti,
        x: confetti.x + Phaser.Math.Between(-260, 260),
        y: confetti.y + Phaser.Math.Between(-140, 220),
        angle: Phaser.Math.Between(-540, 540),
        alpha: 0,
        duration: Phaser.Math.Between(600, 1000),
        ease: "Quad.Out",
        onComplete: () => confetti.destroy()
      });
    }
  }

  private launchCombat(): void {
    if (this.phase !== "learning") return;
    this.phase = "color-select";
    this.mathObjects.forEach((object) => object.destroy(true));
    this.mathObjects = [];
    this.mathStagePanels.forEach((panel) => panel.destroy());
    this.mathStagePanels = [];
    this.backgroundStars.forEach((star) => star.destroy());
    this.backgroundStars = [];
    this.showColorPicker();
  }

  private showColorPicker(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x130d25);
    this.add.text(GAME_WIDTH / 2, 115, "PHONICS RACE UNLOCKED!", { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "47px", color: "#ffffff" }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 175, "Pick your race car color", { fontFamily: "Press Start 2P, monospace", fontSize: "21px", color: "#45f6e5" }).setOrigin(0.5);
    CAR_COLORS.forEach((color, index) => {
      const x = 325 + (index % 3) * 360;
      const y = 285 + Math.floor(index / 3) * 140;
      const bg = this.add.rectangle(x, y, 310, 104, 0x211735).setStrokeStyle(4, color.color);
      const car = this.add.image(x - 96, y, ASSET_KEYS.RACING_CAR).setDisplaySize(76, 38).setTint(color.color);
      const label = this.add.text(x + 35, y, `${index + 1}. ${color.name}`, { fontFamily: "Press Start 2P, monospace", fontSize: "16px", color: `#${color.color.toString(16).padStart(6, "0")}` }).setOrigin(0.5);
      this.add.zone(x, y, 310, 104).setInteractive({ useHandCursor: true })
        .on("pointerover", () => { bg.setFillStyle(color.color, 0.28); car.setScale(1.1); })
        .on("pointerout", () => { bg.setFillStyle(0x211735); car.setScale(1); })
        .on("pointerup", () => this.selectCarColor(index));
      void label;
    });
    this.add.text(GAME_WIDTH / 2, 705, "CLICK A CAR OR PRESS 1–9", { fontFamily: "Press Start 2P, monospace", fontSize: "16px", color: NEON.muted }).setOrigin(0.5);
  }

  private selectCarColor(index: number): void {
    const color = CAR_COLORS[index];
    if (this.phase !== "color-select" || !color) return;
    this.selectedColor = color;
    this.children.removeAll(true);
    this.startRace();
  }

  private startRace(): void {
    this.phase = "racing";
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x10101b);
    for (let x = 90; x < GAME_WIDTH; x += 180) this.add.image(x, GAME_HEIGHT / 2, ASSET_KEYS.RACING_ROAD).setDisplaySize(180, GAME_HEIGHT).setDepth(0);
    this.add.rectangle(1180, GAME_HEIGHT / 2, 24, GAME_HEIGHT, 0xffffff).setDepth(1);
    for (let y = 22; y < GAME_HEIGHT; y += 44) this.add.rectangle(1180, y, 24, 22, 0x111111).setDepth(2);
    this.playerTrail = this.add.image(150, 510, ASSET_KEYS.RACING_CAR_TRAIL).setDisplaySize(76, 38).setTint(this.selectedColor!.color).setAlpha(0.45).setDepth(2);
    this.player = this.add.image(180, 510, ASSET_KEYS.RACING_CAR).setDisplaySize(76, 38).setTint(this.selectedColor!.color).setDepth(4);
    this.raceStatusText = this.add.text(GAME_WIDTH / 2, 62, "GO!  WRECK RIVALS OR REACH THE CHECKERED FLAG", { fontFamily: "Press Start 2P, monospace", fontSize: "18px", color: "#ffffff" }).setOrigin(0.5).setDepth(8);
    this.raceProgressText = this.add.text(46, 48, "RACE  0%", { fontFamily: "Press Start 2P, monospace", fontSize: "17px", color: "#ffffff" }).setDepth(8);
    this.createRaceControl(970, 690, "▲ ACCEL", "SPACE / ↑", NEON.cyan, () => this.accelerate());
    this.createRaceControl(1190, 690, "▼ BRAKE", "B / ↓", NEON.pink, () => this.brake());
    CAR_COLORS.filter((color) => color.name !== this.selectedColor?.name).slice(0, 6).forEach((color, index) => this.spawnRival(color, 360 + index * 135, 420 + (index % 3) * 90, Phaser.Math.FloatBetween(0.13, 0.22)));
  }

  private createRaceControl(x: number, y: number, label: string, key: string, color: number, action: () => void): void {
    const bg = this.add.rectangle(x, y, 190, 76, 0x161225).setStrokeStyle(4, color);
    const title = this.add.text(x, y - 12, label, { fontFamily: "Press Start 2P, monospace", fontSize: "15px", color: "#ffffff" }).setOrigin(0.5);
    const hint = this.add.text(x, y + 17, key, { fontFamily: "Press Start 2P, monospace", fontSize: "11px", color: "#bdb5d4" }).setOrigin(0.5);
    this.add.zone(x, y, 190, 76).setInteractive({ useHandCursor: true }).on("pointerdown", action).on("pointerover", () => bg.setFillStyle(color, 0.35)).on("pointerout", () => bg.setFillStyle(0x161225));
    void title; void hint;
  }

  private spawnRival(color: CarColor, x: number, y: number, speed: number): void {
    const trail = this.add.image(x - 34, y, ASSET_KEYS.RACING_CAR_TRAIL).setDisplaySize(70, 35).setTint(color.color).setAlpha(0.34).setDepth(2);
    const car = this.add.image(x, y, ASSET_KEYS.RACING_CAR).setDisplaySize(70, 35).setTint(color.color).setDepth(4);
    this.rivals.push({ car, trail, color, speed });
  }

  private accelerate(): void { if (this.phase === "racing") { this.boostUntil = this.time.now + 1000; this.raceStatusText?.setText("TURBO BURST!").setColor("#f7ff28"); } }
  private brake(): void { if (this.phase === "racing") { this.brakeUntil = this.time.now + 700; this.raceStatusText?.setText("BRAKING!").setColor("#ff70b8"); } }

  private updateRace(time: number, delta: number): void {
    if (!this.player || !this.playerTrail) return;
    const isBoosting = time < this.boostUntil;
    const isBraking = time < this.brakeUntil;
    const speed = (isBoosting ? 0.68 : isBraking ? 0.04 : 0.23) * delta;
    this.player.x += speed;
    this.playerTrail.setPosition(this.player.x - 36, this.player.y).setAlpha(isBoosting ? 0.85 : 0.42);
    this.raceProgressText?.setText(`RACE  ${Math.min(100, Math.floor((this.player.x - 180) / 10))}%`);
    if (!isBoosting && !isBraking) this.raceStatusText?.setText("SPACE / ↑ TO BURST  •  B / ↓ TO BRAKE").setColor("#ffffff");
    for (const rival of [...this.rivals]) {
      rival.car.x += rival.speed * delta;
      rival.trail.setPosition(rival.car.x - 34, rival.car.y);
      if (rival.car.x > GAME_WIDTH + 80) { rival.car.destroy(); rival.trail.destroy(); this.rivals = this.rivals.filter((item) => item !== rival); continue; }
      if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), rival.car.getBounds())) {
        if (speed / delta > rival.speed + 0.06) this.wreckRival(rival);
        else this.finishRace(false);
      }
    }
    if (this.player.x >= 1180) this.finishRace(true);
  }

  private wreckRival(rival: RivalCar): void {
    rival.car.setTintFill(0xffffff);
    this.tweens.add({ targets: [rival.car, rival.trail], angle: 720, alpha: 0, duration: 550, onComplete: () => { rival.car.destroy(); rival.trail.destroy(); } });
    this.rivals = this.rivals.filter((item) => item !== rival);
    this.raceStatusText?.setText("RIVAL WRECKED!").setColor("#45f6e5");
  }

  private finishRace(won: boolean): void {
    if (this.phase !== "racing") return;
    this.phase = "ended";
    this.raceStatusText?.setText(won ? "CHECKERED FLAG!  YOU WIN!" : "CRASHED!  NEW RACE IN 4...").setColor(won ? "#f7ff28" : "#ff70b8").setFontSize(25);
    if (won) this.createCorrectAnswerConfetti();
    this.time.delayedCall(4000, () => this.scene.restart());
  }
}
