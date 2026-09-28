import Phaser from "phaser";

import { speak, stopSpeaking } from "../../quiz/speech";
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
const TRACK_CENTER_X = GAME_WIDTH / 2;
const TRACK_WIDTH = 760;
const RACE_DISTANCE = 1_200;
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
  private roadSurface?: Phaser.GameObjects.TileSprite;
  private roadBorders: Phaser.GameObjects.TileSprite[] = [];
  private laneMarkers: Phaser.GameObjects.Rectangle[] = [];
  private finishLine?: Phaser.GameObjects.Container;
  private raceDistance = 0;
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
    this.roadBorders = [];
    this.laneMarkers = [];
    this.finishLine = undefined;
    this.raceDistance = 0;
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
      this.add.rectangle(683, 404, 1_080, 546, NEON.panel, 0.92).setStrokeStyle(2, NEON.purple, 0.35),
      this.add.rectangle(683, 404, 1_050, 516, 0x090610, 0.64).setStrokeStyle(1, NEON.cyan, 0.12)
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
      stopSpeaking();
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
    void speak(this.problem.prompt);
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
      const car = this.add.image(x - 96, y, this.getCarTextureKey(color)).setDisplaySize(76, 38);
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
    stopSpeaking();
    this.children.removeAll(true);
    this.startRace();
  }

  private startRace(): void {
    this.phase = "racing";
    this.add.rectangle(TRACK_CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x080b0d);
    this.createScrollingTrack();
    this.playerTrail = this.add.image(TRACK_CENTER_X, 604, ASSET_KEYS.RACING_CAR_TRAIL).setDisplaySize(76, 38).setTint(this.selectedColor!.color).setAlpha(0.45).setAngle(-90).setDepth(4);
    this.player = this.add.image(TRACK_CENTER_X, 570, this.getCarTextureKey(this.selectedColor!)).setDisplaySize(76, 38).setAngle(-90).setDepth(6);
    this.raceStatusText = this.add.text(GAME_WIDTH / 2, 62, "GO!  RACE UP THE TRACK TO THE CHECKERED FLAG", { fontFamily: "Press Start 2P, monospace", fontSize: "18px", color: "#ffffff" }).setOrigin(0.5).setDepth(10);
    this.raceProgressText = this.add.text(46, 48, "RACE  0%", { fontFamily: "Press Start 2P, monospace", fontSize: "17px", color: "#ffffff" }).setDepth(8);
    this.createRaceControl(1_070, 682, "▲ ACCEL", "SPACE / ↑", NEON.cyan, () => this.accelerate());
    this.createRaceControl(1_270, 682, "▼ BRAKE", "B / ↓", NEON.pink, () => this.brake());
    CAR_COLORS.filter((color) => color.name !== this.selectedColor?.name).slice(0, 6).forEach((color, index) => {
      const lane = [-190, 0, 190][index % 3] ?? 0;
      this.spawnRival(color, TRACK_CENTER_X + lane, 180 + Math.floor(index / 3) * 190, Phaser.Math.FloatBetween(0.18, 0.32));
    });
  }

  private createScrollingTrack(): void {
    const { roadKey, borderKey } = this.getStraightRoadTextureKeys();
    this.roadSurface = this.add.tileSprite(TRACK_CENTER_X, GAME_HEIGHT / 2, TRACK_WIDTH, GAME_HEIGHT, roadKey).setTileScale(5).setDepth(1);
    const borderWidth = 40;
    this.roadBorders = [
      this.add.tileSprite(TRACK_CENTER_X - TRACK_WIDTH / 2 - borderWidth / 2, GAME_HEIGHT / 2, borderWidth, GAME_HEIGHT, borderKey),
      this.add.tileSprite(TRACK_CENTER_X + TRACK_WIDTH / 2 + borderWidth / 2, GAME_HEIGHT / 2, borderWidth, GAME_HEIGHT, borderKey)
    ];
    this.roadBorders.forEach((border) => border.setTileScale(4).setDepth(2));
    for (let y = 48; y < GAME_HEIGHT; y += 108) this.laneMarkers.push(this.add.rectangle(TRACK_CENTER_X, y, 12, 52, 0xf6d958).setDepth(3));
    this.finishLine = this.createFinishLine(TRACK_CENTER_X, 570 - RACE_DISTANCE);
  }

  private getStraightRoadTextureKeys(): { roadKey: string; borderKey: string } {
    const roadKey = `${ASSET_KEYS.RACING_ROAD}-straight-asphalt`;
    const borderKey = `${ASSET_KEYS.RACING_ROAD}-straight-border`;
    if (this.textures.exists(roadKey) && this.textures.exists(borderKey)) return { roadKey, borderKey };

    const source = this.textures.get(ASSET_KEYS.RACING_ROAD).getSourceImage() as CanvasImageSource;
    const roadTexture = this.textures.createCanvas(roadKey, 68, 112);
    const borderTexture = this.textures.createCanvas(borderKey, 10, 20);
    if (!roadTexture || !borderTexture) return { roadKey: ASSET_KEYS.RACING_ROAD, borderKey: ASSET_KEYS.RACING_ROAD };
    roadTexture.context.drawImage(source, 101, 0, 68, 112, 0, 0, 68, 112);
    roadTexture.refresh();
    borderTexture.context.drawImage(source, 91, 0, 10, 20, 0, 0, 10, 20);
    borderTexture.refresh();
    return { roadKey, borderKey };
  }

  private createFinishLine(x: number, y: number): Phaser.GameObjects.Container {
    const line = this.add.container(x, y).setDepth(5);
    const squareSize = 26;
    for (let column = -14; column < 14; column += 1) {
      for (let row = 0; row < 2; row += 1) {
        const isLight = (column + row) % 2 === 0;
        line.add(this.add.rectangle(column * squareSize, row * squareSize - squareSize / 2, squareSize, squareSize, isLight ? 0xffffff : 0x111111));
      }
    }
    return line;
  }

  private createRaceControl(x: number, y: number, label: string, key: string, color: number, action: () => void): void {
    const bg = this.add.rectangle(x, y, 190, 76, 0x161225).setStrokeStyle(4, color);
    const title = this.add.text(x, y - 12, label, { fontFamily: "Press Start 2P, monospace", fontSize: "15px", color: "#ffffff" }).setOrigin(0.5);
    const hint = this.add.text(x, y + 17, key, { fontFamily: "Press Start 2P, monospace", fontSize: "11px", color: "#bdb5d4" }).setOrigin(0.5);
    this.add.zone(x, y, 190, 76).setInteractive({ useHandCursor: true }).on("pointerdown", action).on("pointerover", () => bg.setFillStyle(color, 0.35)).on("pointerout", () => bg.setFillStyle(0x161225));
    void title; void hint;
  }

  private spawnRival(color: CarColor, x: number, y: number, speed: number): void {
    const trail = this.add.image(x, y + 32, ASSET_KEYS.RACING_CAR_TRAIL).setDisplaySize(70, 35).setTint(color.color).setAlpha(0.34).setAngle(-90).setDepth(4);
    const car = this.add.image(x, y, this.getCarTextureKey(color)).setDisplaySize(70, 35).setAngle(-90).setDepth(6);
    this.rivals.push({ car, trail, color, speed });
  }

  private getCarTextureKey(color: CarColor): string {
    const textureKey = `${ASSET_KEYS.RACING_CAR}-${color.name.toLowerCase().replace(/ /g, "-")}`;
    if (this.textures.exists(textureKey)) return textureKey;

    const source = this.textures.get(ASSET_KEYS.RACING_CAR).getSourceImage() as CanvasImageSource;
    const width = 60;
    const height = 30;
    const texture = this.textures.createCanvas(textureKey, width, height);
    if (!texture) return ASSET_KEYS.RACING_CAR;
    const context = texture.context;
    context.drawImage(source, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const red = pixels.data[offset] ?? 0;
        const green = pixels.data[offset + 1] ?? 0;
        const blue = pixels.data[offset + 2] ?? 0;
        const alpha = pixels.data[offset + 3] ?? 0;
        const isWindow = x >= 28 && x <= 44 && y >= 7 && y <= 22;
        const isBlueBody = blue > red * 1.2 && blue > green * 1.1;
        if (alpha > 0 && !isWindow && isBlueBody) {
          pixels.data[offset] = (color.color >> 16) & 0xff;
          pixels.data[offset + 1] = (color.color >> 8) & 0xff;
          pixels.data[offset + 2] = color.color & 0xff;
        }
      }
    }
    context.putImageData(pixels, 0, 0);
    texture.refresh();
    return textureKey;
  }

  private accelerate(): void { if (this.phase === "racing") { this.boostUntil = this.time.now + 1000; this.raceStatusText?.setText("TURBO BURST!").setColor("#f7ff28"); } }
  private brake(): void { if (this.phase === "racing") { this.brakeUntil = this.time.now + 700; this.raceStatusText?.setText("BRAKING!").setColor("#ff70b8"); } }

  private updateRace(time: number, delta: number): void {
    if (!this.player || !this.playerTrail) return;
    const isBoosting = time < this.boostUntil;
    const isBraking = time < this.brakeUntil;
    const speed = (isBoosting ? 0.78 : isBraking ? 0.06 : 0.30) * delta;
    this.raceDistance += speed;
    this.roadSurface?.setTilePosition(0, this.roadSurface.tilePositionY + speed);
    this.roadBorders.forEach((border) => border.setTilePosition(0, border.tilePositionY + speed));
    this.laneMarkers.forEach((marker) => {
      marker.y += speed;
      if (marker.y > GAME_HEIGHT + 32) marker.y -= GAME_HEIGHT + 108;
    });
    this.finishLine?.setY(this.player.y - RACE_DISTANCE + this.raceDistance);
    this.playerTrail.setPosition(this.player.x, this.player.y + 34).setAlpha(isBoosting ? 0.85 : 0.42);
    this.raceProgressText?.setText(`RACE  ${Math.min(100, Math.floor(this.raceDistance / RACE_DISTANCE * 100))}%`);
    if (!isBoosting && !isBraking) this.raceStatusText?.setText("SPACE / ↑ TO BURST  •  B / ↓ TO BRAKE").setColor("#ffffff");
    for (const rival of [...this.rivals]) {
      rival.car.y += (speed / delta - rival.speed) * delta;
      rival.trail.setPosition(rival.car.x, rival.car.y + 32);
      if (rival.car.y > GAME_HEIGHT + 80 || rival.car.y < -80) { rival.car.destroy(); rival.trail.destroy(); this.rivals = this.rivals.filter((item) => item !== rival); continue; }
      if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), rival.car.getBounds())) {
        if (speed / delta > rival.speed + 0.06) this.wreckRival(rival);
        else this.finishRace(false);
      }
    }
    if (this.raceDistance >= RACE_DISTANCE) this.finishRace(true);
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
