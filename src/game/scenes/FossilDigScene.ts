import Phaser from "phaser";

import { fossilTextureKeys } from "../data/fossils";
import { FossilPickup } from "../entities/FossilPickup";
import { GemPickup } from "../entities/GemPickup";
import { Player } from "../entities/Player";
import { LearningType } from "../data/learningTypes";
import { terrainTileFrames } from "../data/terrainTiles";
import { FossilDigMode } from "../modes/fossil-dig/FossilDigMode";
import type { FossilDigVariant } from "../modes/fossil-dig/FossilDigConfig";
import {
  resolveFossilDigStageTheme,
  type FossilDigStageTheme
} from "../modes/fossil-dig/FossilDigStageTheme";
import { CollisionSystem } from "../systems/CollisionSystem";
import { DinoAssemblySystem } from "../systems/DinoAssemblySystem";
import { DiggingSystem, type DigCell } from "../systems/DiggingSystem";
import { AudioFeedbackSystem } from "../systems/AudioFeedbackSystem";
import { LearningPromptSystem } from "../systems/LearningPromptSystem";
import { PickupSystem } from "../systems/PickupSystem";
import { CollectedFossilTray } from "../ui/CollectedFossilTray";
import { Hud } from "../ui/Hud";
import { ASSET_KEYS } from "../utils/assetKeys";
import {
  COLORS,
  DIG_TILE_DURATION_MS,
  GAME_HEIGHT,
  GAME_WIDTH,
  HUD_HEIGHT,
  UNDERGROUND_TOP
} from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";

interface FossilDigSceneData {
  variant?: FossilDigVariant;
  stageTheme?: FossilDigStageTheme;
}

interface PlacedFossil {
  pickup: FossilPickup;
  row: number;
  col: number;
}

interface ActiveDigAction {
  cell: DigCell;
  direction: Phaser.Math.Vector2;
}

export class FossilDigScene extends Phaser.Scene {
  private variant: FossilDigVariant = "cvc";
  private stageTheme?: FossilDigStageTheme;
  private mode!: FossilDigMode;
  private player!: Player;
  private diggingSystem!: DiggingSystem;
  private pickupSystem!: PickupSystem;
  private promptSystem!: LearningPromptSystem;
  private assemblySystem!: DinoAssemblySystem;
  private audioFeedbackSystem!: AudioFeedbackSystem;
  private collectedFossilTray?: CollectedFossilTray;
  private fossils: FossilPickup[] = [];
  private fossilPlacements: PlacedFossil[] = [];
  private pendingCvcTargets: string[] = [];
  private digKey?: Phaser.Input.Keyboard.Key;
  private pickupInteractionLocked = false;
  private transitionStarted = false;
  private activeDigAction?: ActiveDigAction;
  private digTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super(SCENE_KEYS.FOSSIL_DIG);
  }

  init(data: FossilDigSceneData): void {
    this.variant = data.variant ?? "cvc";
    this.stageTheme = data.stageTheme;
    this.fossils = [];
    this.fossilPlacements = [];
    this.pendingCvcTargets = [];
    this.activeDigAction = undefined;
    this.digTimer?.remove(false);
    this.digTimer = undefined;
    this.pickupInteractionLocked = false;
    this.transitionStarted = false;
  }

  create(): void {
    this.mode = FossilDigMode.create(this.variant, this.stageTheme);
    const stageThemeDetails = resolveFossilDigStageTheme(this.mode.stageTheme);
    const worldWidth = this.mode.config.worldCols * this.mode.config.cellSize;
    const worldHeight =
      this.mode.config.undergroundTop +
      this.mode.config.worldRows * this.mode.config.cellSize;

    this.cameras.main.setBackgroundColor(COLORS.SKY);
    this.add.rectangle(
      worldWidth / 2,
      UNDERGROUND_TOP / 2,
      worldWidth,
      UNDERGROUND_TOP,
      COLORS.SKY
    );
    this.createSurfaceTiles();

    this.add
      .text(
        GAME_WIDTH / 2,
        UNDERGROUND_TOP - 44,
        `Dig down to find the fossils! Boss: ${stageThemeDetails.bossDinoName} | Reward: ${stageThemeDetails.jewelName}`,
        {
          fontFamily: "Trebuchet MS",
          fontSize: "26px",
          color: "#2d1f14",
          fontStyle: "bold"
        }
      )
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(10);

    this.add
      .text(86, UNDERGROUND_TOP - 44, "Stage", {
        fontFamily: "Trebuchet MS",
        fontSize: "20px",
        color: "#fff8e8",
        backgroundColor: "#5e4127",
        padding: { left: 10, right: 10, top: 5, bottom: 5 }
      })
      .setScrollFactor(0)
      .setDepth(10);

    this.diggingSystem = new DiggingSystem(this, {
      width: worldWidth,
      height: worldHeight,
      cellSize: this.mode.config.cellSize,
      undergroundTop: this.mode.config.undergroundTop
    });
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    const hud = new Hud(this, this.mode.config.title);
    this.audioFeedbackSystem = new AudioFeedbackSystem(this);
    this.promptSystem = new LearningPromptSystem(
      hud,
      this.mode.content.initialPrompt,
      this.mode.content.validationMode
    );

    if (this.variant === "letters") {
      this.promptSystem.showLetterScaffoldPrompt(LearningType.VOWEL);
    } else {
      this.collectedFossilTray = new CollectedFossilTray(this);
      hud.setRepeatButtonLabel("Repeat Word");
      hud.setRepeatHandler(() => {
        void this.audioFeedbackSystem.speakCurrentWord();
      });
      hud.setRepeatButtonVisible(true);
      hud.setRepeatButtonEnabled(true);
      this.pendingCvcTargets = Phaser.Utils.Array.Shuffle(
        this.mode.content.pickups.map((item) => item.label)
      );
    }

    const cursors = this.input.keyboard!.createCursorKeys();
    const wasd = this.input.keyboard!.addKeys("W,A,S,D,SPACE") as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
      SPACE: Phaser.Input.Keyboard.Key;
    };
    this.digKey = wasd.SPACE;

    this.player = new Player(this, 164, 110);
    this.player.configureForDigScene({
      left: cursors.left ?? wasd.A,
      right: cursors.right ?? wasd.D,
      up: cursors.up ?? wasd.W,
      down: cursors.down ?? wasd.S,
      dig: wasd.SPACE
    });
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setDeadzone(GAME_WIDTH * 0.46, GAME_HEIGHT * 0.36);
    this.cameras.main.roundPixels = true;

    this.fossils = this.createFossils();
    const gem = new GemPickup(
      this,
      (this.mode.config.worldCols - 2) * this.mode.config.cellSize +
        this.mode.config.cellSize / 2,
      this.mode.config.undergroundTop +
        (this.mode.config.worldRows - 2) * this.mode.config.cellSize +
        this.mode.config.cellSize / 2,
      this.mode.rewardJewel.textureKey
    );

    this.pickupSystem = new PickupSystem(this.mode.state, this.fossils, gem, {
      onProgress: (progress) => hud.updateProgress(progress),
      onAllFossilsCollected: () => {
        this.promptSystem.showGemPrompt();
      },
      onGemCollected: () => {
        void this.handleGemCollected();
      }
    });

    this.assemblySystem = new DinoAssemblySystem(this);

    this.fossils.forEach((pickup) => {
      if (this.variant === "cvc") {
        pickup.setWorldLabelVisible(false);
      }

      CollisionSystem.addOverlap(this, this.player, pickup, () => {
        void this.handleFossilOverlap(pickup, hud);
      });
    });

    CollisionSystem.addOverlap(this, this.player, gem, () => {
      this.pickupSystem.collectGem();
    });

    this.add
      .text(
        GAME_WIDTH - 16,
        HUD_HEIGHT + 12,
        "Move: Arrow keys / WASD",
        {
          fontFamily: "Trebuchet MS",
          fontSize: "20px",
          color: "#fff8e8",
          backgroundColor: "#5e4127",
          padding: { left: 10, right: 10, top: 6, bottom: 6 }
        }
      )
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);
    this.add
      .text(
        GAME_WIDTH - 16,
        HUD_HEIGHT + 40,
        "Dig: Press Space + direction",
        {
          fontFamily: "Trebuchet MS",
          fontSize: "20px",
          color: "#fff8e8",
          backgroundColor: "#5e4127",
          padding: { left: 10, right: 10, top: 6, bottom: 6 }
        }
      )
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    if (this.variant === "cvc") {
      void this.announceCurrentCvcTarget();
    }
  }

  update(_time: number, delta: number): void {
    if (this.transitionStarted) {
      return;
    }

    if (this.activeDigAction) {
      const inputWhileDigging = this.player.getDigInputVector();
      const digStillHeld = this.digKey?.isDown ?? false;
      const sameDirection =
        inputWhileDigging.lengthSq() > 0 &&
        this.matchesDigDirection(inputWhileDigging, this.activeDigAction.direction);

      if (!digStillHeld || !sameDirection) {
        this.cancelDigAction();
      } else {
        this.player.updateDigAction(this.activeDigAction.direction, true);
        return;
      }
    }

    const input = this.player.getDigInputVector();
    this.player.updateDigAnimation(input);
    this.player.updateDigAction(input, false);

    if (input.lengthSq() === 0) {
      return;
    }

    if (this.digKey && Phaser.Input.Keyboard.JustDown(this.digKey)) {
      this.beginDig(input);
      return;
    }

    const step = (this.player.getDigSpeed() * delta) / 1000;
    const worldWidth = this.mode.config.worldCols * this.mode.config.cellSize;
    const worldHeight =
      this.mode.config.undergroundTop +
      this.mode.config.worldRows * this.mode.config.cellSize;
    const nextX = Phaser.Math.Clamp(
      this.player.x + input.x * step,
      18,
      worldWidth - 18
    );
    const nextY = Phaser.Math.Clamp(
      this.player.y + input.y * step,
      90,
      worldHeight - 56
    );
    const { width: bodyWidth, height: bodyHeight } =
      this.player.getCollisionFootprint();
    const collisionOffset = this.player.getCollisionCenterOffset();
    const nextBodyCenterX = nextX + collisionOffset.x;
    let nextBodyCenterY = nextY + collisionOffset.y;
    let resolvedNextY = nextY;

    if (Math.abs(input.y) > Math.abs(input.x) && input.y > 0) {
      const currentCell = this.diggingSystem.getCellAtWorld(
        this.player.x + collisionOffset.x,
        this.player.y + collisionOffset.y
      );

      if (currentCell) {
        const belowRow = currentCell.row + 1;
        const belowBlocked =
          !this.diggingSystem.isCellDug(belowRow, currentCell.col) ||
          !this.diggingSystem.isCellLaddered(belowRow, currentCell.col);

        if (belowBlocked) {
          const cellBottomWorldY =
            this.mode.config.undergroundTop +
            (currentCell.row + 1) * this.mode.config.cellSize;
          const maxBodyCenterY = cellBottomWorldY - bodyHeight / 2;

          if (nextBodyCenterY > maxBodyCenterY) {
            nextBodyCenterY = maxBodyCenterY;
            resolvedNextY = nextBodyCenterY - collisionOffset.y;
          }
        }
      }
    }

    const canMove =
      Math.abs(input.y) > Math.abs(input.x)
        ? this.diggingSystem.canMoveToWorldRect(
            nextBodyCenterX,
            nextBodyCenterY,
            bodyWidth,
            bodyHeight
          ) &&
          this.diggingSystem.canClimbWorldRect(
            nextBodyCenterX,
            nextBodyCenterY,
            bodyWidth,
            bodyHeight
          )
        : this.diggingSystem.canMoveToWorldRect(
            nextBodyCenterX,
            nextBodyCenterY,
            bodyWidth,
            bodyHeight
          );

    if (canMove) {
      this.player.setPosition(nextX, resolvedNextY);
    }
  }

  private createFossils(): FossilPickup[] {
    const spawnCells = [
      [3, 1],
      [6, 4],
      [9, 2],
      [12, 6],
      [15, 3],
      [18, 7]
    ];

    return this.mode.content.pickups.map((item, index) => {
      const [col, row] = spawnCells[index % spawnCells.length];
      const x = col * this.mode.config.cellSize + this.mode.config.cellSize / 2;
      const y =
        this.mode.config.undergroundTop +
        row * this.mode.config.cellSize +
        this.mode.config.cellSize / 2;
      const textureKey = fossilTextureKeys[index % fossilTextureKeys.length];

      const pickup = new FossilPickup(
        this,
        x,
        y,
        textureKey,
        item.id,
        item.label,
        item.learningType
      );

      pickup.hideUntilRevealed();
      this.fossilPlacements.push({ pickup, row, col });

      return pickup;
    });
  }

  private beginDig(input: Phaser.Math.Vector2): void {
    const collisionOffset = this.player.getCollisionCenterOffset();
    const targetCell = this.diggingSystem.getDigTargetCell(
      this.player.x + collisionOffset.x,
      this.player.y + collisionOffset.y,
      input
    );

    if (!targetCell || this.diggingSystem.isCellDug(targetCell.row, targetCell.col)) {
      return;
    }

    this.activeDigAction = {
      cell: targetCell,
      direction: input.clone()
    };
    this.player.updateDigAction(input, true);
    this.digTimer = this.time.delayedCall(DIG_TILE_DURATION_MS, () => {
      const action = this.activeDigAction;

      if (!action || this.transitionStarted) {
        this.activeDigAction = undefined;
        this.digTimer = undefined;
        return;
      }

      const newlyDug = this.diggingSystem.digCell(action.cell.row, action.cell.col);
      const isVertical = Math.abs(action.direction.y) > Math.abs(action.direction.x);

      if (isVertical) {
        this.diggingSystem.ensureLadderAtCell(action.cell);
        const currentCell = this.diggingSystem.getCellAtWorld(
          this.player.x + collisionOffset.x,
          this.player.y + collisionOffset.y
        );

        if (currentCell) {
          this.diggingSystem.ensureLadderAtCell(currentCell);
        }
      }

      this.revealFossilsInCells(newlyDug);

      const destination = this.diggingSystem.getCellCenter(action.cell);
      this.player.setPosition(
        destination.x - collisionOffset.x,
        destination.y - collisionOffset.y
      );
      this.activeDigAction = undefined;
      this.digTimer = undefined;
    });
  }

  private cancelDigAction(): void {
    this.digTimer?.remove(false);
    this.digTimer = undefined;
    this.activeDigAction = undefined;
  }

  private matchesDigDirection(
    input: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2
  ): boolean {
    return Math.sign(input.x) === Math.sign(direction.x) &&
      Math.sign(input.y) === Math.sign(direction.y);
  }

  private async handleFossilOverlap(
    pickup: FossilPickup,
    hud: Hud
  ): Promise<void> {
    if (this.transitionStarted || this.pickupInteractionLocked || pickup.isBusy()) {
      return;
    }

    if (this.variant !== "cvc") {
      if (!this.promptSystem.canCollect(pickup)) {
        return;
      }

      this.pickupSystem.collectFossil(pickup);
      return;
    }

    if (!this.promptSystem.canCollect(pickup)) {
      this.pickupInteractionLocked = true;
      this.audioFeedbackSystem.playIncorrectFeedback();
      await pickup.playIncorrectPickupFeedback();
      await this.waitForPlayerToClearPickup(pickup);
      this.pickupInteractionLocked = false;
      return;
    }

    this.pickupInteractionLocked = true;
    const pickupX = pickup.x;
    const pickupY = pickup.y;
    this.pickupSystem.collectFossil(pickup);
    await this.collectedFossilTray?.addCollectedFossil(
      pickup.getTextureKey(),
      pickup.label,
      pickupX,
      pickupY
    );
    await this.audioFeedbackSystem.playCorrectFeedback();
    this.pendingCvcTargets = this.pendingCvcTargets.filter(
      (word) => word !== pickup.label
    );

    if (this.mode.state.allFossilsCollected) {
      hud.setRepeatButtonEnabled(false);
      hud.setRepeatButtonVisible(false);
      this.pickupInteractionLocked = false;
      return;
    }

    await this.announceCurrentCvcTarget();
    this.pickupInteractionLocked = false;
  }

  private async announceCurrentCvcTarget(): Promise<void> {
    const currentWord = this.pendingCvcTargets[0];

    if (!currentWord) {
      return;
    }

    this.promptSystem.setPrompt({
      kind: "find_specific",
      displayText: "Listen to the word. Find the matching fossil.",
      targetType: LearningType.CVC_WORD,
      targetValue: currentWord,
      spokenText: currentWord
    });
    this.audioFeedbackSystem.setCurrentWord(currentWord);
    await this.audioFeedbackSystem.speakCurrentWord();
  }

  private revealFossilsInCells(cells: DigCell[]): void {
    for (const cell of cells) {
      for (const placement of this.fossilPlacements) {
        if (
          placement.row === cell.row &&
          placement.col === cell.col &&
          !placement.pickup.isRevealed()
        ) {
          placement.pickup.reveal();
          // TODO: Play fossil discovery audio cue once those assets are added.
        }
      }
    }
  }

  private waitForPlayerToClearPickup(pickup: FossilPickup): Promise<void> {
    return new Promise((resolve) => {
      const poll = () => {
        if (!this.player.active || !pickup.active || !pickup.visible) {
          resolve();
          return;
        }

        const playerBounds = this.player.body.getBounds();
        const pickupBounds = pickup.body.getBounds();

        if (!Phaser.Geom.Rectangle.Overlaps(playerBounds, pickupBounds)) {
          resolve();
          return;
        }

        this.time.delayedCall(50, poll);
      };

      poll();
    });
  }

  private createSurfaceTiles(): void {
    const tilesAcross = this.mode.config.worldCols;

    for (let index = 0; index < tilesAcross; index += 1) {
      const x = index * this.mode.config.cellSize + this.mode.config.cellSize / 2;
      const frame = terrainTileFrames.grass[index % terrainTileFrames.grass.length];

      this.add
        .sprite(
          x,
          UNDERGROUND_TOP - this.mode.config.cellSize / 2,
          ASSET_KEYS.TERRAIN,
          frame
        )
        .setDisplaySize(this.mode.config.cellSize, this.mode.config.cellSize)
        .setDepth(6);
    }
  }

  private async handleGemCollected(): Promise<void> {
    if (this.transitionStarted) {
      return;
    }

    this.transitionStarted = true;
    this.player.disableControls();
    this.promptSystem.showAssemblyPrompt();
    const worldView = this.cameras.main.worldView;

    const dino = await this.assemblySystem.playSequence(
      worldView.centerX,
      worldView.centerY + 40,
      this.mode.bossDino
    );

    await dino.roar();
    this.scene.start(SCENE_KEYS.DINO_CHASE, {
      variant: this.variant,
      stageTheme: this.mode.stageTheme
    });
  }
}
