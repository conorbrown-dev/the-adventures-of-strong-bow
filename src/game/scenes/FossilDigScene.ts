import Phaser from "phaser";

import { getCvcVoiceAssetKey } from "../data/cvcWords";
import { fossilTextureKeys } from "../data/fossils";
import { FossilPickup } from "../entities/FossilPickup";
import { GemPickup } from "../entities/GemPickup";
import { Player } from "../entities/Player";
import { LearningType } from "../data/learningTypes";
import { terrainTileFrames } from "../data/terrainTiles";
import { FossilDigMode } from "../modes/fossil-dig/FossilDigMode";
import type { FossilDigPickupContent } from "../modes/fossil-dig/FossilDigContent";
import { type FossilDigStageTheme } from "../modes/fossil-dig/FossilDigStageTheme";
import { CollisionSystem } from "../systems/CollisionSystem";
import { DinoAssemblySystem } from "../systems/DinoAssemblySystem";
import {
  DiggingSystem,
  type DigCell,
  type DigTarget
} from "../systems/DiggingSystem";
import { AudioFeedbackSystem } from "../systems/AudioFeedbackSystem";
import { LearningPromptSystem } from "../systems/LearningPromptSystem";
import { CollectedFossilTray } from "../ui/CollectedFossilTray";
import { Hud } from "../ui/Hud";
import { getConfiguredBgmVolume } from "../settings/parentalSettings";
import { ASSET_KEYS } from "../utils/assetKeys";
import {
  CVC_DIG_SITE_WIDTH_BLOCKS,
  DIG_PROTECTED_FLOOR_ROWS,
  DIG_JUMP_DISTANCE_BLOCKS,
  COLORS,
  DIG_JUMP_DURATION_MS,
  DIG_JUMP_HEIGHT_BLOCKS,
  GAME_WIDTH,
} from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";

interface FossilDigSceneData {
  stageTheme?: FossilDigStageTheme;
}

interface PlacedFossil {
  pickup: FossilPickup;
  row: number;
  col: number;
}

interface ActiveDigAction {
  target?: DigTarget;
  blockedByStone: boolean;
  direction: Phaser.Math.Vector2;
}

interface ActiveMoveStep {
  direction: Phaser.Math.Vector2;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}

interface ActiveJump {
  direction: Phaser.Math.Vector2;
  baseY: number;
}

interface JumpLanding {
  x: number;
  y: number;
}

interface CvcDigSite {
  index: number;
  startCol: number;
  endCol: number;
  targetLabel: string;
  targetPickupId: string;
  targetPickupIds: string[];
  pickups: FossilDigPickupContent[];
}

export class FossilDigScene extends Phaser.Scene {
  private stageTheme?: FossilDigStageTheme;
  private mode!: FossilDigMode;
  private player!: Player;
  private diggingSystem!: DiggingSystem;
  private promptSystem!: LearningPromptSystem;
  private hud!: Hud;
  private assemblySystem!: DinoAssemblySystem;
  private audioFeedbackSystem!: AudioFeedbackSystem;
  private collectedFossilTray?: CollectedFossilTray;
  private gem?: GemPickup;
  private gemPlacement?: DigCell;
  private fossils: FossilPickup[] = [];
  private fossilPlacements: PlacedFossil[] = [];
  private cvcDigSites: CvcDigSite[] = [];
  private currentCvcSiteIndex = 0;
  private activeCvcSiteIndex = 0;
  private collectedCorrectFossils: Array<{
    pickupId: string;
    label: string;
    textureKey: string;
  }> = [];
  private nextSiteArrow?: Phaser.GameObjects.Container;
  private pendingSiteArrivalIndex?: number;
  private pendingSurfaceAssembly = false;
  private surfaceAssemblyStarted = false;
  private surfaceTiles: Phaser.GameObjects.Sprite[] = [];
  private surfaceTunnelTiles: Phaser.GameObjects.Image[] = [];
  private surfaceLadders: Phaser.GameObjects.Image[] = [];
  private digKey?: Phaser.Input.Keyboard.Key;
  private jumpKey?: Phaser.Input.Keyboard.Key;
  private upKey?: Phaser.Input.Keyboard.Key;
  private downKey?: Phaser.Input.Keyboard.Key;
  private mobileDigHeld = false;
  private mobileDigPressed = false;
  private mobileDigReleased = false;
  private mobileJumpPressed = false;
  private pickupInteractionLocked = false;
  private movementLocked = false;
  private transitionStarted = false;
  private activeDigAction?: ActiveDigAction;
  private activeMoveStep?: ActiveMoveStep;
  private moveTween?: Phaser.Tweens.Tween;
  private activeJump?: ActiveJump;
  private jumpTween?: Phaser.Tweens.TweenChain;
  private cameraScrollTween?: Phaser.Tweens.Tween;
  private cameraTargetScrollY = 0;

  constructor() {
    super(SCENE_KEYS.FOSSIL_DIG);
  }

  init(data: FossilDigSceneData): void {
    this.stageTheme = data.stageTheme;
    this.gem = undefined;
    this.gemPlacement = undefined;
    this.fossils = [];
    this.fossilPlacements = [];
    this.cvcDigSites = [];
    this.currentCvcSiteIndex = 0;
    this.activeCvcSiteIndex = 0;
    this.collectedCorrectFossils = [];
    this.nextSiteArrow?.destroy();
    this.nextSiteArrow = undefined;
    this.pendingSiteArrivalIndex = undefined;
    this.pendingSurfaceAssembly = false;
    this.surfaceAssemblyStarted = false;
    this.surfaceTiles = [];
    this.surfaceTunnelTiles = [];
    this.surfaceLadders = [];
    this.activeDigAction = undefined;
    this.activeMoveStep = undefined;
    this.moveTween?.stop();
    this.moveTween = undefined;
    this.activeJump = undefined;
    this.jumpTween?.stop();
    this.jumpTween = undefined;
    this.cameraScrollTween?.stop();
    this.cameraScrollTween = undefined;
    this.pickupInteractionLocked = false;
    this.movementLocked = false;
    this.transitionStarted = false;
    this.cameraTargetScrollY = 0;
    this.mobileDigHeld = false;
    this.mobileDigPressed = false;
    this.mobileDigReleased = false;
    this.mobileJumpPressed = false;
  }

  create(): void {
    this.mode = FossilDigMode.create(this.stageTheme);
    this.startFossilDigBackgroundMusic();
    const worldWidth = this.mode.config.worldCols * this.mode.config.cellSize;
    const worldHeight =
      this.mode.config.undergroundTop +
      this.mode.config.worldRows * this.mode.config.cellSize;

    this.cameras.main.setBackgroundColor(COLORS.SKY);
    this.createAboveGroundBackground(worldWidth);
    this.createSurfaceTiles();

    this.diggingSystem = new DiggingSystem(this, {
      width: worldWidth,
      height: worldHeight,
      cellSize: this.mode.config.cellSize,
      undergroundTop: this.mode.config.undergroundTop
    });
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    this.hud = new Hud(this, this.mode.config.title);
    this.audioFeedbackSystem = new AudioFeedbackSystem(this);
    this.promptSystem = new LearningPromptSystem(
      this.hud,
      this.mode.content.initialPrompt,
      this.mode.content.validationMode
    );
    this.hud.setPromptAudioHandler(() => {
      const prompt = this.promptSystem.getCurrentPrompt();
      const spokenText = prompt.spokenText ?? prompt.displayText;
      void this.audioFeedbackSystem.speakPhrase(spokenText, {
        rate: 0.84,
        pitch: 1.08
      });
    });


    this.hud.setRepeatOnlyMode(true);
    this.cvcDigSites = this.createCvcDigSites();
    this.collectedFossilTray = new CollectedFossilTray(this);
    this.hud.setRepeatHandler(() => {
      void this.audioFeedbackSystem.speakCurrentWord();
    });
    this.hud.setRepeatButtonVisible(true);
    this.hud.setRepeatButtonEnabled(true);
    this.updateCvcProgress();

    const cursors = this.input.keyboard!.createCursorKeys();
    this.digKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.jumpKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.upKey = cursors.up;
    this.downKey = cursors.down;

    const startingSurfaceCol = Phaser.Math.Clamp(
      Math.round((164 - this.mode.config.cellSize / 2) / this.mode.config.cellSize),
      0,
      this.mode.config.worldCols - 1
    );
    this.player = new Player(
      this,
      this.getSurfaceColumnCenterX(startingSurfaceCol),
      this.getSurfacePlayerY()
    );
    this.player.configureForDigScene({
      left: cursors.left,
      right: cursors.right,
      up: cursors.up,
      down: cursors.down,
      dig: this.digKey,
      jump: this.jumpKey
    });
    this.createMobileControls(cursors);
    this.updateCameraPosition(true);
    this.cameras.main.roundPixels = true;

    this.fossils = this.createFossils();
    const gemSpawnCell = this.findGemSpawnCell();
    this.gem = new GemPickup(
      this,
      gemSpawnCell.col * this.mode.config.cellSize +
      this.mode.config.cellSize / 2,
      this.mode.config.undergroundTop +
      gemSpawnCell.row * this.mode.config.cellSize +
      this.mode.config.cellSize / 2,
      this.mode.rewardJewel.textureKey
    );
    this.gemPlacement = gemSpawnCell;

    this.assemblySystem = new DinoAssemblySystem(this);

    this.fossils.forEach((pickup) => {
      CollisionSystem.addOverlap(this, this.player, pickup, () => {
        void this.handleFossilOverlap(pickup);
      });
    });

    if (this.gem) {
      CollisionSystem.addOverlap(this, this.player, this.gem, () => {
        void this.handleGemCollected();
        return;
      });
    }

    void this.playOpeningAudioSequence();
  }

  update(_time: number, _delta: number): void {
    if (this.transitionStarted) {
      return;
    }

    this.updateCameraPosition();
    if (this.pendingSurfaceAssembly && !this.surfaceAssemblyStarted) {
      void this.tryBeginSurfaceAssembly();
    }
    this.checkForCvcSiteArrival();
    const input = this.player.getDigInputVector();
    const moveInput = this.getMoveInputVector(input);

    if (this.movementLocked) {
      this.player.updateDigAction(new Phaser.Math.Vector2(0, 0), false);
      this.player.updateDigAnimation(new Phaser.Math.Vector2(0, 0));
      return;
    }

    if (this.activeJump) {
      this.player.playDigJumpAnimation(this.activeJump.direction);
      return;
    }

    if (this.activeMoveStep) {
      if (this.tryStartJump(input)) {
        return;
      }

      const stepDurationMs = this.getStepDurationMs();
      this.player.updateDigAction(this.activeMoveStep.direction, false);
      this.player.updateDigAnimation(this.activeMoveStep.direction, stepDurationMs);
      return;
    }

    if (
      this.activeDigAction &&
      ((this.digKey && Phaser.Input.Keyboard.JustUp(this.digKey)) || this.mobileDigReleased)
    ) {
      this.mobileDigReleased = false;
      this.cancelDigAction();
    }

    if (this.activeDigAction) {
      const inputWhileDigging = this.player.getDigInputVector();
      const digStillHeld = (this.digKey?.isDown ?? false) || this.mobileDigHeld;
      const sameDirection =
        inputWhileDigging.lengthSq() > 0 &&
        this.matchesDigDirection(inputWhileDigging, this.activeDigAction.direction);

      if (!digStillHeld || !sameDirection) {
        this.cancelDigAction();
      } else {
        return;
      }
    }

    if (
      (this.digKey && Phaser.Input.Keyboard.JustDown(this.digKey)) ||
      this.mobileDigPressed
    ) {
      this.mobileDigPressed = false;
      this.beginDig(input);
      return;
    }

    if (this.tryStartFall()) {
      return;
    }

    if (this.tryStartJump(input)) {
      return;
    }

    if (this.tryStartClimbStep()) {
      return;
    }

    if (this.tryStartHorizontalStep(moveInput)) {
      return;
    }

    this.player.updateDigAction(input, false);
    this.player.updateDigAnimation(new Phaser.Math.Vector2(0, 0));
  }

  private createFossils(): FossilPickup[] {
    const spawnCells = [
      { colOffset: 1, row: 1 },
      { colOffset: 3, row: 3 },
      { colOffset: 5, row: 2 },
      { colOffset: 7, row: 4 },
      { colOffset: 9, row: 1 }
    ];
    const occupiedCells = new Set<string>();
    const cvcPickupItems = this.cvcDigSites.flatMap((site) => site.pickups.map((pickup) => ({ pickup, site })))
    const pickupItems = cvcPickupItems

    return pickupItems.map(({ pickup: item, site }, index) => {
      const spawnCell = spawnCells[index % spawnCells.length];
      const baseCol =
        (site?.startCol ?? 0) + spawnCell.colOffset;
      const { col, row } = this.findDiggableSpawnCell(
        spawnCell.row,
        baseCol,
        occupiedCells,
        site?.startCol ?? 0,
        site?.endCol ?? this.mode.config.worldCols - 1
      );
      occupiedCells.add(this.getCellKey(row, col));
      const x = col * this.mode.config.cellSize + this.mode.config.cellSize / 2;
      const y =
        this.mode.config.undergroundTop +
        row * this.mode.config.cellSize +
        this.mode.config.cellSize / 2 +
        FossilPickup.CELL_OFFSET_Y;
      const textureKey = fossilTextureKeys[index % fossilTextureKeys.length];

      const createdPickup = new FossilPickup(
        this,
        x,
        y,
        textureKey,
        item.id,
        item.label,
        item.learningType
      );

      createdPickup.hideUntilRevealed();
      this.fossilPlacements.push({ pickup: createdPickup, row, col });

      return createdPickup;
    });
  }

  private findDiggableSpawnCell(
    baseRow: number,
    baseCol: number,
    occupiedCells: Set<string>,
    minCol = 0,
    maxCol = this.mode.config.worldCols - 1
  ): DigCell {
    if (
      this.isSpawnCellInBounds(baseRow, baseCol) &&
      baseCol >= minCol &&
      baseCol <= maxCol &&
      !this.diggingSystem.isStoneCellAt(baseRow, baseCol) &&
      !occupiedCells.has(this.getCellKey(baseRow, baseCol))
    ) {
      return { row: baseRow, col: baseCol };
    }

    for (let radius = 1; radius <= 3; radius += 1) {
      for (let row = baseRow - radius; row <= baseRow + radius; row += 1) {
        for (let col = baseCol - radius; col <= baseCol + radius; col += 1) {
          if (
            this.isSpawnCellInBounds(row, col) &&
            col >= minCol &&
            col <= maxCol &&
            !this.diggingSystem.isStoneCellAt(row, col) &&
            !occupiedCells.has(this.getCellKey(row, col))
          ) {
            return { row, col };
          }
        }
      }
    }

    return {
      row: Phaser.Math.Clamp(baseRow, 0, this.getMaxSpawnRow()),
      col: Phaser.Math.Clamp(baseCol, minCol, maxCol)
    };
  }

  private getCellKey(row: number, col: number): string {
    return `${row}:${col}`;
  }

  private findGemSpawnCell(): DigCell {
    const occupiedCells = new Set(
      this.fossilPlacements.map((placement) =>
        this.getCellKey(placement.row, placement.col)
      )
    );
    const cvcFinalSite = this.cvcDigSites[this.cvcDigSites.length - 1];
    const minCol = cvcFinalSite?.startCol ?? 0;
    const maxCol = cvcFinalSite?.endCol ?? this.mode.config.worldCols - 1;
    const preferredCol = Math.max(minCol, maxCol - 1);

    return this.findDiggableSpawnCell(
      this.getMaxSpawnRow(),
      preferredCol,
      occupiedCells,
      minCol,
      maxCol
    );
  }

  private isSpawnCellInBounds(row: number, col: number): boolean {
    return (
      row >= 0 &&
      row <= this.getMaxSpawnRow() &&
      col >= 0 &&
      col < this.mode.config.worldCols
    );
  }

  private getMaxSpawnRow(): number {
    return Math.max(
      0,
      this.mode.config.worldRows - DIG_PROTECTED_FLOOR_ROWS - 1
    );
  }

  private beginDig(input: Phaser.Math.Vector2): void {
    if (input.lengthSq() === 0) {
      return;
    }

    const collisionOffset = this.player.getCollisionCenterOffset();
    const playerBodyCenterX = this.player.x + collisionOffset.x;
    const playerBodyCenterY = this.player.y + collisionOffset.y;
    const intendedTargetCol = this.getIntendedDigTargetCol(
      playerBodyCenterX,
      playerBodyCenterY,
      input
    );

    if (
      intendedTargetCol !== null &&
      !this.isColumnUnlocked(intendedTargetCol)
    ) {
      return;
    }

    const blockedByStone = this.diggingSystem.isDigBlockedByStone(
      playerBodyCenterX,
      playerBodyCenterY,
      input
    );
    const target = this.diggingSystem.getDigTarget(
      playerBodyCenterX,
      playerBodyCenterY,
      input
    );

    if (!target && !blockedByStone) {
      return;
    }

    if (
      target &&
      (target.kind === "surface"
        ? this.diggingSystem.isSurfaceOpen(target.col)
        : this.diggingSystem.isCellDug(target.row, target.col))
    ) {
      return;
    }

    this.activeDigAction = {
      target: target ?? undefined,
      blockedByStone,
      direction: input.clone()
    };

    if (blockedByStone) {
      this.audioFeedbackSystem.playShovelClink();
    } else {
      this.audioFeedbackSystem.playDigging();
    }

    this.player.startDigAction(input, () => {
      void this.completeDigAction(this.activeDigAction);
    });
  }

  private cancelDigAction(): void {
    const canceledDirection = this.activeDigAction?.direction.clone();
    this.activeDigAction = undefined;
    this.player.cancelDigAction(
      canceledDirection
    );
  }

  private async completeDigAction(action?: ActiveDigAction): Promise<void> {
    if (!action || action !== this.activeDigAction || this.transitionStarted) {
      return;
    }

    if (action.blockedByStone) {
      this.activeDigAction = undefined;
      this.player.cancelDigAction(action.direction);
      return;
    }

    if (!action.target) {
      this.activeDigAction = undefined;
      this.player.cancelDigAction(action.direction);
      return;
    }

    const collisionOffset = this.player.getCollisionCenterOffset();
    let newlyDug: DigCell[] = [];

    if (action.target.kind === "surface") {
      this.diggingSystem.digSurface(action.target.col);
      this.syncSurfaceColumnVisual(action.target.col);
    } else {
      newlyDug = this.diggingSystem.digCell(action.target.row, action.target.col);
    }

    if (Math.abs(action.direction.y) > Math.abs(action.direction.x)) {
      if (action.target.kind === "cell") {
        this.diggingSystem.ensureLadderAtCell({
          row: action.target.row,
          col: action.target.col
        });
      }
      const currentCell = this.diggingSystem.getCellAtWorld(
        this.player.x + collisionOffset.x,
        this.player.y + collisionOffset.y
      );

      if (currentCell) {
        this.diggingSystem.ensureLadderAtCell(currentCell);
      }
    }

    this.activeDigAction = undefined;
    this.player.cancelDigAction(action.direction);
    await this.revealFossilsInCells(newlyDug);
    this.updateSurfaceOpenings(newlyDug);
    this.syncSurfaceColumnVisual(action.target.col);
  }

  private matchesDigDirection(
    input: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2
  ): boolean {
    return Math.sign(input.x) === Math.sign(direction.x) &&
      Math.sign(input.y) === Math.sign(direction.y);
  }

  private async handleFossilOverlap(
    pickup: FossilPickup
  ): Promise<void> {
    if (
      this.transitionStarted ||
      this.pickupInteractionLocked ||
      pickup.isBusy() ||
      !pickup.isCollectible()
    ) {
      return;
    }

    const currentSite = this.getCurrentCvcSite();

    if (!currentSite) {
      return;
    }

    if (pickup.pickupId !== currentSite.targetPickupId) {
      this.pickupInteractionLocked = true;
      this.audioFeedbackSystem.playIncorrectFeedback();
      await pickup.playIncorrectPickupFeedback(this.isSingleSiteSequentialCvcMode());
      this.pickupInteractionLocked = false;
      return;
    }

    this.pickupInteractionLocked = true;
    const pickupX = pickup.x;
    const pickupY = pickup.y;
    pickup.collect();
    this.mode.state.markFossilCollected(pickup.pickupId);
    this.collectedCorrectFossils.push({
      pickupId: pickup.pickupId,
      label: pickup.label,
      textureKey: pickup.getTextureKey()
    });
    await this.collectedFossilTray?.addCollectedFossil(
      pickup.getTextureKey(),
      pickup.label,
      pickupX,
      pickupY
    );
    await this.audioFeedbackSystem.playCorrectFeedback();
    this.updateCvcProgress();

    if (this.isSingleSiteSequentialCvcMode()) {
      currentSite.targetPickupIds = currentSite.targetPickupIds.filter(
        (targetPickupId) => targetPickupId !== pickup.pickupId
      );

      if (currentSite.targetPickupIds.length > 0) {
        const nextTargetPickupId =
          Phaser.Utils.Array.GetRandom(currentSite.targetPickupIds) ??
          currentSite.targetPickupIds[0];
        const nextTargetPickup = currentSite.pickups.find(
          (sitePickup) => sitePickup.id === nextTargetPickupId
        );

        if (nextTargetPickup) {
          currentSite.targetPickupId = nextTargetPickup.id;
          currentSite.targetLabel = nextTargetPickup.label;
          await this.announceCurrentCvcTarget();
          this.pickupInteractionLocked = false;
          return;
        }
      }
    }

    const nextSite = this.cvcDigSites[this.collectedCorrectFossils.length];

    if (nextSite && this.cvcDigSites.length > 1) {
      this.currentCvcSiteIndex = nextSite.index;
      this.promptSystem.setPrompt({
        kind: "collect_all",
        displayText: "Great job! Head right to the next dig site."
      });
      this.hud.setRepeatButtonEnabled(false);
      this.showNextSiteGuidance(nextSite);
      await this.audioFeedbackSystem.speakPhrase(
        "Good job. Let's move onto the next dig site. Head to the right.",
        { rate: 0.86, pitch: 1.06 }
      );
    } else {
      this.mode.state.markGemAvailable();
      if (this.revealGemIfReady()) {
        this.audioFeedbackSystem.playFossilDiscovered();
      }
      this.updateCvcProgress();
      this.hud.setRepeatButtonEnabled(false);
      this.hud.setRepeatButtonVisible(false);
      this.promptSystem.showGemPrompt();
      await this.audioFeedbackSystem.playVoiceClip(ASSET_KEYS.FIND_CRYSTAL, {
        volume: 0.9
      });
    }

    this.pickupInteractionLocked = false;
  }

  private async announceCurrentCvcTarget(): Promise<void> {
    const currentSite = this.getCurrentCvcSite();
    const currentWord = currentSite?.targetLabel;

    if (!currentWord) {
      return;
    }

    this.promptSystem.setPrompt({
      kind: "find_specific",
      displayText: "Listen to the word. Find the matching fossil.",
      targetType: LearningType.CVC_WORD,
      targetValue: currentWord,
      spokenText: `Listen to the word. Find the matching fossil. ${currentWord}.`
    });
    this.hud.setRepeatButtonVisible(true);
    this.hud.setRepeatButtonEnabled(true);
    this.audioFeedbackSystem.setCurrentWord(
      currentWord,
      getCvcVoiceAssetKey(currentWord)
    );
    await this.audioFeedbackSystem.speakCurrentWord();
  }

  private async playOpeningAudioSequence(): Promise<void> {
    await this.playSkippableIntroVoiceover();
    await this.announceCurrentCvcTarget();
  }

  private async playSkippableIntroVoiceover(): Promise<void> {
    await new Promise<void>((resolve) => {
      const introVoiceover = this.sound.add(ASSET_KEYS.FOSSIL_DIG_INTRO, {
        volume: 0.85
      });
      let resolved = false;

      const finish = (): void => {
        if (resolved) {
          return;
        }

        resolved = true;
        cleanup();
        introVoiceover.destroy();
        resolve();
      };

      const skip = (): void => {
        if (!introVoiceover.isPlaying) {
          finish();
          return;
        }

        introVoiceover.stop();
        finish();
      };

      const cleanup = (): void => {
        this.input.keyboard?.off("keydown", skip);
        this.input.off("pointerdown", skip);
        introVoiceover.off("complete", finish);
        this.events.off(Phaser.Scenes.Events.SHUTDOWN, finish);
      };

      this.input.keyboard?.once("keydown", skip);
      this.input.once("pointerdown", skip);
      introVoiceover.once("complete", finish);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, finish);
      introVoiceover.play();
    });
  }

  private async revealFossilsInCells(cells: DigCell[]): Promise<void> {
    let revealedAnyFossil = false;
    const revealedGem = this.revealGemInCells(cells);

    for (const cell of cells) {
      for (const placement of this.fossilPlacements) {
        if (
          placement.row === cell.row &&
          placement.col === cell.col &&
          !placement.pickup.isRevealed()
        ) {
          placement.pickup.reveal();
          revealedAnyFossil = true;
        }
      }
    }

    if (revealedAnyFossil || revealedGem) {
      this.audioFeedbackSystem.playFossilDiscovered();
    }

    if (revealedAnyFossil) {
      await this.playRevealedFossilVoiceover();
    }
  }

  private revealGemIfReady(): boolean {
    if (
      !this.mode.state.gemAvailable ||
      !this.gemPlacement ||
      !this.diggingSystem.isCellDug(this.gemPlacement.row, this.gemPlacement.col)
    ) {
      return false;
    }

    return this.revealGem();
  }

  private revealGemInCells(cells: DigCell[]): boolean {
    const gemPlacement = this.gemPlacement;

    if (!this.mode.state.gemAvailable || !gemPlacement) {
      return false;
    }

    const gemCellWasDug = cells.some(
      (cell) =>
        cell.row === gemPlacement.row &&
        cell.col === gemPlacement.col
    );

    if (!gemCellWasDug) {
      return false;
    }

    return this.revealGem();
  }

  private revealGem(): boolean {
    if (!this.gem || this.gem.isRevealed()) {
      return false;
    }

    this.gem.reveal();
    return true;
  }

  private createSurfaceTiles(): void {
    const tilesAcross = this.mode.config.worldCols;
    const surfaceY =
      this.mode.config.undergroundTop - this.mode.config.cellSize / 2;

    for (let index = 0; index < tilesAcross; index += 1) {
      const x = index * this.mode.config.cellSize + this.mode.config.cellSize / 2;
      const frame = terrainTileFrames.grass[index % terrainTileFrames.grass.length];

      const tile = this.add
        .sprite(
          x,
          surfaceY,
          ASSET_KEYS.TERRAIN,
          frame
        )
        .setDisplaySize(this.mode.config.cellSize, this.mode.config.cellSize)
        .setDepth(6);
      const tunnelTile = this.add
        .image(x, surfaceY, ASSET_KEYS.TUNNEL_DIRT)
        .setDisplaySize(this.mode.config.cellSize, this.mode.config.cellSize)
        .setDepth(4)
        .setVisible(false);
      const ladder = this.add
        .image(x, surfaceY, ASSET_KEYS.LADDER_TOP)
        .setDisplaySize(this.mode.config.cellSize - 8, this.mode.config.cellSize)
        .setDepth(5)
        .setVisible(false);
      this.surfaceTiles[index] = tile;
      this.surfaceTunnelTiles[index] = tunnelTile;
      this.surfaceLadders[index] = ladder;
    }
  }

  private updateSurfaceOpenings(cells: DigCell[]): void {
    cells.forEach((cell) => {
      if (cell.row !== 0) {
        return;
      }

      this.syncSurfaceColumnVisual(cell.col);
    });
  }

  private getSurfacePlayerY(): number {
    return (
      this.mode.config.undergroundTop -
      this.mode.config.cellSize -
      this.getPlayerStandingOffsetY()
    );
  }

  private getSurfaceEntryPlayerY(): number {
    return this.mode.config.undergroundTop - this.getPlayerStandingOffsetY();
  }

  private isPlayerInSurfaceEntry(): boolean {
    return (
      Math.abs(this.player.y - this.getSurfaceEntryPlayerY()) <= 1
    );
  }

  private getMoveInputVector(
    digInput: Phaser.Math.Vector2
  ): Phaser.Math.Vector2 {
    const moveInput = digInput.clone();
    moveInput.y = 0;

    if (moveInput.lengthSq() > 0) {
      moveInput.normalize();
    }

    return moveInput;
  }

  private tryStartClimbStep(): boolean {
    const wantsDown = this.downKey?.isDown ?? false;
    const wantsUp = this.upKey?.isDown ?? false;

    if (wantsDown === wantsUp) {
      return false;
    }

    const direction = wantsDown ? 1 : -1;
    const collisionOffset = this.player.getCollisionCenterOffset();
    const bodyCenterX = this.player.x + collisionOffset.x;
    const bodyCenterY = this.player.y + collisionOffset.y;
    const currentCell = this.diggingSystem.getCellAtWorld(bodyCenterX, bodyCenterY);
    const surfacePlayerY = this.getSurfacePlayerY();
    const isAboveGround = this.player.y <= surfacePlayerY + 1;
    const isInSurfaceEntry = this.isPlayerInSurfaceEntry();

    if (isAboveGround) {
      if (direction < 0) {
        return false;
      }

      const col = Phaser.Math.Clamp(
        Math.floor(bodyCenterX / this.mode.config.cellSize),
        0,
        this.mode.config.worldCols - 1
      );

      if (
        !this.isColumnUnlocked(col) ||
        !this.diggingSystem.isSurfaceOpen(col)
      ) {
        return false;
      }

      this.startMoveStep(
        this.getSurfaceColumnCenterX(col) - collisionOffset.x,
        this.getSurfaceEntryPlayerY(),
        new Phaser.Math.Vector2(0, 1)
      );
      return true;
    }

    if (isInSurfaceEntry) {
      const col = this.getNearestColumn(bodyCenterX);

      if (direction < 0) {
        this.startMoveStep(
          this.getSurfaceColumnCenterX(col) - collisionOffset.x,
          surfacePlayerY,
          new Phaser.Math.Vector2(0, -1)
        );
        return true;
      }

      if (
        !this.isColumnUnlocked(col) ||
        this.isCellBlockedByRevealSuspense({ row: 0, col }) ||
        !this.diggingSystem.isCellDug(0, col) ||
        !this.diggingSystem.isCellLaddered(0, col)
      ) {
        return false;
      }

      const destination = this.getDigCellPlayerPosition({ row: 0, col });
      this.startMoveStep(
        destination.x,
        destination.y,
        new Phaser.Math.Vector2(0, 1)
      );
      return true;
    }

    if (!currentCell) {
      return false;
    }

    const currentCellHasLadder = this.diggingSystem.isCellLaddered(
      currentCell.row,
      currentCell.col
    );
    const belowCell = {
      row: currentCell.row + 1,
      col: currentCell.col
    };
    const canMoveIntoBelowCell =
      direction > 0 &&
      this.isSpawnCellInBounds(belowCell.row, belowCell.col) &&
      this.isColumnUnlocked(belowCell.col) &&
      !this.isCellBlockedByRevealSuspense(belowCell) &&
      this.diggingSystem.isCellDug(belowCell.row, belowCell.col);
    const canEnterLadderBelow =
      canMoveIntoBelowCell &&
      this.diggingSystem.isCellLaddered(belowCell.row, belowCell.col);
    const canDropFromLadderBelow =
      canMoveIntoBelowCell && currentCellHasLadder;

    if (!currentCellHasLadder && !canEnterLadderBelow) {
      return false;
    }

    if (direction < 0 && currentCell.row === 0 && currentCellHasLadder) {
      if (!this.diggingSystem.isSurfaceOpen(currentCell.col)) {
        return false;
      }

      this.startMoveStep(
        this.getSurfaceColumnCenterX(currentCell.col) - collisionOffset.x,
        surfacePlayerY,
        new Phaser.Math.Vector2(0, -1)
      );
      return true;
    }

    if (!currentCellHasLadder && canEnterLadderBelow) {
      const destination = this.getDigCellPlayerPosition(belowCell);
      this.startMoveStep(
        destination.x,
        destination.y,
        new Phaser.Math.Vector2(0, 1)
      );
      return true;
    }

    const targetRow = currentCell.row + direction;
    if (direction > 0 && canDropFromLadderBelow) {
      const destination = this.getDigCellPlayerPosition({
        row: targetRow,
        col: currentCell.col
      });
      this.startMoveStep(
        destination.x,
        destination.y,
        new Phaser.Math.Vector2(0, 1)
      );
      return true;
    }

    if (
      !this.isSpawnCellInBounds(targetRow, currentCell.col) ||
      !this.isColumnUnlocked(currentCell.col) ||
      this.isCellBlockedByRevealSuspense({
        row: targetRow,
        col: currentCell.col
      }) ||
      !this.diggingSystem.isCellDug(targetRow, currentCell.col) ||
      !this.diggingSystem.isCellLaddered(targetRow, currentCell.col)
    ) {
      return false;
    }

    const destination = this.getDigCellPlayerPosition({
      row: targetRow,
      col: currentCell.col
    });
    this.startMoveStep(
      destination.x,
      destination.y,
      new Phaser.Math.Vector2(0, direction)
    );
    return true;
  }

  private tryStartFall(): boolean {
    const collisionOffset = this.player.getCollisionCenterOffset();
    const bodyCenterX = this.player.x + collisionOffset.x;
    const bodyCenterY = this.player.y + collisionOffset.y;
    const currentCol = this.getNearestColumn(bodyCenterX);
    const surfacePlayerY = this.getSurfacePlayerY();
    const isAboveGround = this.player.y <= surfacePlayerY + 1;
    const isInSurfaceEntry = this.isPlayerInSurfaceEntry();

    if (isAboveGround) {
      return false;
    }

    if (isInSurfaceEntry) {
      if (this.isSurfaceEntrySupported(currentCol)) {
        return false;
      }

      if (this.isCellBlockedByRevealSuspense({ row: 0, col: currentCol })) {
        return false;
      }

      const destination = this.getDigCellPlayerPosition({ row: 0, col: currentCol });
      this.startMoveStep(
        destination.x,
        destination.y,
        new Phaser.Math.Vector2(0, 1)
      );
      return true;
    }

    const currentCell = this.diggingSystem.getCellAtWorld(bodyCenterX, bodyCenterY);

    if (!currentCell || this.isUndergroundCellSupported(currentCell)) {
      return false;
    }

    const targetCell = {
      row: currentCell.row + 1,
      col: currentCell.col
    };

    if (this.isCellBlockedByRevealSuspense(targetCell)) {
      return false;
    }

    const destination = this.getDigCellPlayerPosition(targetCell);
    this.startMoveStep(
      destination.x,
      destination.y,
      new Phaser.Math.Vector2(0, 1)
    );
    return true;
  }

  private tryStartJump(input: Phaser.Math.Vector2): boolean {
    const keyboardJump = Boolean(
      this.jumpKey && Phaser.Input.Keyboard.JustDown(this.jumpKey)
    );
    if (!keyboardJump && !this.mobileJumpPressed) {
      return false;
    }
    this.mobileJumpPressed = false;

    const direction = new Phaser.Math.Vector2(
      input.x === 0 ? 0 : Math.sign(input.x),
      input.y < 0 ? -1 : 0
    );

    this.startJump(direction);
    return true;
  }

  private createMobileControls(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys
  ): void {
    if (!this.sys.game.device.input.touch) {
      return;
    }
    this.input.addPointer(3);
    const controls = this.add.container(0, 0).setScrollFactor(0).setDepth(1000);
    controls.add(this.add.circle(132, 623, 112, 0x1f2937, 0.32)
      .setStrokeStyle(3, 0xffffff, 0.35));
    this.createFossilDirectionButton(controls, 132, 548, "▲", cursors.up);
    this.createFossilDirectionButton(controls, 57, 623, "◀", cursors.left);
    this.createFossilDirectionButton(controls, 207, 623, "▶", cursors.right);
    this.createFossilDirectionButton(controls, 132, 698, "▼", cursors.down);
    this.createFossilActionButton(controls, GAME_WIDTH - 205, 675, "DIG", true);
    this.createFossilActionButton(controls, GAME_WIDTH - 82, 675, "JUMP", false);
  }

  private createFossilDirectionButton(
    controls: Phaser.GameObjects.Container,
    x: number,
    y: number,
    label: string,
    key: Phaser.Input.Keyboard.Key
  ): void {
    const button = this.add.circle(x, y, 37, 0x2b1a11, 0.78)
      .setStrokeStyle(4, 0xffdf72, 0.9).setInteractive();
    const text = this.add.text(x, y, label, {
      fontFamily: "Trebuchet MS", fontSize: "34px", fontStyle: "bold", color: "#fffaf0"
    }).setOrigin(0.5);
    controls.add([button, text]);
    const release = (): void => {
      key.isDown = false;
      button.setFillStyle(0x2b1a11, 0.78).setScale(1);
    };
    button.on("pointerdown", () => {
      key.isDown = true;
      button.setFillStyle(0x8b5a2b, 0.95).setScale(1.08);
    });
    button.on("pointerup", release).on("pointerout", release).on("pointerupoutside", release);
  }

  private createFossilActionButton(
    controls: Phaser.GameObjects.Container,
    x: number,
    y: number,
    label: string,
    isDig: boolean
  ): void {
    const button = this.add.circle(x, y, 51, isDig ? 0x8b5a2b : 0x365f9d, 0.88)
      .setStrokeStyle(4, 0xffdf72, 0.95).setInteractive();
    const text = this.add.text(x, y, label, {
      fontFamily: "Trebuchet MS", fontSize: "21px", fontStyle: "bold", color: "#fffaf0"
    }).setOrigin(0.5);
    controls.add([button, text]);
    button.on("pointerdown", () => {
      button.setScale(1.08);
      if (isDig) {
        this.mobileDigHeld = true;
        this.mobileDigPressed = true;
        this.mobileDigReleased = false;
      } else {
        this.mobileJumpPressed = true;
      }
    });
    const release = (): void => {
      button.setScale(1);
      if (isDig && this.mobileDigHeld) {
        this.mobileDigHeld = false;
        this.mobileDigReleased = true;
      }
    };
    button.on("pointerup", release).on("pointerout", release).on("pointerupoutside", release);
  }

  private tryStartHorizontalStep(moveInput: Phaser.Math.Vector2): boolean {
    if (moveInput.x === 0) {
      return false;
    }

    const directionX = Math.sign(moveInput.x);
    const collisionOffset = this.player.getCollisionCenterOffset();
    const bodyCenterX = this.player.x + collisionOffset.x;
    const bodyCenterY = this.player.y + collisionOffset.y;
    const surfacePlayerY = this.getSurfacePlayerY();
    const isAboveGround = this.player.y <= surfacePlayerY + 1;
    const { width: bodyWidth, height: bodyHeight } =
      this.player.getCollisionFootprint();

    if (isAboveGround) {
      const currentCol = this.getNearestColumn(bodyCenterX);
      const targetCol = currentCol + directionX;

      if (
        targetCol < 0 ||
        targetCol >= this.mode.config.worldCols ||
        !this.isColumnUnlocked(targetCol)
      ) {
        return false;
      }

      this.startMoveStep(
        this.getSurfaceColumnCenterX(targetCol) - collisionOffset.x,
        surfacePlayerY,
        new Phaser.Math.Vector2(directionX, 0)
      );
      return true;
    }

    const currentCell = this.diggingSystem.getCellAtWorld(bodyCenterX, bodyCenterY);

    if (!currentCell) {
      return false;
    }

    const targetCell = {
      row: currentCell.row,
      col: currentCell.col + directionX
    };

    if (
      !this.isSpawnCellInBounds(targetCell.row, targetCell.col) ||
      !this.isColumnUnlocked(targetCell.col) ||
      this.isCellBlockedByRevealSuspense(targetCell) ||
      !this.diggingSystem.isCellDug(targetCell.row, targetCell.col)
    ) {
      return false;
    }

    const destination = this.getDigCellPlayerPosition(targetCell);
    const bodyCenter = this.getDigCellStandingBodyCenter(targetCell.row, targetCell.col);
    const canMove = this.diggingSystem.canMoveToWorldRect(
      bodyCenter.x,
      bodyCenter.y,
      bodyWidth,
      bodyHeight
    );

    if (!canMove) {
      return false;
    }

    this.startMoveStep(
      destination.x,
      destination.y,
      new Phaser.Math.Vector2(directionX, 0)
    );
    return true;
  }

  private startMoveStep(
    targetX: number,
    targetY: number,
    direction: Phaser.Math.Vector2
  ): void {
    const stepDurationMs = this.getStepDurationMs();

    this.moveTween?.stop();
    this.activeMoveStep = {
      direction: direction.clone(),
      startX: this.player.x,
      startY: this.player.y,
      targetX,
      targetY
    };
    this.player.updateDigAction(direction, false);
    this.player.updateDigAnimation(direction, stepDurationMs);
    this.moveTween = this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration: stepDurationMs,
      ease: "Linear",
      onComplete: () => {
        this.player.setPosition(targetX, targetY);
        this.activeMoveStep = undefined;
        this.updateCameraPosition(true);
        this.moveTween = undefined;
      }
    });
  }

  private startJump(direction: Phaser.Math.Vector2): void {
    const jumpBase = this.getJumpBasePosition();
    const jumpHeight = this.mode.config.cellSize * DIG_JUMP_HEIGHT_BLOCKS;
    const landing = this.getJumpLanding(
      direction.x,
      direction.y < 0,
      jumpBase.x,
      jumpBase.y
    );
    const midpointX = Phaser.Math.Linear(this.player.x, landing.x, 0.5);
    const apexY = jumpBase.y - jumpHeight;

    this.moveTween?.stop();
    this.moveTween = undefined;
    this.activeMoveStep = undefined;
    this.jumpTween?.stop();
    this.activeJump = {
      direction: direction.clone(),
      baseY: jumpBase.y
    };
    this.player.updateDigAction(direction, false);
    this.player.playDigJumpAnimation(direction);
    this.jumpTween = this.tweens.chain({
      targets: this.player,
      tweens: [
        {
          x: midpointX,
          y: apexY,
          duration: DIG_JUMP_DURATION_MS / 2,
          ease: "Sine.Out"
        },
        {
          x: landing.x,
          y: landing.y,
          duration: DIG_JUMP_DURATION_MS / 2,
          ease: "Sine.In"
        }
      ],
      onComplete: () => {
        this.player.setPosition(landing.x, landing.y);
        this.activeJump = undefined;
        this.updateCameraPosition(true);
        this.jumpTween = undefined;
      }
    });
  }

  private getJumpBasePosition(): { x: number; y: number } {
    if (this.activeMoveStep) {
      const distanceToStart = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.activeMoveStep.startX,
        this.activeMoveStep.startY
      );
      const distanceToTarget = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.activeMoveStep.targetX,
        this.activeMoveStep.targetY
      );

      if (distanceToStart <= distanceToTarget) {
        return {
          x: this.activeMoveStep.startX,
          y: this.activeMoveStep.startY
        };
      }

      return {
        x: this.activeMoveStep.targetX,
        y: this.activeMoveStep.targetY
      };
    }

    const collisionOffset = this.player.getCollisionCenterOffset();
    const bodyCenterX = this.player.x + collisionOffset.x;
    const bodyCenterY = this.player.y + collisionOffset.y;
    const surfacePlayerY = this.getSurfacePlayerY();

    if (this.player.y <= surfacePlayerY + 1) {
      const col = this.getNearestColumn(bodyCenterX);
      return {
        x: this.getSurfaceColumnCenterX(col) - collisionOffset.x,
        y: surfacePlayerY
      };
    }

    if (this.isPlayerInSurfaceEntry()) {
      const col = this.getNearestColumn(bodyCenterX);
      return {
        x: this.getSurfaceColumnCenterX(col) - collisionOffset.x,
        y: this.getSurfaceEntryPlayerY()
      };
    }

    const nearestRow = Phaser.Math.Clamp(
      Math.round(
        (bodyCenterY - this.mode.config.undergroundTop - this.mode.config.cellSize / 2) /
        this.mode.config.cellSize
      ),
      0,
      this.mode.config.worldRows - 1
    );
    const nearestCol = this.getNearestColumn(bodyCenterX);
    const destination = this.getDigCellPlayerPosition({
      row: nearestRow,
      col: nearestCol
    });

    return destination;
  }

  private getJumpLanding(
    directionX: number,
    wantsUpwardLadderJump: boolean,
    baseX: number,
    baseY: number
  ): JumpLanding {
    const ladderLanding = this.getJumpLandingForLadderAbove(baseX, baseY);

    if (ladderLanding && wantsUpwardLadderJump) {
      return ladderLanding;
    }

    if (directionX === 0) {
      return { x: baseX, y: baseY };
    }

    const collisionOffset = this.player.getCollisionCenterOffset();
    const { width: bodyWidth, height: bodyHeight } =
      this.player.getCollisionFootprint();
    const worldWidth = this.diggingSystem.getWorldWidth();
    const startBodyCenterX = baseX + collisionOffset.x;
    const startBodyCenterY = baseY + collisionOffset.y;
    const desiredBodyCenterX = Phaser.Math.Clamp(
      startBodyCenterX +
      Math.sign(directionX) *
      this.mode.config.cellSize *
      DIG_JUMP_DISTANCE_BLOCKS,
      bodyWidth / 2,
      worldWidth - bodyWidth / 2
    );
    const sampleCount = 4;

    for (let index = 1; index <= sampleCount; index += 1) {
      const sampleBodyCenterX = Phaser.Math.Linear(
        startBodyCenterX,
        desiredBodyCenterX,
        index / sampleCount
      );

      if (
        !this.diggingSystem.canMoveToWorldRect(
          sampleBodyCenterX,
          startBodyCenterY,
          bodyWidth,
          bodyHeight
        )
      ) {
        return { x: baseX, y: baseY };
      }
    }

    const snappedTargetCol = this.getNearestColumn(desiredBodyCenterX);

    if (!this.isColumnUnlocked(snappedTargetCol)) {
      return { x: baseX, y: baseY };
    }

    return this.getSurfaceOrUndergroundJumpLanding(
      snappedTargetCol,
      startBodyCenterY,
      collisionOffset,
      baseX,
      baseY
    );
  }

  private getJumpLandingForLadderAbove(
    baseX: number,
    baseY: number
  ): JumpLanding | null {
    const collisionOffset = this.player.getCollisionCenterOffset();
    const bodyCenterX = baseX + collisionOffset.x;
    const bodyCenterY = baseY + collisionOffset.y;
    const currentCell = this.diggingSystem.getCellAtWorld(bodyCenterX, bodyCenterY);

    if (!currentCell) {
      return null;
    }

    const targetCell = {
      row: currentCell.row - 1,
      col: currentCell.col
    };

    if (
      !this.isSpawnCellInBounds(targetCell.row, targetCell.col) ||
      !this.diggingSystem.isCellLaddered(targetCell.row, targetCell.col) ||
      !this.isValidJumpLandingCell(targetCell)
    ) {
      return null;
    }

    return this.getDigCellPlayerPosition(targetCell);
  }

  private getSurfaceOrUndergroundJumpLanding(
    targetCol: number,
    startBodyCenterY: number,
    collisionOffset: { x: number; y: number },
    baseX: number,
    baseY: number
  ): JumpLanding {
    if (startBodyCenterY < this.mode.config.undergroundTop) {
      return {
        x: this.getSurfaceColumnCenterX(targetCol) - collisionOffset.x,
        y: baseY
      };
    }

    const startRow = Phaser.Math.Clamp(
      Math.round(
        (startBodyCenterY -
          this.mode.config.undergroundTop -
          this.mode.config.cellSize / 2) / this.mode.config.cellSize
      ),
      0,
      this.mode.config.worldRows - 1
    );
    const preferredRows = [startRow - 1, startRow];

    for (const row of preferredRows) {
      if (!this.isValidJumpLandingCell({ row, col: targetCol })) {
        continue;
      }

      const destination = this.getDigCellPlayerPosition({
        row,
        col: targetCol
      });

      return {
        x: destination.x,
        y: destination.y
      };
    }

    return { x: baseX, y: baseY };
  }

  private isValidJumpLandingCell(cell: DigCell): boolean {
    if (
      !this.isSpawnCellInBounds(cell.row, cell.col) ||
      !this.isColumnUnlocked(cell.col) ||
      this.isCellBlockedByRevealSuspense(cell) ||
      !this.diggingSystem.isCellDug(cell.row, cell.col) ||
      !this.isUndergroundCellSupported(cell)
    ) {
      return false;
    }

    const { width: bodyWidth, height: bodyHeight } =
      this.player.getCollisionFootprint();
    const bodyCenter = this.getDigCellStandingBodyCenter(cell.row, cell.col);

    return this.diggingSystem.canMoveToWorldRect(
      bodyCenter.x,
      bodyCenter.y,
      bodyWidth,
      bodyHeight
    );
  }

  private getStepDurationMs(): number {
    return (this.mode.config.cellSize / this.player.getDigSpeed()) * 1000;
  }

  private getNearestColumn(worldX: number): number {
    return Phaser.Math.Clamp(
      Math.round((worldX - this.mode.config.cellSize / 2) / this.mode.config.cellSize),
      0,
      this.mode.config.worldCols - 1
    );
  }

  private getSurfaceColumnCenterX(col: number): number {
    return col * this.mode.config.cellSize + this.mode.config.cellSize / 2;
  }

  private isSurfaceEntrySupported(col: number): boolean {
    return (
      !this.diggingSystem.isCellDug(0, col) ||
      this.diggingSystem.isCellLaddered(0, col)
    );
  }

  private isUndergroundCellSupported(cell: DigCell): boolean {
    if (this.diggingSystem.isCellLaddered(cell.row, cell.col)) {
      return true;
    }

    const belowRow = cell.row + 1;

    if (belowRow >= this.mode.config.worldRows) {
      return true;
    }

    return (
      !this.diggingSystem.isCellDug(belowRow, cell.col) ||
      this.diggingSystem.isCellLaddered(belowRow, cell.col)
    );
  }

  private isCellBlockedByRevealSuspense(cell: DigCell): boolean {
    return this.fossilPlacements.some(
      (placement) =>
        placement.row === cell.row &&
        placement.col === cell.col &&
        placement.pickup.isRevealSuspenseActive()
    );
  }

  private getDigCellPlayerPosition(cell: DigCell): { x: number; y: number } {
    const collisionOffset = this.player.getCollisionCenterOffset();
    const centerX = this.getSurfaceColumnCenterX(cell.col);

    return {
      x: centerX - collisionOffset.x,
      y:
        this.mode.config.undergroundTop +
        (cell.row + 1) * this.mode.config.cellSize -
        this.getPlayerStandingOffsetY()
    };
  }

  private getDigCellStandingBodyCenter(
    row: number,
    col: number
  ): { x: number; y: number } {
    const { height } = this.player.getCollisionFootprint();

    return {
      x: this.getSurfaceColumnCenterX(col),
      y:
        this.mode.config.undergroundTop +
        (row + 1) * this.mode.config.cellSize -
        height / 2
    };
  }

  private getPlayerStandingOffsetY(): number {
    return (
      Player.BODY_OFFSET_Y +
      Player.BODY_HEIGHT -
      Player.DISPLAY_HEIGHT / 2
    );
  }

  private syncSurfaceColumnVisual(col: number): void {
    const isOpen = this.diggingSystem.isSurfaceOpen(col);
    const hasEntryLadder =
      isOpen &&
      (
        !this.diggingSystem.isCellDug(0, col) ||
        this.diggingSystem.isCellLaddered(0, col)
      );
    this.surfaceTiles[col]?.setVisible(!isOpen);
    this.surfaceTunnelTiles[col]?.setVisible(isOpen);
    this.surfaceLadders[col]?.setVisible(hasEntryLadder);
  }

  private updateCameraPosition(force = false): void {
    const camera = this.cameras.main;
    const maxScrollX = Math.max(
      0,
      this.mode.config.worldCols * this.mode.config.cellSize - GAME_WIDTH
    );
    const maxScrollY = Math.max(
      0,
      this.mode.config.worldRows * this.mode.config.cellSize
    );
    const desiredScrollX = this.getCameraTargetScrollX(maxScrollX);
    this.cameraTargetScrollY = this.getCameraTargetScrollY(maxScrollY);

    if (force) {
      this.cameraScrollTween?.stop();
      this.cameraScrollTween = undefined;
      camera.setScroll(desiredScrollX, this.cameraTargetScrollY);
      return;
    }

    if (!this.cameraScrollTween) {
      camera.scrollX = Phaser.Math.Linear(camera.scrollX, desiredScrollX, 0.18);
    }
    camera.scrollY = Phaser.Math.Linear(
      camera.scrollY,
      this.cameraTargetScrollY,
      0.2
    );
  }

  private getCameraTargetScrollX(maxScrollX: number): number {
    if (this.cvcDigSites.length > 0) {
      return Phaser.Math.Clamp(
        this.cvcDigSites[this.activeCvcSiteIndex].startCol * this.mode.config.cellSize,
        0,
        maxScrollX
      );
    }

    return Phaser.Math.Clamp(
      this.player.x - GAME_WIDTH / 2,
      0,
      maxScrollX
    );
  }

  private getCameraTargetScrollY(maxScrollY: number): number {
    const collisionOffset = this.player.getCollisionCenterOffset();
    const bodyCenterX = this.player.x + collisionOffset.x;
    const bodyCenterY = this.player.y + collisionOffset.y;
    const currentCell = this.diggingSystem.getCellAtWorld(bodyCenterX, bodyCenterY);
    const revealFocusRow = this.getRevealSuspenseFocusRow();

    if (currentCell) {
      return Phaser.Math.Clamp(
        Math.max(
          (currentCell.row + 3) * this.mode.config.cellSize,
          revealFocusRow !== null
            ? (revealFocusRow + 2) * this.mode.config.cellSize
            : 0
        ),
        0,
        maxScrollY
      );
    }

    const surfacePlayerY = this.getSurfacePlayerY();
    const isInSurfaceShaft =
      this.player.y > surfacePlayerY + 1 &&
      bodyCenterY < this.mode.config.undergroundTop;

    if (isInSurfaceShaft) {
      return Phaser.Math.Clamp(
        Math.max(
          this.mode.config.cellSize * 2,
          revealFocusRow !== null
            ? (revealFocusRow + 2) * this.mode.config.cellSize
            : 0
        ),
        0,
        maxScrollY
      );
    }

    if (revealFocusRow !== null) {
      return Phaser.Math.Clamp(
        (revealFocusRow + 2) * this.mode.config.cellSize,
        0,
        maxScrollY
      );
    }

    return 0;
  }

  private getRevealSuspenseFocusRow(): number | null {
    let focusRow: number | null = null;

    for (const placement of this.fossilPlacements) {
      if (!placement.pickup.isRevealSuspenseActive()) {
        continue;
      }

      if (focusRow === null || placement.row > focusRow) {
        focusRow = placement.row;
      }
    }

    return focusRow;
  }

  private createAboveGroundBackground(worldWidth: number): void {
    this.add
      .image(worldWidth / 2, this.mode.config.undergroundTop / 2, ASSET_KEYS.LEVEL_BACKGROUND)
      .setDisplaySize(worldWidth, this.mode.config.undergroundTop)
      .setDepth(-3);
  }

  private async handleGemCollected(): Promise<void> {
    if (this.transitionStarted || this.pendingSurfaceAssembly) {
      return;
    }

    if (!this.gem?.collect()) {
      return;
    }

    this.mode.state.markGemCollected();
    this.updateCvcProgress();
    this.pendingSurfaceAssembly = true;
    this.hud.setRepeatButtonVisible(false);
    this.promptSystem.setPrompt({
      kind: "collect_all",
      displayText: "Climb back to the surface!"
    });
    await this.audioFeedbackSystem.playVoiceClip(
      ASSET_KEYS.CLIMB_TO_THE_SURFACE,
      { volume: 0.9 }
    );
    return;
  }

  private createCvcDigSites(): CvcDigSite[] {
    const siteCount = Math.min(
      this.mode.config.cvcSiteCount ?? 1,
      this.mode.content.pickups.length
    );
    const pickupsPerSite = Math.max(1, this.mode.config.cvcPickupsPerSite ?? 1);
    const shuffledPickups = Phaser.Utils.Array.Shuffle([...this.mode.content.pickups]);

    if (siteCount === 1) {
      const siteTargets = shuffledPickups
        .slice(0, Math.min(pickupsPerSite, this.mode.content.pickups.length))
        .map((pickup, index) => ({
          ...pickup,
          id: `${pickup.id}-site-0-target-${index}`
        }));
      const initialTarget =
        Phaser.Utils.Array.GetRandom(siteTargets) ?? siteTargets[0];

      return [
        {
          index: 0,
          startCol: 0,
          endCol: CVC_DIG_SITE_WIDTH_BLOCKS - 1,
          targetLabel: initialTarget.label,
          targetPickupId: initialTarget.id,
          targetPickupIds: siteTargets.map((pickup) => pickup.id),
          pickups: Phaser.Utils.Array.Shuffle(siteTargets)
        }
      ];
    }

    const targetPool = shuffledPickups.slice(0, siteCount);
    const targetIds = new Set(targetPool.map((pickup) => pickup.id));
    const distractorPool = this.mode.content.pickups.filter(
      (pickup) => !targetIds.has(pickup.id)
    );
    const fallbackDistractors =
      distractorPool.length > 0 ? distractorPool : this.mode.content.pickups;

    return Array.from({ length: siteCount }, (_, index) => {
      const target = targetPool[index % targetPool.length];
      const distractors = this.takeCycledPickups(
        fallbackDistractors.filter((pickup) => pickup.id !== target.id),
        pickupsPerSite - 1
      ).map((pickup, pickupIndex) => ({
        ...pickup,
        id: `${pickup.id}-site-${index}-wrong-${pickupIndex}`
      }));
      const targetPickupId = `${target.id}-site-${index}-target`;
      const pickups = Phaser.Utils.Array.Shuffle([
        ...distractors,
        {
          ...target,
          id: targetPickupId
        }
      ]);

      return {
        index,
        startCol: index * CVC_DIG_SITE_WIDTH_BLOCKS,
        endCol: (index + 1) * CVC_DIG_SITE_WIDTH_BLOCKS - 1,
        targetLabel: target.label,
        targetPickupId,
        targetPickupIds: [targetPickupId],
        pickups
      };
    });
  }

  private takeCycledPickups(
    source: FossilDigPickupContent[],
    count: number
  ): FossilDigPickupContent[] {
    const safeSource =
      source.length > 0 ? source : [...this.mode.content.pickups];
    const cycled: FossilDigPickupContent[] = [];

    for (let index = 0; index < count; index += 1) {
      const pickup = safeSource[index % safeSource.length];
      cycled.push(pickup);
    }

    return Phaser.Utils.Array.Shuffle(cycled);
  }

  private getCurrentCvcSite(): CvcDigSite | undefined {
    return this.cvcDigSites[this.currentCvcSiteIndex];
  }

  private getAccessibleMaxCol(): number {
    return this.mode.config.worldCols - 1;
  }

  private isColumnUnlocked(col: number): boolean {
    return col >= 0 && col <= this.getAccessibleMaxCol();
  }

  private getIntendedDigTargetCol(
    worldX: number,
    worldY: number,
    input: Phaser.Math.Vector2
  ): number | null {
    if (input.lengthSq() === 0) {
      return null;
    }

    const isVertical = Math.abs(input.y) > Math.abs(input.x);

    if (worldY < this.mode.config.undergroundTop) {
      return this.getNearestColumn(worldX);
    }

    const currentCell = this.diggingSystem.getCellAtWorld(worldX, worldY);

    if (!currentCell) {
      return null;
    }

    if (isVertical) {
      return currentCell.col;
    }

    return currentCell.col + Math.sign(input.x);
  }

  private updateCvcProgress(): void {
    this.hud.updateProgress({
      collected: this.collectedCorrectFossils.length,
      total: this.mode.state.totalFossils,
      gemAvailable: this.mode.state.gemAvailable,
      gemCollected: this.mode.state.gemCollected
    });
  }

  private isSingleSiteSequentialCvcMode(): boolean {
    return (this.mode.config.cvcSiteCount ?? 1) === 1;
  }

  private showNextSiteGuidance(nextSite: CvcDigSite): void {
    this.nextSiteArrow?.destroy();
    this.pendingSiteArrivalIndex = nextSite.index;

    const x =
      (nextSite.startCol + 0.5) * this.mode.config.cellSize;
    const y = this.mode.config.undergroundTop - this.mode.config.cellSize * 1.6;
    const arrow = this.add
      .triangle(0, 0, 0, 48, 28, 0, 56, 48, 0xffdd57)
      .setStrokeStyle(4, 0x5e4127);
    const label = this.add
      .text(28, -18, "Next dig site", {
        fontFamily: "Trebuchet MS",
        fontSize: "26px",
        color: "#2d1f14",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.nextSiteArrow = this.add.container(x, y, [arrow, label]).setDepth(80);
    this.tweens.add({
      targets: this.nextSiteArrow,
      alpha: 0.2,
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut"
    });
  }

  private checkForCvcSiteArrival(): void {
    if (
      this.pendingSiteArrivalIndex === undefined ||
      this.activeMoveStep ||
      this.activeJump ||
      this.activeDigAction
    ) {
      return;
    }

    const targetSite = this.cvcDigSites[this.pendingSiteArrivalIndex];

    if (!targetSite) {
      this.pendingSiteArrivalIndex = undefined;
      this.nextSiteArrow?.destroy();
      this.nextSiteArrow = undefined;
      return;
    }

    const bodyCenterX = this.player.x + this.player.getCollisionCenterOffset().x;
    const currentCol = this.getNearestColumn(bodyCenterX);

    if (currentCol < targetSite.startCol) {
      return;
    }

    this.activeCvcSiteIndex = targetSite.index;
    this.nextSiteArrow?.destroy();
    this.nextSiteArrow = undefined;
    this.pendingSiteArrivalIndex = undefined;
    this.startCvcSiteCameraPan(targetSite.index);
    void this.announceCurrentCvcTarget();
  }

  private startCvcSiteCameraPan(siteIndex: number): void {
    const maxScrollX = Math.max(
      0,
      this.mode.config.worldCols * this.mode.config.cellSize - GAME_WIDTH
    );
    const targetScrollX = Phaser.Math.Clamp(
      this.cvcDigSites[siteIndex].startCol * this.mode.config.cellSize,
      0,
      maxScrollX
    );

    this.cameraScrollTween?.stop();
    this.cameraScrollTween = this.tweens.add({
      targets: this.cameras.main,
      scrollX: targetScrollX,
      duration: 420,
      ease: "Cubic.Out",
      onComplete: () => {
        this.cameraScrollTween = undefined;
      }
    });
  }

  private async tryBeginSurfaceAssembly(): Promise<void> {
    if (
      this.surfaceAssemblyStarted ||
      this.activeMoveStep ||
      this.activeJump ||
      this.activeDigAction ||
      this.isPlayerInSurfaceEntry()
    ) {
      return;
    }

    if (this.player.y > this.getSurfacePlayerY() + 1) {
      return;
    }

    this.surfaceAssemblyStarted = true;
    this.pendingSurfaceAssembly = false;
    this.transitionStarted = true;
    this.player.disableControls();
    this.promptSystem.setPrompt({
      kind: "collect_all",
      displayText: "The Wordosaur is forming!"
    });
    await this.playCollectedFossilSummon();
    const worldView = this.cameras.main.worldView;
    const dino = await this.assemblySystem.playSequence(
      worldView.centerX,
      this.mode.config.undergroundTop / 2 + 86,
      this.mode.bossDino
    );

    await dino.roar();
    await this.audioFeedbackSystem.playVoiceClip(
      ASSET_KEYS.DINO_COMES_TO_LIFE,
      { volume: 0.9 }
    );
    this.scene.start(SCENE_KEYS.DINO_CHASE, {
      stageTheme: this.mode.stageTheme
    });
  }

  private async playRevealedFossilVoiceover(): Promise<void> {
    const shouldRestoreRepeatButton =
      !this.transitionStarted &&
      !this.pendingSurfaceAssembly;
    let cleanedUp = false;

    this.movementLocked = true;
    if (shouldRestoreRepeatButton) {
      this.hud.setRepeatButtonEnabled(false);
    }

    const cleanup = (): void => {
      if (cleanedUp) {
        return;
      }

      cleanedUp = true;
      this.input.off("pointerdown", skipVoiceover);
      this.events.off(Phaser.Scenes.Events.SHUTDOWN, skipVoiceover);
    };

    const skipVoiceover = (): void => {
      this.audioFeedbackSystem.interruptVoicePlayback();
      cleanup();
    };

    this.input.once("pointerdown", skipVoiceover);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, skipVoiceover);

    try {
      await this.audioFeedbackSystem.playVoiceClip(
        ASSET_KEYS.IS_THIS_THE_CORRECT_FOSSIL,
        { volume: 0.9 }
      );
    } finally {
      cleanup();
      this.movementLocked = false;
      if (shouldRestoreRepeatButton) {
        this.hud.setRepeatButtonEnabled(true);
      }
    }
  }

  private async playCollectedFossilSummon(): Promise<void> {
    const entries = this.collectedFossilTray?.getEntryWorldPositions() ?? [];

    if (entries.length === 0) {
      return;
    }

    this.collectedFossilTray?.setVisible(false);
    const centerX = GAME_WIDTH / 2;
    const centerY = 340;
    const orbitRadiusX = 132;
    const orbitRadiusY = 76;
    const orbitContainer = this.add.container(centerX, centerY).setDepth(120);
    orbitContainer.setScrollFactor(0);

    const orbitSprites = entries.map((entry) => {
      const sprite = this.add
        .image(entry.x, entry.y, entry.textureKey)
        .setDisplaySize(76, 76)
        .setScrollFactor(0)
        .setDepth(120);

      return sprite;
    });

    await Promise.all(
      orbitSprites.map((sprite, index) => {
        const angle = (Math.PI * 2 * index) / orbitSprites.length - Math.PI / 2;

        return this.playTween({
          targets: sprite,
          x: centerX + Math.cos(angle) * orbitRadiusX,
          y: centerY + Math.sin(angle) * orbitRadiusY,
          duration: 520,
          ease: "Cubic.Out"
        });
      })
    );

    orbitSprites.forEach((sprite) => {
      sprite.x -= centerX;
      sprite.y -= centerY;
      orbitContainer.add(sprite);
    });

    await this.playTween({
      targets: orbitContainer,
      angle: 360,
      duration: 900,
      ease: "Sine.InOut"
    });

    await Promise.all(
      orbitSprites.map((sprite) =>
        this.playTween({
          targets: sprite,
          x: 0,
          y: 0,
          alpha: 0.24,
          scaleX: 0.38,
          scaleY: 0.38,
          duration: 360,
          ease: "Quad.In"
        })
      )
    );

    orbitContainer.destroy(true);
  }

  private playTween(
    config: Phaser.Types.Tweens.TweenBuilderConfig
  ): Promise<void> {
    return new Promise((resolve) => {
      this.tweens.add({
        ...config,
        onComplete: () => resolve()
      });
    });
  }

  private startFossilDigBackgroundMusic(): void {
    const bgmVolume = getConfiguredBgmVolume();
    const existingSound = this.sound.get(ASSET_KEYS.DIG_BGM);

    if (existingSound) {
      (
        existingSound as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound
      ).setVolume(bgmVolume);
      if (!existingSound.isPlaying) {
        existingSound.play({
          loop: true,
          volume: bgmVolume
        });
      }
      return;
    }

    this.sound.play(ASSET_KEYS.DIG_BGM, {
      loop: true,
      volume: bgmVolume
    });
  }
}
