import Phaser from "phaser";

import { speak, speakOnHover, stopSpeaking } from "../../quiz/speech";
import { PHONICS_CHALLENGES, PHONICS_MODULES, shufflePhonicsChoices, type PhonicsChallenge, type PhonicsModule } from "../data/phonicsChallenges";
import { ASSET_KEYS } from "../utils/assetKeys";
import { GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { addGameNavigation } from "../utils/gameNavigation";
import { SCENE_KEYS } from "../utils/sceneKeys";
import { applyRaceDamage, isKnockedOut, PLAYER_HIT_LIMIT, RIVAL_HIT_LIMIT } from "../systems/raceDamage";

const NEON = {
  yellow: 0xffe45c, blue: 0x43baff, orange: 0xff8a3d, purple: 0xc681ff,
  cyan: 0x45f6e5, pink: 0xff70b8, dark: 0x0b0714, panel: 0x130d25,
  ink: "#f7f2ff", muted: "#a99ac3"
} as const;
const CORRECT_ANSWERS_TO_LAUNCH = 5;
const TRACK_CENTER_X = GAME_WIDTH / 2;
const TRACK_WIDTH = 760;
const RACE_DISTANCE = 18_000;
const BASE_RACE_SPEED = 0.30;
const MAX_STEERING_SPEED = 0.15;
const SPEED_EASING_MS = 260;
const STEERING_EASING_MS = 220;
const SKID_SOUND_LATERAL_SPEED = 0.025;
const RIVAL_CATCH_UP_DISTANCE = 1_200;
const RIVAL_CATCH_UP_LIMIT = 0.14;
const RIVAL_FALL_BACK_LIMIT = 0.10;
const COLLISION_DAMAGE_COOLDOWN_MS = 800;
const HEALTH_BAR_WIDTH = 116;
const HEALTH_BAR_HEIGHT = 13;
const CAR_COLORS = [
  { name: "BLUE", color: 0x2787ff }, { name: "RED", color: 0xef3e43 },
  { name: "HOT PINK", color: 0xff3ca6 }, { name: "NEON GREEN", color: 0x5cff35 },
  { name: "NEON YELLOW", color: 0xf7ff28 }, { name: "NEON ORANGE", color: 0xff8a25 },
  { name: "CYAN", color: 0x27f8ff }, { name: "PURPLE", color: 0x9a58ff },
  { name: "WHITE", color: 0xffffff }
] as const;
type CarColor = (typeof CAR_COLORS)[number];
interface HealthBar {
  background: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
}
interface RivalCar {
  car: Phaser.GameObjects.Image;
  trail: Phaser.GameObjects.Image;
  color: CarColor;
  speed: number;
  lateralSpeed: number;
  distance: number;
  paceOffset: number;
  laneTarget: number;
  nextLaneChange: number;
  remainingHits: number;
  healthBar: HealthBar;
}

export class PhonicsStarshipGameScene extends Phaser.Scene {
  private problem: PhonicsChallenge = PHONICS_CHALLENGES[0];
  private displayedChoices: readonly string[] = PHONICS_CHALLENGES[0]?.choices ?? [];
  private displayedCorrectChoice = PHONICS_CHALLENGES[0]?.correctChoice ?? 0;
  private selectedModule?: PhonicsModule;
  private recentChallengeIndices: number[] = [];
  private modulePickerLayer?: Phaser.GameObjects.Container;
  private answer = "";
  private ignoredAnswerPointerId?: number;
  private problemLayer?: Phaser.GameObjects.Container;
  private statusText?: Phaser.GameObjects.Text;
  private correctCount = 0;
  private correctCountText?: Phaser.GameObjects.Text;
  private keypadLayer?: Phaser.GameObjects.Container;
  private mathObjects: Phaser.GameObjects.GameObject[] = [];
  private mathStagePanels: Phaser.GameObjects.Rectangle[] = [];
  private backgroundStars: Phaser.GameObjects.Arc[] = [];

  private phase: "module-select" | "starting-module" | "learning" | "color-select" | "countdown" | "racing" | "ended" = "module-select";
  private player?: Phaser.GameObjects.Image;
  private playerTrail?: Phaser.GameObjects.Image;
  private playerHealthBar?: HealthBar;
  private playerRemainingHits = PLAYER_HIT_LIMIT;
  private selectedColor?: CarColor;
  private rivals: RivalCar[] = [];
  private raceStatusText?: Phaser.GameObjects.Text;
  private raceProgressText?: Phaser.GameObjects.Text;
  private roadSurface?: Phaser.GameObjects.TileSprite;
  private roadBorders: Phaser.GameObjects.TileSprite[] = [];
  private laneMarkers: Phaser.GameObjects.Rectangle[] = [];
  private finishLine?: Phaser.GameObjects.Container;
  private raceDistance = 0;
  private raceSpeed = BASE_RACE_SPEED;
  private playerLateralSpeed = 0;
  private boostUntil = 0;
  private brakeUntil = 0;
  private nextCollisionDamageAt = 0;
  private leftKey?: Phaser.Input.Keyboard.Key;
  private rightKey?: Phaser.Input.Keyboard.Key;
  private aKey?: Phaser.Input.Keyboard.Key;
  private dKey?: Phaser.Input.Keyboard.Key;
  private keyboardHandler?: (event: KeyboardEvent) => void;
  private engineLoop?: Phaser.Sound.BaseSound;
  private skidLoop?: Phaser.Sound.BaseSound;
  private countdownSound?: Phaser.Sound.BaseSound;

  constructor() { super(SCENE_KEYS.PHONICS_STARSHIP_GAME); }

  init(): void {
    this.phase = "module-select";
    this.answer = "";
    this.ignoredAnswerPointerId = undefined;
    this.correctCount = 0;
    this.selectedModule = undefined;
    this.recentChallengeIndices = [];
    this.modulePickerLayer = undefined;
    this.mathObjects = [];
    this.mathStagePanels = [];
    this.backgroundStars = [];
    this.rivals = [];
    this.selectedColor = undefined;
    this.roadBorders = [];
    this.laneMarkers = [];
    this.finishLine = undefined;
    this.raceDistance = 0;
    this.raceSpeed = BASE_RACE_SPEED;
    this.playerLateralSpeed = 0;
    this.playerHealthBar = undefined;
    this.playerRemainingHits = PLAYER_HIT_LIMIT;
    this.boostUntil = 0;
    this.brakeUntil = 0;
    this.nextCollisionDamageAt = 0;
    this.leftKey = undefined;
    this.rightKey = undefined;
    this.aKey = undefined;
    this.dKey = undefined;
    this.stopRaceSounds();
  }

  create(): void {
    this.cameras.main.setBackgroundColor(NEON.dark);
    this.createBackground();
    this.bindKeyboard();
    addGameNavigation(this);
    this.showModulePicker();
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
    this.trackMath(this.add.text(77, 94, `${this.selectedModule?.title ?? "Phonics"} practice`, { fontFamily: "Trebuchet MS, sans-serif", fontSize: "19px", color: NEON.muted, letterSpacing: 1 }));
    this.correctCountText = this.trackMath(this.add.text(GAME_WIDTH - 75, 70, `CORRECT  0 / ${CORRECT_ANSWERS_TO_LAUNCH}`, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "19px", color: "#ffe45c", letterSpacing: 1 }).setOrigin(1, 0.5));
  }

  private showModulePicker(): void {
    const layer = this.add.container(0, 0).setDepth(10);
    this.modulePickerLayer = layer;
    layer.add(this.add.text(GAME_WIDTH / 2, 154, "CHOOSE A PHONICS SKILL", {
      fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "38px", color: "#ffffff", letterSpacing: 2
    }).setOrigin(0.5));
    layer.add(this.add.text(GAME_WIDTH / 2, 210, "Practice one skill at a time, then race!", {
      fontFamily: "Trebuchet MS, sans-serif", fontSize: "23px", color: "#45f6e5"
    }).setOrigin(0.5));
    PHONICS_MODULES.forEach((module, index) => this.createModuleButton(layer, module, index));
    layer.add(this.add.text(GAME_WIDTH / 2, 677, "CLICK A SKILL OR PRESS 1–4", {
      fontFamily: "Trebuchet MS, sans-serif", fontSize: "18px", color: NEON.muted, letterSpacing: 1
    }).setOrigin(0.5));
    void speak("Choose one phonics skill to practice. You will practice one skill at a time.");
  }

  private createModuleButton(layer: Phaser.GameObjects.Container, module: PhonicsModule, index: number): void {
    const x = 420 + (index % 2) * 520;
    const y = 350 + Math.floor(index / 2) * 190;
    const color = [NEON.yellow, NEON.cyan, NEON.orange, NEON.purple][index] ?? NEON.cyan;
    const background = this.add.rectangle(x, y, 460, 150, 0x1b1430, 1).setStrokeStyle(3, color, 0.9);
    const title = this.add.text(x, y - 35, `${index + 1}. ${module.title}`, {
      fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "29px", color: NEON.ink
    }).setOrigin(0.5);
    const description = this.add.text(x, y + 27, module.description, {
      fontFamily: "Trebuchet MS, sans-serif", fontSize: "18px", color: "#a99ac3", align: "center", wordWrap: { width: 390 }
    }).setOrigin(0.5);
    const zone = this.add.zone(x, y, 460, 150).setInteractive({ useHandCursor: true })
      .on("pointerover", () => { background.setFillStyle(0x33244f); title.setScale(1.04); void speakOnHover(module.title); })
      .on("pointerout", () => { background.setFillStyle(0x1b1430); title.setScale(1); })
      .on("pointerdown", (pointer: Phaser.Input.Pointer) => this.selectModule(index, pointer.id));
    layer.add([background, title, description, zone]);
  }

  private selectModule(index: number, pointerId?: number): void {
    const module = PHONICS_MODULES[index];
    if (this.phase !== "module-select" || !module) return;
    this.phase = "starting-module";
    this.selectedModule = module;
    this.recentChallengeIndices = [];
    stopSpeaking();
    if (pointerId !== undefined) {
      this.ignoredAnswerPointerId = pointerId;
      this.input.once("pointerup", () => this.time.delayedCall(0, () => this.startModule()));
      return;
    }
    this.time.delayedCall(0, () => this.startModule());
  }

  private startModule(): void {
    this.modulePickerLayer?.destroy(true);
    this.modulePickerLayer = undefined;
    this.createHeader();
    this.createAnswerArea();
    this.createKeypad();
    this.phase = "learning";
    this.newProblem();
    this.time.delayedCall(1_000, () => { this.ignoredAnswerPointerId = undefined; });
  }

  private createAnswerArea(): void {
    this.statusText = this.trackMath(this.add.text(GAME_WIDTH / 2, 666, "Choose an answer, or press 1, 2, or 3", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "20px", color: NEON.muted }).setOrigin(0.5));
  }

  private createKeypad(): void {
    const keypadLayer = this.trackMath(this.add.container(0, 0));
    this.keypadLayer = keypadLayer;
  }

  private bindKeyboard(): void {
    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP, Phaser.Input.Keyboard.KeyCodes.DOWN, Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT, Phaser.Input.Keyboard.KeyCodes.A, Phaser.Input.Keyboard.KeyCodes.D,
      Phaser.Input.Keyboard.KeyCodes.SPACE
    ]);
    this.leftKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.aKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.dKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyboardHandler = (event: KeyboardEvent) => {
      if (this.phase === "ended" && event.key.toLowerCase() === "r") { this.scene.restart(); return; }
      if (this.phase === "module-select" && /^[1-4]$/.test(event.key)) { this.selectModule(Number(event.key) - 1); return; }
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
      this.stopRaceSounds();
      this.input.keyboard?.removeCapture([
        Phaser.Input.Keyboard.KeyCodes.UP, Phaser.Input.Keyboard.KeyCodes.DOWN, Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT, Phaser.Input.Keyboard.KeyCodes.A, Phaser.Input.Keyboard.KeyCodes.D,
        Phaser.Input.Keyboard.KeyCodes.SPACE
      ]);
    });
  }

  private selectChoice(choiceIndex: number, pointerId?: number): void {
    if (pointerId === this.ignoredAnswerPointerId) {
      this.ignoredAnswerPointerId = undefined;
      return;
    }
    if (this.phase !== "learning" || choiceIndex >= this.displayedChoices.length) return;
    this.answer = String(choiceIndex);
    this.checkAnswer();
  }

  private newProblem(): void {
    const challenges = this.selectedModule?.challenges ?? PHONICS_CHALLENGES;
    const availableIndices = challenges
      .map((_, index) => index)
      .filter((index) => !this.recentChallengeIndices.includes(index));
    const selectedIndex = Phaser.Utils.Array.GetRandom(availableIndices) ?? 0;
    this.problem = challenges[selectedIndex] ?? PHONICS_CHALLENGES[0];
    const presentedChallenge = shufflePhonicsChoices(this.problem);
    this.displayedChoices = presentedChallenge.choices;
    this.displayedCorrectChoice = presentedChallenge.correctChoice;
    this.recentChallengeIndices = [...this.recentChallengeIndices, selectedIndex].slice(-5);
    this.answer = "";
    this.statusText?.setText("Choose an answer, or press 1, 2, or 3").setColor(NEON.muted);
    this.renderProblem();
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
    this.displayedChoices.forEach((choice, index) => this.createChoiceButton(340 + index * 340, 500, index, choice));
  }

  private createChoiceButton(x: number, y: number, index: number, choice: string): void {
    const bg = this.add.rectangle(x, y, 300, 100, 0x1b1430, 1).setStrokeStyle(3, [NEON.yellow, NEON.cyan, NEON.orange][index], 0.9);
    const label = this.add.text(x, y, `${index + 1}. ${choice}`, { fontFamily: "Arial Black, Trebuchet MS, sans-serif", fontSize: "30px", color: NEON.ink }).setOrigin(0.5);
    const zone = this.add.zone(x, y, 300, 100).setInteractive({ useHandCursor: true })
      .on("pointerover", () => { bg.setFillStyle(0x33244f); label.setScale(1.06); })
      .on("pointerout", () => { bg.setFillStyle(0x1b1430); label.setScale(1); })
      .on("pointerup", (pointer: Phaser.Input.Pointer) => this.selectChoice(index, pointer.id));
    this.keypadLayer?.add([bg, label, zone]);
  }

  private checkAnswer(): void {
    if (!this.answer) return;
    if (Number(this.answer) !== this.displayedCorrectChoice) {
      this.statusText?.setText("TRY AGAIN — YOU'VE GOT THIS!").setColor("#ff70b8");
      this.tweens.add({ targets: this.statusText, x: "+=10", duration: 55, yoyo: true, repeat: 3 }); return;
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
    this.phase = "countdown";
    this.add.rectangle(TRACK_CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x080b0d);
    this.createScrollingTrack();
    this.playerTrail = this.add.image(TRACK_CENTER_X, 604, ASSET_KEYS.RACING_CAR_TRAIL).setDisplaySize(76, 38).setTint(this.selectedColor!.color).setAlpha(0.45).setAngle(-90).setDepth(4);
    this.player = this.add.image(TRACK_CENTER_X, 570, this.getCarTextureKey(this.selectedColor!)).setDisplaySize(76, 38).setAngle(-90).setDepth(6);
    this.raceStatusText = this.add.text(GAME_WIDTH / 2, 62, "GET READY!", { fontFamily: "Press Start 2P, monospace", fontSize: "24px", color: "#ffe45c" }).setOrigin(0.5).setDepth(10);
    this.raceProgressText = this.add.text(46, 48, "RACE  0%", { fontFamily: "Press Start 2P, monospace", fontSize: "17px", color: "#ffffff" }).setDepth(8);
    this.add.text(46, 78, "YOUR CAR", { fontFamily: "Press Start 2P, monospace", fontSize: "11px", color: "#ffffff" }).setDepth(8);
    this.playerHealthBar = this.createHealthBar(106, 101);
    this.createRaceControl(700, 682, "◀ TURN", "A / ←", NEON.purple, () => this.steerPlayer(-1));
    this.createRaceControl(890, 682, "▲ ACCEL", "SPACE / ↑", NEON.cyan, () => this.accelerate());
    this.createRaceControl(1_080, 682, "▼ BRAKE", "B / ↓", NEON.pink, () => this.brake());
    this.createRaceControl(1_270, 682, "TURN ▶", "D / →", NEON.purple, () => this.steerPlayer(1));
    CAR_COLORS.filter((color) => color.name !== this.selectedColor?.name).slice(0, 6).forEach((color, index) => {
      const lane = [-190, 0, 190][index % 3] ?? 0;
      this.spawnRival(color, TRACK_CENTER_X + lane, 180 + Math.floor(index / 3) * 190, Phaser.Math.FloatBetween(0.18, 0.32));
    });
    this.playCountdown();
  }

  private playCountdown(): void {
    this.countdownSound = this.sound.add(ASSET_KEYS.RACING_COUNTDOWN);
    this.countdownSound.once(Phaser.Sound.Events.COMPLETE, () => this.beginRace());
    if (!this.countdownSound.play()) this.beginRace();
  }

  private beginRace(): void {
    if (this.phase !== "countdown") return;
    this.phase = "racing";
    this.raceStatusText?.setText("GO!  RACE UP THE TRACK TO THE CHECKERED FLAG").setColor("#ffffff").setFontSize(18);
    this.engineLoop = this.sound.add(ASSET_KEYS.RACING_ENGINE_LOOP, { loop: true, volume: 0.35 });
    this.engineLoop.play();
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
    const roadTexture = this.textures.createCanvas(roadKey, 68, 72);
    const borderTexture = this.textures.createCanvas(borderKey, 10, 20);
    if (!roadTexture || !borderTexture) return { roadKey: ASSET_KEYS.RACING_ROAD, borderKey: ASSET_KEYS.RACING_ROAD };
    roadTexture.context.drawImage(source, 101, 0, 68, 72, 0, 0, 68, 72);
    roadTexture.refresh();
    roadTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    borderTexture.context.drawImage(source, 91, 0, 10, 20, 0, 0, 10, 20);
    borderTexture.refresh();
    borderTexture.setFilter(Phaser.Textures.FilterMode.NEAREST);
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
    const healthBar = this.createHealthBar(x, y - 34, 7);
    this.rivals.push({
      car,
      trail,
      color,
      speed,
      lateralSpeed: 0,
      distance: this.raceDistance + (this.player?.y ?? 570) - y,
      paceOffset: Phaser.Math.FloatBetween(-0.06, 0.06),
      laneTarget: x,
      nextLaneChange: this.time.now + Phaser.Math.Between(1_400, 3_500),
      remainingHits: RIVAL_HIT_LIMIT,
      healthBar
    });
  }

  private createHealthBar(x: number, y: number, depth = 8): HealthBar {
    const background = this.add.rectangle(x, y, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 0xc83f4c).setStrokeStyle(2, 0x210d17).setDepth(depth);
    const fill = this.add.rectangle(x - HEALTH_BAR_WIDTH / 2 + 2, y, HEALTH_BAR_WIDTH - 4, HEALTH_BAR_HEIGHT - 4, 0x45db70)
      .setOrigin(0, 0.5)
      .setDepth(depth + 1);
    return { background, fill };
  }

  private updateHealthBar(healthBar: HealthBar, remainingHits: number, hitLimit: number, x: number, y: number): void {
    const fillWidth = (HEALTH_BAR_WIDTH - 4) * Phaser.Math.Clamp(remainingHits / hitLimit, 0, 1);
    healthBar.background.setPosition(x, y);
    healthBar.fill.setSize(fillWidth, HEALTH_BAR_HEIGHT - 4).setPosition(x - HEALTH_BAR_WIDTH / 2 + 2, y);
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
  private steerPlayer(direction: -1 | 1): void {
    if (this.phase !== "racing" || !this.player) return;
    this.playerLateralSpeed = direction * MAX_STEERING_SPEED;
  }

  private updateRace(time: number, delta: number): void {
    if (!this.player || !this.playerTrail) return;
    const isBoosting = time < this.boostUntil;
    const isBraking = time < this.brakeUntil;
    const targetRaceSpeed = isBoosting ? 0.78 : isBraking ? 0.06 : BASE_RACE_SPEED;
    this.raceSpeed = Phaser.Math.Linear(this.raceSpeed, targetRaceSpeed, Math.min(1, delta / SPEED_EASING_MS));
    const speed = this.raceSpeed * delta;
    this.raceDistance += speed;
    const turnDirection = (this.leftKey?.isDown || this.aKey?.isDown ? -1 : 0)
      + (this.rightKey?.isDown || this.dKey?.isDown ? 1 : 0);
    const targetLateralSpeed = turnDirection * MAX_STEERING_SPEED;
    const steeringEase = turnDirection === 0 ? STEERING_EASING_MS * 0.7 : STEERING_EASING_MS;
    this.playerLateralSpeed = Phaser.Math.Linear(
      this.playerLateralSpeed,
      targetLateralSpeed,
      Math.min(1, delta / steeringEase)
    );
    this.updateSkidSound();
    this.player.x += this.playerLateralSpeed * delta;
    const shoulderLimit = TRACK_WIDTH / 2 - 28;
    if (Math.abs(this.player.x - TRACK_CENTER_X) > shoulderLimit) {
      this.finishRace(false);
      return;
    }
    this.roadSurface?.setTilePosition(0, this.roadSurface.tilePositionY - speed);
    this.roadBorders.forEach((border) => border.setTilePosition(0, border.tilePositionY - speed));
    this.laneMarkers.forEach((marker) => {
      marker.y += speed;
      if (marker.y > GAME_HEIGHT + 32) marker.y -= GAME_HEIGHT + 108;
    });
    this.finishLine?.setY(this.player.y - RACE_DISTANCE + this.raceDistance);
    this.playerTrail.setPosition(this.player.x, this.player.y + 34).setAlpha(isBoosting ? 0.85 : 0.42);
    this.raceProgressText?.setText(`RACE  ${Math.min(100, Math.floor(this.raceDistance / RACE_DISTANCE * 100))}%`);
    if (!isBoosting && !isBraking) this.raceStatusText?.setText("SPACE / ↑ TO BURST  •  B / ↓ TO BRAKE").setColor("#ffffff");
    const playerSpeed = speed / delta;
    for (const rival of this.rivals) {
      if (time >= rival.nextLaneChange) {
        rival.laneTarget = TRACK_CENTER_X + (Phaser.Utils.Array.GetRandom([-210, 0, 210]) ?? 0);
        rival.nextLaneChange = time + Phaser.Math.Between(1_400, 3_500);
      }
      const distanceFromPlayer = rival.distance - this.raceDistance;
      const catchUpSpeed = Phaser.Math.Clamp(
        -distanceFromPlayer / RIVAL_CATCH_UP_DISTANCE,
        -RIVAL_FALL_BACK_LIMIT,
        RIVAL_CATCH_UP_LIMIT
      );
      const targetSpeed = Phaser.Math.Clamp(playerSpeed + rival.paceOffset + catchUpSpeed, 0.16, 0.52);
      rival.speed = Phaser.Math.Linear(rival.speed, targetSpeed, Math.min(1, delta / SPEED_EASING_MS));
      rival.distance += rival.speed * delta;
      const laneDistance = rival.laneTarget - rival.car.x;
      const turnDirection = Math.abs(laneDistance) < 3 ? 0 : Math.sign(laneDistance);
      const targetLateralSpeed = turnDirection * MAX_STEERING_SPEED;
      const steeringEase = turnDirection === 0 ? STEERING_EASING_MS * 0.7 : STEERING_EASING_MS;
      rival.lateralSpeed = Phaser.Math.Linear(
        rival.lateralSpeed,
        targetLateralSpeed,
        Math.min(1, delta / steeringEase)
      );
      rival.car.x += rival.lateralSpeed * delta;
      rival.car.y = this.player.y - (rival.distance - this.raceDistance);
      rival.trail.setPosition(rival.car.x, rival.car.y + 32);
      this.updateHealthBar(rival.healthBar, rival.remainingHits, RIVAL_HIT_LIMIT, rival.car.x, rival.car.y - 34);
      if (Math.abs(rival.car.x - TRACK_CENTER_X) > shoulderLimit) {
        this.wreckRival(rival);
        continue;
      }
      if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), rival.car.getBounds())) {
        this.handleCarCollision(rival, playerSpeed, time);
      }
    }
    if (this.raceDistance >= RACE_DISTANCE) this.finishRace(true);
  }

  private wreckRival(rival: RivalCar): void {
    rival.healthBar.background.destroy();
    rival.healthBar.fill.destroy();
    rival.car.setTintFill(0xffffff);
    this.tweens.add({ targets: [rival.car, rival.trail], angle: 720, alpha: 0, duration: 550, onComplete: () => { rival.car.destroy(); rival.trail.destroy(); } });
    this.rivals = this.rivals.filter((item) => item !== rival);
    this.raceStatusText?.setText("RIVAL WRECKED!").setColor("#45f6e5");
  }

  private handleCarCollision(rival: RivalCar, playerSpeed: number, time: number): void {
    if (!this.player || time < this.nextCollisionDamageAt) return;
    this.nextCollisionDamageAt = time + COLLISION_DAMAGE_COOLDOWN_MS;

    if (playerSpeed > rival.speed + 0.06) {
      rival.remainingHits = applyRaceDamage(rival.remainingHits);
      this.updateHealthBar(rival.healthBar, rival.remainingHits, RIVAL_HIT_LIMIT, rival.car.x, rival.car.y - 34);
      this.flashCar(rival.car);
      if (isKnockedOut(rival.remainingHits)) this.wreckRival(rival);
      else this.raceStatusText?.setText("RIVAL HIT!  ONE HIT LEFT").setColor("#45f6e5");
      return;
    }

    this.playerRemainingHits = applyRaceDamage(this.playerRemainingHits);
    if (this.playerHealthBar) this.updateHealthBar(this.playerHealthBar, this.playerRemainingHits, PLAYER_HIT_LIMIT, 106, 101);
    this.flashCar(this.player);
    if (isKnockedOut(this.playerRemainingHits)) {
      this.finishRace(false);
      return;
    }
    this.raceStatusText?.setText(`YOUR CAR HIT!  ${this.playerRemainingHits} HITS LEFT`).setColor("#ff70b8");
  }

  private flashCar(car: Phaser.GameObjects.Image): void {
    this.tweens.add({ targets: car, alpha: 0.38, duration: 85, yoyo: true, repeat: 2 });
  }

  private finishRace(won: boolean): void {
    if (this.phase !== "racing") return;
    this.phase = "ended";
    this.stopRaceSounds();
    this.raceStatusText?.setText(won ? "CHECKERED FLAG!  YOU WIN!" : "CRASHED!  NEW RACE IN 4...").setColor(won ? "#f7ff28" : "#ff70b8").setFontSize(25);
    if (won) this.createCorrectAnswerConfetti();
    this.time.delayedCall(4000, () => this.scene.restart());
  }

  private updateSkidSound(): void {
    const isSteering = Math.abs(this.playerLateralSpeed) >= SKID_SOUND_LATERAL_SPEED;
    if (isSteering && !this.skidLoop) {
      this.skidLoop = this.sound.add(ASSET_KEYS.RACING_SKID_LOOP, { loop: true, volume: 0.28 });
      this.skidLoop.play();
      return;
    }
    if (!isSteering && this.skidLoop) {
      this.skidLoop.stop();
      this.skidLoop.destroy();
      this.skidLoop = undefined;
    }
  }

  private stopRaceSounds(): void {
    [this.engineLoop, this.skidLoop, this.countdownSound].forEach((sound) => {
      sound?.stop();
      sound?.destroy();
    });
    this.engineLoop = undefined;
    this.skidLoop = undefined;
    this.countdownSound = undefined;
  }
}
