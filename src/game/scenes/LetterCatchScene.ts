import Phaser from "phaser";

import type { LetterData } from "../data/letters";
import { FallingLetter } from "../entities/FallingLetter";
import { KittenCatcher } from "../entities/KittenCatcher";
import { type LetterCatchVariant } from "../modes/letter-catch/LetterCatchConfig";
import { LetterCatchMode } from "../modes/letter-catch/LetterCatchMode";
import { loadCatCatchSettings } from "../settings/catCatchSettings";
import { AudioFeedbackSystem } from "../systems/AudioFeedbackSystem";
import { ASSET_KEYS, YARN_ASSET_KEYS } from "../utils/assetKeys";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";

interface LetterCatchSceneData {
  variant?: LetterCatchVariant;
}

const KITTEN_CATCH_CELEBRATION_KEYS = [
  ASSET_KEYS.KITTEN_CATCH_WAY_TO_GO,
  ASSET_KEYS.KITTEN_CATCH_IMPRESSIVE
] as const;

export class LetterCatchScene extends Phaser.Scene {
  private variant: LetterCatchVariant = "vowels";
  private mode!: LetterCatchMode;
  private kitten!: KittenCatcher;
  private basketCatchZone!: Phaser.GameObjects.Zone;
  private audioFeedbackSystem!: AudioFeedbackSystem;
  private letterGroup!: Phaser.Physics.Arcade.Group;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private aKey?: Phaser.Input.Keyboard.Key;
  private dKey?: Phaser.Input.Keyboard.Key;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private mobileLeft = false;
  private mobileRight = false;
  private mobileJumpPressed = false;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private progressText?: Phaser.GameObjects.Text;
  private targetSpawnBag: LetterData[] = [];
  private distractorSpawnBag: LetterData[] = [];
  private complete = false;
  private gameplayStarted = false;
  private introSequenceStarted = false;
  private sceneShuttingDown = false;

  constructor() {
    super(SCENE_KEYS.LETTER_CATCH);
  }

  init(data: LetterCatchSceneData): void {
    this.variant = data.variant ?? "vowels";
    this.complete = false;
    this.gameplayStarted = false;
    this.introSequenceStarted = false;
    this.sceneShuttingDown = false;
    this.targetSpawnBag = [];
    this.distractorSpawnBag = [];
    this.spawnTimer?.destroy();
    this.spawnTimer = undefined;
    this.mobileLeft = false;
    this.mobileRight = false;
    this.mobileJumpPressed = false;
  }

  create(): void {
    this.mode = LetterCatchMode.create(this.variant);
    this.audioFeedbackSystem = new AudioFeedbackSystem(this);
    this.stopFossilDigBackgroundMusic();

    this.cameras.main.setBackgroundColor(0xaadcf8);
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.createBackground();
    this.createHud();

    this.kitten = new KittenCatcher(this, GAME_WIDTH / 2, this.mode.config.groundY);
    this.basketCatchZone = this.add.zone(0, 0, 58, 24);
    this.updateBasketCatchZone();

    this.letterGroup = this.physics.add.group();

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.aKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.dKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.createMobileControls();

    this.updateHud();
    this.showStatus(
      "Listen to the instructions, then get ready!",
      "#2d1f14"
    );
    void this.playIntroSequence();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sceneShuttingDown = true;
      this.spawnTimer?.destroy();
      this.spawnTimer = undefined;
      this.audioFeedbackSystem.interruptVoicePlayback();
    });
  }

  update(_time: number, delta: number): void {
    if (this.complete || !this.gameplayStarted) {
      this.kitten.move(0, 0);
      this.updateBasketCatchZone();
      this.advanceFallingLetters(delta);
      this.checkBasketCatchCollisions();
      this.cleanupOffscreenLetters();
      return;
    }

    const movingLeft =
      Boolean(this.cursors?.left.isDown) || Boolean(this.aKey?.isDown) || this.mobileLeft;
    const movingRight =
      Boolean(this.cursors?.right.isDown) || Boolean(this.dKey?.isDown) || this.mobileRight;
    const direction =
      Number(movingRight) - Number(movingLeft);

    if (
      (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) ||
      this.mobileJumpPressed
    ) {
      this.mobileJumpPressed = false;
      this.kitten.jump();
    }

    this.kitten.move(direction, this.mode.config.playerSpeed);
    this.kitten.advance(delta);
    this.updateBasketCatchZone();
    this.advanceFallingLetters(delta);
    this.checkBasketCatchCollisions();
    this.cleanupOffscreenLetters();
  }

  private advanceFallingLetters(delta: number): void {
    ([...this.letterGroup.getChildren()] as FallingLetter[]).forEach(
      (fallingLetter) => {
        if (!fallingLetter.active) {
          return;
        }

        fallingLetter.advance(delta);
        if (
          !fallingLetter.isCollected &&
          !fallingLetter.isBouncingOffscreen &&
          fallingLetter.getBasketContactPoint().y >= GAME_HEIGHT
        ) {
          if (fallingLetter.learningType === this.mode.content.targetType) {
            this.mode.state.registerMissedTarget();
          }

          fallingLetter.bounceOffscreen(GAME_HEIGHT);
        }
      }
    );
  }

  private updateBasketCatchZone(): void {
    const basketPosition = this.kitten.getBasketCatchPosition();
    this.basketCatchZone.setPosition(basketPosition.x, basketPosition.y);
  }

  private checkBasketCatchCollisions(): void {
    const basketBounds = new Phaser.Geom.Rectangle(
      this.basketCatchZone.x - this.basketCatchZone.width / 2,
      this.basketCatchZone.y - this.basketCatchZone.height / 2,
      this.basketCatchZone.width,
      this.basketCatchZone.height
    );

    ([...this.letterGroup.getChildren()] as FallingLetter[]).forEach(
      (fallingLetter) => {
        if (
          !fallingLetter.active ||
          fallingLetter.isCollected ||
          fallingLetter.isBouncingOffscreen
        ) {
          return;
        }

        const contactPoint = fallingLetter.getBasketContactPoint();

        if (
          !Phaser.Geom.Rectangle.Contains(
            basketBounds,
            contactPoint.x,
            contactPoint.y
          )
        ) {
          return;
        }

        this.handleLetterCaught(fallingLetter);
      }
    );
  }

  private createBackground(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x161a28)
      .setDepth(-20);
    const background = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSET_KEYS.KITTEN_CATCH_BACKGROUND)
      .setOrigin(0.5)
      .setDepth(-18);
    const containScale = Math.min(
      GAME_WIDTH / background.width,
      GAME_HEIGHT / background.height
    );

    background.setScale(containScale);
  }

  private createHud(): void {
    this.progressText = this.add
      .text(GAME_WIDTH / 2, 54, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "42px",
        fontStyle: "bold",
        color: COLORS.TEXT_LIGHT,
        align: "center",
        stroke: "#2d1f14",
        strokeThickness: 8
      })
      .setOrigin(0.5)
      .setDepth(30);
  }

  private createMobileControls(): void {
    if (!this.sys.game.device.input.touch) {
      return;
    }
    this.input.addPointer(2);
    this.createMobileHoldButton(78, 676, "◀", (pressed) => {
      this.mobileLeft = pressed;
    });
    this.createMobileHoldButton(178, 676, "▶", (pressed) => {
      this.mobileRight = pressed;
    });
    this.createMobileActionButton(GAME_WIDTH - 96, 660, "JUMP", () => {
      this.mobileJumpPressed = true;
    });
  }

  private createMobileHoldButton(
    x: number,
    y: number,
    label: string,
    onChange: (pressed: boolean) => void
  ): void {
    const button = this.add.circle(x, y, 43, 0x2b1a11, 0.78)
      .setStrokeStyle(4, 0xffdf72, 0.9).setDepth(40).setInteractive();
    this.add.text(x, y, label, {
      fontFamily: "Trebuchet MS", fontSize: "36px", fontStyle: "bold", color: "#fffaf0"
    }).setOrigin(0.5).setDepth(41);
    const release = (): void => {
      onChange(false);
      button.setFillStyle(0x2b1a11, 0.78).setScale(1);
    };
    button.on("pointerdown", () => {
      onChange(true);
      button.setFillStyle(0x8b5a2b, 0.95).setScale(1.08);
    });
    button.on("pointerup", release).on("pointerout", release).on("pointerupoutside", release);
  }

  private createMobileActionButton(
    x: number,
    y: number,
    label: string,
    action: () => void
  ): void {
    const button = this.add.circle(x, y, 55, 0x8b5a2b, 0.86)
      .setStrokeStyle(4, 0xffdf72, 0.95).setDepth(40).setInteractive();
    this.add.text(x, y, label, {
      fontFamily: "Trebuchet MS", fontSize: "22px", fontStyle: "bold", color: "#fffaf0"
    }).setOrigin(0.5).setDepth(41);
    button.on("pointerdown", () => {
      action();
      button.setScale(1.08);
    });
    button.on("pointerup", () => button.setScale(1));
    button.on("pointerout", () => button.setScale(1));
  }

  private spawnLetter(): void {
    if (
      !this.gameplayStarted ||
      this.complete ||
      this.letterGroup.countActive(true) >= 6
    ) {
      return;
    }

    const useTargetPool =
      Phaser.Math.FloatBetween(0, 1) <= this.mode.config.targetSpawnChance;
    const letterData = useTargetPool
      ? this.drawFromSpawnBag("target")
      : this.drawFromSpawnBag("distractor");

    if (!letterData) {
      return;
    }

    const x = Phaser.Math.Between(
      this.mode.config.spawnMinX,
      this.mode.config.spawnMaxX
    );
    const y = Phaser.Math.Between(
      this.mode.config.spawnY - 24,
      this.mode.config.spawnY + 16
    );
    const fallingLetter = new FallingLetter(
      this,
      x,
      y,
      letterData,
      this.getRandomYarnTextureKey()
    );
    this.letterGroup.add(fallingLetter);
    fallingLetter.launch(this.getCurrentYarnFallSpeed());
  }

  private getCurrentYarnFallSpeed(): number {
    const settings = loadCatCatchSettings();

    return Phaser.Math.Between(
      settings.minYarnFallSpeed,
      settings.maxYarnFallSpeed
    );
  }

  private drawFromSpawnBag(
    bagType: "target" | "distractor"
  ): LetterData | undefined {
    const bag =
      bagType === "target" ? this.targetSpawnBag : this.distractorSpawnBag;
    const pool =
      bagType === "target"
        ? this.mode.content.targetPool
        : this.mode.content.distractorPool;

    if (bag.length === 0) {
      bag.push(...Phaser.Utils.Array.Shuffle([...pool]));
    }

    return bag.shift();
  }

  private getRandomYarnTextureKey(): string {
    const yarnTextureKeys = Object.values(YARN_ASSET_KEYS);

    return Phaser.Utils.Array.GetRandom(yarnTextureKeys) ?? YARN_ASSET_KEYS.BLUE;
  }

  private handleLetterCaught(fallingLetter: FallingLetter): void {
    if (this.complete || fallingLetter.isCollected) {
      return;
    }

    fallingLetter.markCollected();

    const caughtCorrectType =
      fallingLetter.learningType === this.mode.content.targetType;

    if (caughtCorrectType) {
      this.mode.state.registerCorrectCatch();
      this.audioFeedbackSystem.playFossilDiscovered();
      this.showStatus(
        `${fallingLetter.label} is a ${this.mode.content.targetLabelSingular}.`,
        "#1b6f42"
      );
      this.emitCatchBurst(fallingLetter.x, fallingLetter.y, 0xffd56b);
      fallingLetter.popAndDestroy();
      this.updateHud();

      if (this.mode.state.isComplete) {
        void this.handleWin();
      }
      return;
    }

    this.mode.state.registerIncorrectCatch();
    this.audioFeedbackSystem.playIncorrectFeedback();
    this.showStatus(
      `${fallingLetter.label} is not a ${this.mode.content.targetLabelSingular}.`,
      "#9b2c2c"
    );
    fallingLetter.fadeAndDestroy();
  }

  private cleanupOffscreenLetters(): void {
    const letters = [...this.letterGroup.getChildren()] as FallingLetter[];

    letters.forEach((fallingLetter) => {
      if (
        !fallingLetter.active ||
        fallingLetter.isCollected
      ) {
        return;
      }

      if (fallingLetter.isBouncingOffscreen) {
        if (
          fallingLetter.y <= GAME_HEIGHT + 220 &&
          fallingLetter.x >= -220 &&
          fallingLetter.x <= GAME_WIDTH + 220
        ) {
          return;
        }

        fallingLetter.destroy();
        return;
      }

      if (
        fallingLetter.y <= GAME_HEIGHT + 48 &&
        fallingLetter.x >= -48 &&
        fallingLetter.x <= GAME_WIDTH + 48
      ) {
        return;
      }

      if (fallingLetter.learningType === this.mode.content.targetType) {
        this.mode.state.registerMissedTarget();
      }

      fallingLetter.destroy();
    });
  }

  private async handleWin(): Promise<void> {
    if (this.complete) {
      return;
    }

    this.complete = true;
    this.spawnTimer?.destroy();
    this.spawnTimer = undefined;
    this.kitten.move(0, 0);

    ([...this.letterGroup.getChildren()] as FallingLetter[]).forEach((fallingLetter) => {
      if (!fallingLetter.active) {
        return;
      }

      if (!fallingLetter.isCollected) {
        fallingLetter.markCollected();
      }

      fallingLetter.fadeAndDestroy();
    });

    this.showStatus(this.mode.content.successText, "#1b6f42");
    this.updateHud();
    this.emitCatchBurst(this.kitten.x, this.kitten.y - 18, 0xffd56b);
    this.emitCatchBurst(this.kitten.x - 40, this.kitten.y - 34, 0xff8bb2);
    this.emitCatchBurst(this.kitten.x + 42, this.kitten.y - 34, 0x8ed8ff);
    await this.playWinCelebration();

    this.time.delayedCall(900, () => {
      this.scene.start(SCENE_KEYS.WIN, {
        heading: "Basket Full!",
        subheading: "The kitten sorted the letters beautifully.",
        playAgainLabel: "Catch Again",
        playAgainSceneKey: SCENE_KEYS.LETTER_CATCH,
        playAgainData: {
          variant: this.variant
        }
      });
    });
  }

  private emitCatchBurst(x: number, y: number, color: number): void {
    for (let index = 0; index < 8; index += 1) {
      const sparkle = this.add
        .circle(x, y, Phaser.Math.Between(4, 7), color, 0.9)
        .setDepth(20);
      const angle = Phaser.Math.DegToRad(index * 45 + Phaser.Math.Between(-10, 10));
      const distance = Phaser.Math.Between(28, 56);

      this.tweens.add({
        targets: sparkle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.4,
        duration: 280,
        ease: "Cubic.easeOut",
        onComplete: () => sparkle.destroy()
      });
    }
  }

  private showStatus(_message: string, _color: string): void {}

  private async playWinCelebration(): Promise<void> {
    await this.audioFeedbackSystem.playVoiceClip(
      Phaser.Utils.Array.GetRandom([...KITTEN_CATCH_CELEBRATION_KEYS]) ??
        KITTEN_CATCH_CELEBRATION_KEYS[0],
      {
        volume: 0.9
      }
    );
  }

  private updateHud(): void {
    this.progressText?.setText(
      `${this.mode.state.correctCaught} / ${this.mode.config.catchGoal}\n${this.mode.content.targetLabelPlural}`
    );
  }

  private async playIntroSequence(): Promise<void> {
    if (this.introSequenceStarted) {
      return;
    }

    this.introSequenceStarted = true;

    await this.playSkippableVoiceClip(ASSET_KEYS.KITTEN_CATCH_INSTRUCTIONS);
    if (this.sceneShuttingDown || this.complete) {
      return;
    }

    this.showStatus(
      `Catch only ${this.mode.content.targetLabelPlural}.`,
      "#2d1f14"
    );
    await this.playSkippableVoiceClip(this.getModeInstructionVoiceKey());
    if (this.sceneShuttingDown || this.complete) {
      return;
    }

    this.startGameplay();
  }

  private async playSkippableVoiceClip(key: string): Promise<void> {
    const skipMainInstructions = (): void => {
      this.audioFeedbackSystem.interruptVoicePlayback();
    };

    this.input.once("pointerdown", skipMainInstructions);
    this.input.keyboard?.once("keydown", skipMainInstructions);

    try {
      await this.audioFeedbackSystem.playVoiceClip(key, {
        volume: 0.9
      });
    } finally {
      this.input.off("pointerdown", skipMainInstructions);
      this.input.keyboard?.off("keydown", skipMainInstructions);
    }
  }

  private getModeInstructionVoiceKey(): string {
    if (this.variant === "consonants") {
      return ASSET_KEYS.KITTEN_CATCH_CONSONANTS;
    }

    return ASSET_KEYS.KITTEN_CATCH_VOWELS;
  }

  private startGameplay(): void {
    if (this.gameplayStarted || this.complete || this.sceneShuttingDown) {
      return;
    }

    this.gameplayStarted = true;
    this.spawnTimer = this.time.addEvent({
      delay: this.mode.config.spawnIntervalMs,
      loop: true,
      callback: () => this.spawnLetter()
    });
    this.spawnLetter();
    this.spawnLetter();
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
