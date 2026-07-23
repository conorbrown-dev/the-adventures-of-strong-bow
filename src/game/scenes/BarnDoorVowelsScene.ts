import Phaser from "phaser";

import { VowelType, type VowelsAndWordsData } from "../data/letters";
import { BarnDoorWordFragment } from "../entities/BarnDoorWordFragment";
import { BarnDoorVowelsMode } from "../modes/barn-door-vowels/BarnDoorVowelsMode";
import { createRandomBarnDoorVowelsStageTheme } from "../modes/barn-door-vowels/BarnDoorVowelsStageTheme";
import { AudioFeedbackSystem } from "../systems/AudioFeedbackSystem";
import { ASSET_KEYS } from "../utils/assetKeys";
import { COLORS, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";

const ANIMAL_KEYS = [
  ASSET_KEYS.BARN_DOOR_COW,
  ASSET_KEYS.BARN_DOOR_PIG,
  ASSET_KEYS.BARN_DOOR_SHEEP,
  ASSET_KEYS.BARN_DOOR_LLAMA,
  ASSET_KEYS.BARN_DOOR_CHICKEN
] as const;

const BARN_DOOR_CONGRATULATORY_VOICE_KEYS = [
  ASSET_KEYS.BARN_DOOR_VOWELS_EXCELLENT,
  ASSET_KEYS.BARN_DOOR_VOWELS_IMPRESSIVE,
  ASSET_KEYS.BARN_DOOR_VOWELS_WAY_TO_GO_GIRL
] as const;

const CLOSED_DESTINATION = new Phaser.Math.Vector2(258, 500);
const ANIMAL_SPEED = 230;
const WANDER_SPEED = 48;
type AnimalDirection = "up" | "left" | "down" | "right";
type PronunciationResult = "correct" | "incorrect" | "unavailable";
type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  abort(): void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
const ANIMAL_DIRECTION_ROWS: Record<AnimalDirection, number> = {
  up: 0,
  left: 1,
  down: 2,
  right: 3
};
const BARN_DOOR_SENSOR = new Phaser.Geom.Rectangle(218, 345, 80, 72);
const PASTURE_ENTRY_SENSOR = new Phaser.Geom.Rectangle(938, 535, 80, 82);
const BARN_DOOR_CENTER = new Phaser.Math.Vector2(258, 381);
const PASTURE_ENTRY_CENTER = new Phaser.Math.Vector2(978, 576);
const BARN_DOOR_AVOIDANCE = new Phaser.Geom.Rectangle(175, 300, 170, 150);
const PASTURE_ENTRY_AVOIDANCE = new Phaser.Geom.Rectangle(890, 490, 175, 175);
const ANIMAL_SCREEN_BOUNDS = new Phaser.Geom.Rectangle(80, 145, GAME_WIDTH - 160, 560);
const OPEN_BARN_TILE_IDS = [
  18305, 18306, 18307, 18308,
  18314, 18315, 18316, 18317,
  18323, 18324, 18325, 18326
] as const;
const BARN_VARIANT_TILE_OFFSET = 5;
const ANIMAL_SPAWN_POSITIONS = [
  [430, 180], [560, 180], [690, 180], [820, 180], [960, 180],
  [1100, 180], [1240, 180], [430, 300], [560, 300], [690, 300],
  [1180, 300], [430, 430], [560, 430], [690, 430], [1200, 450],
  [430, 570], [560, 570], [690, 570], [1200, 590], [430, 690],
  [560, 690], [690, 690], [820, 690], [960, 690], [1100, 690], [1240, 690]
] as const;

export class BarnDoorVowelsScene extends Phaser.Scene {
  private audioFeedbackSystem!: AudioFeedbackSystem;
  private mode!: BarnDoorVowelsMode;
  private progressText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private currentAnimal?: BarnDoorWordFragment;
  private animals: BarnDoorWordFragment[] = [];
  private fenceLayer?: Phaser.Tilemaps.TilemapLayer;
  private barnLayer?: Phaser.Tilemaps.TilemapLayer;
  private barnCloseTimer?: Phaser.Time.TimerEvent;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private movementKeys?: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private mobileMovement = { up: false, down: false, left: false, right: false };
  private wanderStates = new Map<
    BarnDoorWordFragment,
    { direction: Phaser.Math.Vector2; nextTurnAt: number }
  >();
  private wordsAndVowelsSpawnBag: VowelsAndWordsData[] = [];
  private gameplayStarted = false;
  private complete = false;
  private resolvingAnswer = false;
  private sceneShuttingDown = false;
  private activeSpeechRecognition?: BrowserSpeechRecognition;
  private microphoneAccessGranted = false;

  constructor() {
    super(SCENE_KEYS.BARN_DOOR_VOWELS);
  }

  init(): void {
    this.wordsAndVowelsSpawnBag = [];
    this.gameplayStarted = false;
    this.complete = false;
    this.resolvingAnswer = false;
    this.sceneShuttingDown = false;
    this.animals = [];
    this.wanderStates.clear();
    this.mobileMovement = { up: false, down: false, left: false, right: false };
  }

  create(): void {
    this.mode = BarnDoorVowelsMode.create(createRandomBarnDoorVowelsStageTheme());
    this.audioFeedbackSystem = new AudioFeedbackSystem(this);
    this.cameras.main.setBackgroundColor(0x9bd8f2);
    this.cameras.main.roundPixels = true;

    this.createFarmTilemap();
    this.createDestinationLabels();
    this.createHud();
    this.createControls();
    this.createMobileControls();
    this.updateHud();
    this.showStatus("Listen, then choose where each animal belongs.", COLORS.TEXT_DARK);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sceneShuttingDown = true;
      this.audioFeedbackSystem.interruptVoicePlayback();
      this.activeSpeechRecognition?.abort();
      this.activeSpeechRecognition = undefined;
    });

    void this.playIntroSequence();
  }

  update(time: number): void {
    this.updateWanderingAnimals(time);

    const animal = this.currentAnimal;
    if (!animal || this.resolvingAnswer || this.complete) {
      return;
    }

    const body = animal.body as Phaser.Physics.Arcade.Body;
    const left = this.cursors?.left.isDown || this.movementKeys?.left.isDown || this.mobileMovement.left;
    const right = this.cursors?.right.isDown || this.movementKeys?.right.isDown || this.mobileMovement.right;
    const up = this.cursors?.up.isDown || this.movementKeys?.up.isDown || this.mobileMovement.up;
    const down = this.cursors?.down.isDown || this.movementKeys?.down.isDown || this.mobileMovement.down;
    const direction = new Phaser.Math.Vector2(
      (right ? 1 : 0) - (left ? 1 : 0),
      (down ? 1 : 0) - (up ? 1 : 0)
    );

    if (direction.lengthSq() > 0) {
      const animationDirection = this.getAnimalDirection(direction);
      direction.normalize().scale(ANIMAL_SPEED);
      body.setVelocity(direction.x, direction.y);
      this.playAnimalWalkAnimation(animal, animationDirection);
    } else {
      body.setVelocity(0, 0);
      animal.animal.anims.pause();
    }

    const center = new Phaser.Geom.Point(animal.x, animal.y);
    if (BARN_DOOR_SENSOR.contains(center.x, center.y)) {
      this.resolveDestination(VowelType.CLOSED);
    } else if (PASTURE_ENTRY_SENSOR.contains(center.x, center.y)) {
      this.resolveDestination(VowelType.OPEN);
    }
  }

  private createFarmTilemap(): void {
    const map = this.make.tilemap({ key: ASSET_KEYS.BARN_DOOR_FARM_MAP });
    const tilesets = [
      map.addTilesetImage("terrain-map-v7-a", ASSET_KEYS.BARN_DOOR_MAP_TERRAIN_ATLAS_A),
      map.addTilesetImage("terrain-map-v7-b", ASSET_KEYS.BARN_DOOR_MAP_TERRAIN_ATLAS_B),
      map.addTilesetImage("terrain-v7", ASSET_KEYS.BARN_DOOR_MAP_TERRAIN),
      map.addTilesetImage("fence-medieval", ASSET_KEYS.BARN_DOOR_MAP_FENCE),
      map.addTilesetImage("barn-sheet", ASSET_KEYS.BARN_DOOR_MAP_BARN),
      map.addTilesetImage("blade", ASSET_KEYS.BARN_DOOR_MAP_BLADE),
      map.addTilesetImage("decorations-medieval", ASSET_KEYS.BARN_DOOR_MAP_DECORATIONS)
    ].filter((tileset): tileset is Phaser.Tilemaps.Tileset => tileset !== null);

    const mapScale = 1.5;
    const mapX = CLOSED_DESTINATION.x - 124 * 32 * mapScale;
    const mapY = 300 - 185 * 32 * mapScale;
    ["Tile Layer 1", "Barn", "Buildings", "Fences"].forEach((layerName, index) => {
      const layer = map.createLayer(layerName, tilesets, mapX, mapY);
      layer
        ?.setScale(mapScale)
        .setPosition(Math.round(mapX), Math.round(mapY))
        .setCullPadding(1, 1)
        .setDepth(-10 + index);
      if (layerName === "Fences") {
        layer?.setCollisionByExclusion([-1]);
        this.fenceLayer = layer ?? undefined;
      } else if (layerName === "Barn" && layer) {
        this.barnLayer = layer;
        this.setBarnOpen(false);
      }
    });
  }

  private createControls(): void {
    if (!this.input.keyboard) {
      return;
    }
    this.cursors = this.input.keyboard.createCursorKeys();
    this.movementKeys = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
  }

  private createMobileControls(): void {
    if (!this.sys.game.device.input.touch) {
      return;
    }

    this.input.addPointer(2);
    this.add
      .circle(132, 623, 112, 0x1f2937, 0.32)
      .setStrokeStyle(3, 0xffffff, 0.35)
      .setDepth(38);

    this.createMobileDirectionButton(132, 548, "▲", "up");
    this.createMobileDirectionButton(57, 623, "◀", "left");
    this.createMobileDirectionButton(207, 623, "▶", "right");
    this.createMobileDirectionButton(132, 698, "▼", "down");
  }

  private createMobileDirectionButton(
    x: number,
    y: number,
    arrow: string,
    direction: keyof typeof this.mobileMovement
  ): void {
    const button = this.add
      .circle(x, y, 37, 0x2b1a11, 0.78)
      .setStrokeStyle(4, 0xffdf72, 0.9)
      .setDepth(39)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, arrow, {
        fontFamily: "Trebuchet MS",
        fontSize: "34px",
        fontStyle: "bold",
        color: "#fffaf0"
      })
      .setOrigin(0.5)
      .setDepth(40);

    const press = (): void => {
      this.mobileMovement[direction] = true;
      button.setFillStyle(0x8b5a2b, 0.95).setScale(1.08);
    };
    const release = (): void => {
      this.mobileMovement[direction] = false;
      button.setFillStyle(0x2b1a11, 0.78).setScale(1);
    };
    button.on("pointerdown", press);
    button.on("pointerup", release);
    button.on("pointerout", release);
    button.on("pointerupoutside", release);
  }

  private createDestinationLabels(): void {
    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "Trebuchet MS",
      fontSize: "34px",
      fontStyle: "bold",
      color: "#fffaf0",
      stroke: "#2d1f14",
      strokeThickness: 7
    };

    this.add
      .text(258, 205, "Closed", labelStyle)
      .setOrigin(0.5)
      .setDepth(10);
    this.add
      .text(978, 295, "Open", labelStyle)
      .setOrigin(0.5)
      .setDepth(10);
  }

  private createHud(): void {
    this.add.rectangle(GAME_WIDTH / 2, 48, GAME_WIDTH, 96, 0x2b1a11, 0.84).setDepth(25);
    this.statusText = this.add
      .text(GAME_WIDTH / 2, 39, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "28px",
        fontStyle: "bold",
        color: COLORS.TEXT_LIGHT,
        align: "center"
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.progressText = this.add
      .text(GAME_WIDTH - 34, 48, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "27px",
        fontStyle: "bold",
        color: COLORS.HIGHLIGHT,
        align: "right"
      })
      .setOrigin(1, 0.5)
      .setDepth(30);
  }

  private showStatus(message: string, color: string): void {
    this.statusText?.setText(message).setColor(color);
  }

  private updateHud(): void {
    this.progressText?.setText(
      `${this.mode.state.correctVowelCount} / ${this.mode.config.vowelGoal} correct`
    );
  }

  private async playIntroSequence(): Promise<void> {
    await this.playSkippableVoiceClip(ASSET_KEYS.BARN_DOOR_VOWELS_INSTRUCTIONS);
    if (!this.sceneShuttingDown && !this.complete) {
      this.gameplayStarted = true;
      this.spawnHerd();
    }
  }

  private async playSkippableVoiceClip(key: string): Promise<void> {
    const skip = (): void => this.audioFeedbackSystem.interruptVoicePlayback();
    this.input.once("pointerdown", skip);
    this.input.keyboard?.once("keydown", skip);
    try {
      await this.audioFeedbackSystem.playVoiceClip(key, { volume: 0.9 });
    } finally {
      this.input.off("pointerdown", skip);
      this.input.keyboard?.off("keydown", skip);
    }
  }

  private spawnHerd(): void {
    if (!this.gameplayStarted || this.complete || this.sceneShuttingDown) {
      return;
    }
    const positions = Phaser.Utils.Array.Shuffle([...ANIMAL_SPAWN_POSITIONS]);
    for (let index = 0; index < this.mode.config.vowelGoal; index += 1) {
      const position = positions[index % positions.length] ?? ANIMAL_SPAWN_POSITIONS[0];
      const wordData = this.drawFromSpawnBag();
      const textureKey = ANIMAL_KEYS[index % ANIMAL_KEYS.length] ?? ANIMAL_KEYS[0];
      const animal = new BarnDoorWordFragment(this, position[0], position[1], wordData, textureKey);
      if (textureKey === ASSET_KEYS.BARN_DOOR_CHICKEN) {
        animal.animal.setDisplaySize(52, 52);
      }
      this.createAnimalAnimations(textureKey);
      animal.animal.play(this.getAnimalAnimationKey(textureKey, "down")).anims.pause();
      animal.setScale(0).setAlpha(0);
      animal.on("pointerup", () => this.selectAnimal(animal));
      this.animals.push(animal);
      this.startAnimalWandering(animal, index * 170);
      if (this.fenceLayer) {
        this.physics.add.collider(animal, this.fenceLayer);
      }
      this.tweens.add({
        targets: animal,
        scale: 0.72,
        alpha: 1,
        delay: index * 45,
        duration: 260,
        ease: "Back.Out"
      });
    }
    this.showStatus("Click an animal, then guide it with WASD or the arrow keys.", COLORS.TEXT_LIGHT);
  }

  private selectAnimal(animal: BarnDoorWordFragment): void {
    if (this.resolvingAnswer || !animal.active) {
      return;
    }
    const previouslySelected = this.currentAnimal;
    previouslySelected?.setSelected(false);
    previouslySelected?.stopMoving();
    if (previouslySelected && previouslySelected !== animal) {
      this.startAnimalWandering(previouslySelected);
    }
    this.currentAnimal = animal;
    this.wanderStates.delete(animal);
    animal.setSelected(true);
    this.tweens.add({ targets: animal, scale: 0.82, duration: 120, yoyo: true });
    this.showStatus(
      `Guide “${animal.wordData.displayWordText}” with WASD or the arrow keys.`,
      COLORS.HIGHLIGHT
    );
  }

  private createAnimalAnimations(textureKey: string): void {
    (Object.entries(ANIMAL_DIRECTION_ROWS) as Array<[AnimalDirection, number]>).forEach(
      ([direction, row]) => {
        const animationKey = this.getAnimalAnimationKey(textureKey, direction);
        if (this.anims.exists(animationKey)) {
          return;
        }
        const firstFrame = row * 4;
        this.anims.create({
          key: animationKey,
          frames: this.anims.generateFrameNumbers(textureKey, {
            start: firstFrame,
            end: firstFrame + 3
          }),
          frameRate: 7,
          repeat: -1
        });
      }
    );
  }

  private getAnimalAnimationKey(textureKey: string, direction: AnimalDirection): string {
    return `barn-door-${textureKey}-walk-${direction}`;
  }

  private getAnimalDirection(direction: Phaser.Math.Vector2): AnimalDirection {
    if (Math.abs(direction.x) > Math.abs(direction.y)) {
      return direction.x < 0 ? "left" : "right";
    }
    return direction.y < 0 ? "up" : "down";
  }

  private playAnimalWalkAnimation(
    animal: BarnDoorWordFragment,
    direction: AnimalDirection
  ): void {
    const animationKey = this.getAnimalAnimationKey(animal.animal.texture.key, direction);
    if (animal.animal.anims.currentAnim?.key !== animationKey) {
      animal.animal.play(animationKey);
    } else if (animal.animal.anims.isPaused) {
      animal.animal.anims.resume();
    }
  }

  private startAnimalWandering(animal: BarnDoorWordFragment, delay = 0): void {
    const direction = this.getRandomWanderDirection();
    this.wanderStates.set(animal, {
      direction,
      nextTurnAt: this.time.now + delay + Phaser.Math.Between(900, 2200)
    });
    this.applyWanderMovement(animal, direction);
  }

  private updateWanderingAnimals(time: number): void {
    this.wanderStates.forEach((state, animal) => {
      if (!animal.active || animal === this.currentAnimal) {
        return;
      }

      const body = animal.body as Phaser.Physics.Arcade.Body;
      const hitFence = body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down;
      if (hitFence) {
        // Tile collisions stop Arcade bodies but do not choose a new wander
        // direction automatically. Turn immediately so an animal cannot keep
        // walking into a fence and look frozen.
        state.direction.negate();
        state.nextTurnAt = time + Phaser.Math.Between(900, 1800);
        this.applyWanderMovement(animal, state.direction);
        return;
      }

      const predictedX = animal.x + state.direction.x * 46;
      const predictedY = animal.y + state.direction.y * 46;
      const leavingScreen = !ANIMAL_SCREEN_BOUNDS.contains(predictedX, predictedY);
      const approachingDestination =
        BARN_DOOR_AVOIDANCE.contains(predictedX, predictedY) ||
        PASTURE_ENTRY_AVOIDANCE.contains(predictedX, predictedY);

      if (leavingScreen || approachingDestination) {
        state.direction.negate();
        state.nextTurnAt = time + Phaser.Math.Between(900, 1800);
        this.applyWanderMovement(animal, state.direction);
      } else if (time >= state.nextTurnAt) {
        state.direction = this.getRandomWanderDirection();
        state.nextTurnAt = time + Phaser.Math.Between(1200, 3000);
        this.applyWanderMovement(animal, state.direction);
      }
    });
  }

  private applyWanderMovement(
    animal: BarnDoorWordFragment,
    direction: Phaser.Math.Vector2
  ): void {
    const body = animal.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(direction.x * WANDER_SPEED, direction.y * WANDER_SPEED);
    this.playAnimalWalkAnimation(animal, this.getAnimalDirection(direction));
  }

  private getRandomWanderDirection(): Phaser.Math.Vector2 {
    const direction = Phaser.Utils.Array.GetRandom([
      new Phaser.Math.Vector2(0, -1),
      new Phaser.Math.Vector2(-1, 0),
      new Phaser.Math.Vector2(0, 1),
      new Phaser.Math.Vector2(1, 0)
    ]);
    return direction?.clone() ?? new Phaser.Math.Vector2(1, 0);
  }

  private async resolveDestination(chosenType: VowelType): Promise<void> {
    const animal = this.currentAnimal;
    if (!animal || this.resolvingAnswer || this.complete) {
      return;
    }
    this.resolvingAnswer = true;
    animal.stopMoving();
    this.showStatus(`Say “${animal.wordData.displayWordText}” into the microphone.`, COLORS.HIGHLIGHT);
    await this.audioFeedbackSystem.playVoiceClip(
      ASSET_KEYS.BARN_DOOR_VOWELS_PRONOUNCE_WORD,
      { volume: 0.9 }
    );
    if (this.sceneShuttingDown || this.complete || this.currentAnimal !== animal) {
      return;
    }

    const microphoneReady = await this.requestMicrophoneAccess();
    const result = microphoneReady
      ? await this.listenForPronunciation(animal.wordData)
      : "unavailable";
    if (this.sceneShuttingDown || this.complete || this.currentAnimal !== animal) {
      return;
    }
    if (result === "correct") {
      this.handleCorrectAnswer(animal);
    } else if (result === "unavailable") {
      this.showStatus("Microphone access or speech recognition is unavailable. Please allow microphone access and use a supported browser.", "#fff1a8");
      this.tweens.add({
        targets: animal,
        x: animal.spawnPosition.x,
        y: animal.spawnPosition.y,
        duration: 400,
        ease: "Sine.InOut",
        onComplete: () => {
          this.resolvingAnswer = false;
          animal.setSelected(true);
        }
      });
    } else {
      this.handleIncorrectPronunciation(animal);
    }
    void chosenType;
  }

  private handleCorrectAnswer(animal: BarnDoorWordFragment): void {
    this.mode.state.markVowelCorrect();
    this.updateHud();
    this.showStatus("Great job! That vowel sound is correct!", COLORS.HIGHLIGHT);
    void this.audioFeedbackSystem.playCorrectFeedback(
      BARN_DOOR_CONGRATULATORY_VOICE_KEYS
    );
    const destination = animal.wordData.vowelType === VowelType.CLOSED
      ? BARN_DOOR_CENTER
      : PASTURE_ENTRY_CENTER;
    if (animal.wordData.vowelType === VowelType.CLOSED) {
      this.flashBarnOpen();
    }
    this.tweens.add({
      targets: animal,
      x: destination.x,
      y: destination.y,
      alpha: 0,
      duration: 430,
      onComplete: () => {
        animal.destroy();
        this.animals = this.animals.filter((entry) => entry !== animal);
        this.wanderStates.delete(animal);
        this.currentAnimal = undefined;
        if (this.mode.state.correctVowelCount >= this.mode.config.vowelGoal) {
          this.finishRound();
          return;
        }
        this.resolvingAnswer = false;
        this.showStatus("Choose another animal to guide.", COLORS.TEXT_LIGHT);
      }
    });
  }

  private handleIncorrectPronunciation(animal: BarnDoorWordFragment): void {
    this.audioFeedbackSystem.playIncorrectFeedback();
    void this.audioFeedbackSystem.playVoiceClip(
      ASSET_KEYS.BARN_DOOR_VOWELS_TRY_AGAIN,
      { volume: 0.9 }
    );
    this.showStatus(`Good try! Let’s say “${animal.wordData.displayWordText}” again.`, "#fff1a8");
    this.tweens.add({
      targets: animal,
      x: animal.spawnPosition.x,
      y: animal.spawnPosition.y,
      scale: 0.72,
      duration: 500,
      ease: "Sine.InOut",
      onComplete: () => {
        this.resolvingAnswer = false;
        animal.setSelected(true);
      }
    });
  }

  private listenForPronunciation(expected: VowelsAndWordsData): Promise<PronunciationResult> {
    if (typeof window === "undefined") {
      return Promise.resolve("unavailable");
    }
    const recognitionWindow = window as typeof window & {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    };
    const Recognition = recognitionWindow.SpeechRecognition ?? recognitionWindow.webkitSpeechRecognition;
    if (!Recognition) {
      return Promise.resolve("unavailable");
    }

    return new Promise<PronunciationResult>((resolve) => {
      const recognition = new Recognition();
      this.activeSpeechRecognition = recognition;
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 3;
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const finish = (result: PronunciationResult): void => {
        if (settled) return;
        settled = true;
        if (timeout) window.clearTimeout(timeout);
        if (this.activeSpeechRecognition === recognition) this.activeSpeechRecognition = undefined;
        resolve(result);
      };
      recognition.onresult = (event) => {
        const alternatives = event.results[event.resultIndex];
        const heard = Array.from(alternatives, (alternative) => alternative.transcript);
        finish(heard.some((transcript) => this.matchesPronunciation(transcript, expected)) ? "correct" : "incorrect");
      };
      recognition.onerror = () => finish("incorrect");
      recognition.onend = () => finish("incorrect");
      timeout = window.setTimeout(() => {
        recognition.abort();
        finish("incorrect");
      }, 7000);
      try {
        recognition.start();
      } catch {
        finish("unavailable");
      }
    });
  }

  private async requestMicrophoneAccess(): Promise<boolean> {
    if (this.microphoneAccessGranted) {
      return true;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    this.showStatus("Allow microphone access so we can hear your answer.", COLORS.HIGHLIGHT);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Speech recognition opens its own microphone stream. Stop this
      // permission probe immediately so it does not compete for the device.
      stream.getTracks().forEach((track) => track.stop());
      this.microphoneAccessGranted = true;
      return true;
    } catch {
      return false;
    }
  }

  private matchesPronunciation(transcript: string, expected: VowelsAndWordsData): boolean {
    const heardWords = transcript.toLowerCase().match(/[a-z]+/g) ?? [];
    const expectedWords = this.getExpectedPronunciations(expected);
    return heardWords.some((word) => expectedWords.includes(word));
  }

  private getExpectedPronunciations(wordData: VowelsAndWordsData): string[] {
    const closedWord = wordData.word.toLowerCase();
    if (wordData.vowelType === VowelType.CLOSED) {
      // A closed syllable must be recognized as the word itself. For example,
      // "tap" is accepted, but "tape" is not.
      return [closedWord];
    }

    // Open fragments need their long-vowel pronunciation, not simply their
    // displayed letters. These aliases match the words speech recognition is
    // likely to return for the intended phonics sound.
    const openAliases: Record<string, string[]> = {
      ba: ["bay"], ca: ["cay", "kay"], da: ["day"], ga: ["gay"], la: ["lay"],
      ma: ["may"], pa: ["pay"], ra: ["ray"], ta: ["tay"], va: ["vey"],
      be: ["be", "bee"], he: ["he"], me: ["me"], we: ["we", "wee"], ze: ["zee"],
      bi: ["by", "bye"], hi: ["hi", "high"], li: ["lie"], mi: ["my"], ti: ["tie"],
      go: ["go"], no: ["no"], so: ["so"], bo: ["bo", "bow"], cu: ["cue", "queue"]
    };
    return openAliases[wordData.displayWordText.toLowerCase()] ?? [wordData.displayWordText.toLowerCase()];
  }

  private flashBarnOpen(): void {
    this.setBarnOpen(true);
    this.barnCloseTimer?.remove(false);
    this.barnCloseTimer = this.time.delayedCall(700, () => {
      this.setBarnOpen(false);
      this.barnCloseTimer = undefined;
    });
  }

  private setBarnOpen(open: boolean): void {
    if (!this.barnLayer) {
      return;
    }

    const openTileIds = new Set<number>(OPEN_BARN_TILE_IDS);
    const closedTileIds = new Set<number>(
      OPEN_BARN_TILE_IDS.map((tileId) => tileId + BARN_VARIANT_TILE_OFFSET)
    );
    this.barnLayer.forEachTile((tile) => {
      if (open && closedTileIds.has(tile.index)) {
        tile.index -= BARN_VARIANT_TILE_OFFSET;
      } else if (!open && openTileIds.has(tile.index)) {
        tile.index += BARN_VARIANT_TILE_OFFSET;
      }
    });
  }

  private finishRound(): void {
    this.complete = true;
    this.resolvingAnswer = false;
    this.showStatus("You sorted them all! Starting a new farm round…", COLORS.HIGHLIGHT);
    this.time.delayedCall(2300, () => {
      if (!this.sceneShuttingDown) {
        this.scene.restart();
      }
    });
  }

  private drawFromSpawnBag(): VowelsAndWordsData {
    if (this.wordsAndVowelsSpawnBag.length === 0) {
      this.wordsAndVowelsSpawnBag.push(
        ...Phaser.Utils.Array.Shuffle([...this.mode.content.vowelsAndWords])
      );
    }
    const selected = this.wordsAndVowelsSpawnBag.shift();
    if (!selected) {
      throw new Error("Barn Door Vowels has no configured word fragments.");
    }
    return selected;
  }
}
