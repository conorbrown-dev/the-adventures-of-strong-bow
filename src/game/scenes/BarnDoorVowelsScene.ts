import Phaser from "phaser";

import { getCvcVoiceAssetKey } from "../data/cvcWords";
import { fossilTextureKeys } from "../data/letters";
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
import { BarnDoorVowelsStageTheme } from "../modes/barn-door-vowels/BarnDoorVowelsStageTheme";
import { BarnDoorVowelsMode } from "../modes/barn-door-vowels/BarnDoorVowelsMode";

interface FossilDigSceneData {
  stageTheme?: FossilDigStageTheme;
}



export class FossilDigScene extends Phaser.Scene {
  private stageTheme?: BarnDoorVowelsStageTheme;
  private mode!: FossilDigMode;
  private player!: Player;
  private promptSystem!: LearningPromptSystem;
  private hud!: Hud;
  private assemblySystem!: DinoAssemblySystem;
  private audioFeedbackSystem!: AudioFeedbackSystem;

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
  private pickupInteractionLocked = false;
  private movementLocked = false;
  private transitionStarted = false;
  private moveTween?: Phaser.Tweens.Tween;
  private jumpTween?: Phaser.Tweens.TweenChain;
  private cameraScrollTween?: Phaser.Tweens.Tween;
  private cameraTargetScrollY = 0;

  constructor() {
    super(SCENE_KEYS.FOSSIL_DIG);
  }

  init(data: BarnDoorVowelsSceneData): void {
    this.stageTheme = data.stageTheme;
    this.vowels = [];
    this.nextSiteArrow?.destroy();
    this.nextSiteArrow = undefined;
    this.pendingSiteArrivalIndex = undefined;
    this.pendingSurfaceAssembly = false;
    this.surfaceAssemblyStarted = false;
    this.surfaceTiles = [];
    this.surfaceTunnelTiles = [];
    this.surfaceLadders = [];
    this.moveTween?.stop();
    this.moveTween = undefined;
    this.jumpTween?.stop();
    this.jumpTween = undefined;
    this.cameraScrollTween?.stop();
    this.cameraScrollTween = undefined;
    this.pickupInteractionLocked = false;
    this.movementLocked = false;
    this.transitionStarted = false;
    this.cameraTargetScrollY = 0;
  }

  create(): void {
    this.mode = BarnDoorVowelsMode.create(this.stageTheme);
    this.startBarnDoorVowelsBackgroundMusic();

    this.cameras.main.setBackgroundColor(COLORS.SKY);
    this.createAboveGroundBackground(worldWidth);
    this.createSurfaceTiles();

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
    this.hud.setRepeatHandler(() => {
      void this.audioFeedbackSystem.speakCurrentWord();
    });
    this.hud.setRepeatButtonVisible(true);
    this.hud.setRepeatButtonEnabled(true);
    this.updateVowelProgress();

    const cursors = this.input.keyboard!.createCursorKeys();

    const startingSurfaceCol = Phaser.Math.Clamp(
      Math.round((164 - this.mode.config.cellSize / 2) / this.mode.config.cellSize),
      0,
      this.mode.config.worldCols - 1
    );

    this.updateCameraPosition(true);
    this.cameras.main.roundPixels = true;

    this.vowels = this.createVowels();
    const gemSpawnCell = this.findGemSpawnCell();

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
  }

  // private createVowels(): FossilPickup[] {
  //   const spawnCells = [
  //     { colOffset: 1, row: 1 },
  //     { colOffset: 3, row: 3 },
  //     { colOffset: 5, row: 2 },
  //     { colOffset: 7, row: 4 },
  //     { colOffset: 9, row: 1 }
  //   ];
  //   const occupiedCells = new Set<string>();
  //   const cvcPickupItems = this.cvcDigSites.flatMap((site) => site.pickups.map((pickup) => ({ pickup, site })))
  //   const pickupItems = cvcPickupItems

  //   return pickupItems.map(({ pickup: item, site }, index) => {
  //     const spawnCell = spawnCells[index % spawnCells.length];
  //     const baseCol =
  //       (site?.startCol ?? 0) + spawnCell.colOffset;
  //     const { col, row } = this.findDiggableSpawnCell(
  //       spawnCell.row,
  //       baseCol,
  //       occupiedCells,
  //       site?.startCol ?? 0,
  //       site?.endCol ?? this.mode.config.worldCols - 1
  //     );
  //     occupiedCells.add(this.getCellKey(row, col));
  //     const x = col * this.mode.config.cellSize + this.mode.config.cellSize / 2;
  //     const y =
  //       this.mode.config.undergroundTop +
  //       row * this.mode.config.cellSize +
  //       this.mode.config.cellSize / 2 +
  //       FossilPickup.CELL_OFFSET_Y;
  //     const textureKey = fossilTextureKeys[index % fossilTextureKeys.length];

  //     const createdPickup = new FossilPickup(
  //       this,
  //       x,
  //       y,
  //       textureKey,
  //       item.id,
  //       item.label,
  //       item.learningType
  //     );

  //     createdPickup.hideUntilRevealed();
  //     this.fossilPlacements.push({ pickup: createdPickup, row, col });

  //     return createdPickup;
  //   });
  // }

  // private findDiggableSpawnCell(
  //   baseRow: number,
  //   baseCol: number,
  //   occupiedCells: Set<string>,
  //   minCol = 0,
  //   maxCol = this.mode.config.worldCols - 1
  // ): DigCell {
  //   if (
  //     this.isSpawnCellInBounds(baseRow, baseCol) &&
  //     baseCol >= minCol &&
  //     baseCol <= maxCol &&
  //     !this.diggingSystem.isStoneCellAt(baseRow, baseCol) &&
  //     !occupiedCells.has(this.getCellKey(baseRow, baseCol))
  //   ) {
  //     return { row: baseRow, col: baseCol };
  //   }

  //   for (let radius = 1; radius <= 3; radius += 1) {
  //     for (let row = baseRow - radius; row <= baseRow + radius; row += 1) {
  //       for (let col = baseCol - radius; col <= baseCol + radius; col += 1) {
  //         if (
  //           this.isSpawnCellInBounds(row, col) &&
  //           col >= minCol &&
  //           col <= maxCol &&
  //           !this.diggingSystem.isStoneCellAt(row, col) &&
  //           !occupiedCells.has(this.getCellKey(row, col))
  //         ) {
  //           return { row, col };
  //         }
  //       }
  //     }
  //   }

  //   return {
  //     row: Phaser.Math.Clamp(baseRow, 0, this.getMaxSpawnRow()),
  //     col: Phaser.Math.Clamp(baseCol, minCol, maxCol)
  //   };
  // }

  // private getCellKey(row: number, col: number): string {
  //   return `${row}:${col}`;
  // }

  // private findGemSpawnCell(): DigCell {
  //   const occupiedCells = new Set(
  //     this.fossilPlacements.map((placement) =>
  //       this.getCellKey(placement.row, placement.col)
  //     )
  //   );
  //   const cvcFinalSite = this.cvcDigSites[this.cvcDigSites.length - 1];
  //   const minCol = cvcFinalSite?.startCol ?? 0;
  //   const maxCol = cvcFinalSite?.endCol ?? this.mode.config.worldCols - 1;
  //   const preferredCol = Math.max(minCol, maxCol - 1);

  //   return this.findDiggableSpawnCell(
  //     this.getMaxSpawnRow(),
  //     preferredCol,
  //     occupiedCells,
  //     minCol,
  //     maxCol
  //   );
  // }

  // private isSpawnCellInBounds(row: number, col: number): boolean {
  //   return (
  //     row >= 0 &&
  //     row <= this.getMaxSpawnRow() &&
  //     col >= 0 &&
  //     col < this.mode.config.worldCols
  //   );
  // }

  // private getMaxSpawnRow(): number {
  //   return Math.max(
  //     0,
  //     this.mode.config.worldRows - DIG_PROTECTED_FLOOR_ROWS - 1
  //   );
  // }

  // private beginDig(input: Phaser.Math.Vector2): void {
  //   if (input.lengthSq() === 0) {
  //     return;
  //   }

  //   const collisionOffset = this.player.getCollisionCenterOffset();
  //   const playerBodyCenterX = this.player.x + collisionOffset.x;
  //   const playerBodyCenterY = this.player.y + collisionOffset.y;
  //   const intendedTargetCol = this.getIntendedDigTargetCol(
  //     playerBodyCenterX,
  //     playerBodyCenterY,
  //     input
  //   );

  //   if (
  //     intendedTargetCol !== null &&
  //     !this.isColumnUnlocked(intendedTargetCol)
  //   ) {
  //     return;
  //   }

  //   const blockedByStone = this.diggingSystem.isDigBlockedByStone(
  //     playerBodyCenterX,
  //     playerBodyCenterY,
  //     input
  //   );
  //   const target = this.diggingSystem.getDigTarget(
  //     playerBodyCenterX,
  //     playerBodyCenterY,
  //     input
  //   );

  //   if (!target && !blockedByStone) {
  //     return;
  //   }

  //   if (
  //     target &&
  //     (target.kind === "surface"
  //       ? this.diggingSystem.isSurfaceOpen(target.col)
  //       : this.diggingSystem.isCellDug(target.row, target.col))
  //   ) {
  //     return;
  //   }

  //   this.activeDigAction = {
  //     target: target ?? undefined,
  //     blockedByStone,
  //     direction: input.clone()
  //   };

  //   if (blockedByStone) {
  //     this.audioFeedbackSystem.playShovelClink();
  //   } else {
  //     this.audioFeedbackSystem.playDigging();
  //   }

  //   this.player.startDigAction(input, () => {
  //     void this.completeDigAction(this.activeDigAction);
  //   });
  // }

  // private cancelDigAction(): void {
  //   const canceledDirection = this.activeDigAction?.direction.clone();
  //   this.activeDigAction = undefined;
  //   this.player.cancelDigAction(
  //     canceledDirection
  //   );
  // }

  // private async completeDigAction(action?: ActiveDigAction): Promise<void> {
  //   if (!action || action !== this.activeDigAction || this.transitionStarted) {
  //     return;
  //   }

  //   if (action.blockedByStone) {
  //     this.activeDigAction = undefined;
  //     this.player.cancelDigAction(action.direction);
  //     return;
  //   }

  //   if (!action.target) {
  //     this.activeDigAction = undefined;
  //     this.player.cancelDigAction(action.direction);
  //     return;
  //   }

  //   const collisionOffset = this.player.getCollisionCenterOffset();
  //   let newlyDug: DigCell[] = [];

  //   if (action.target.kind === "surface") {
  //     this.diggingSystem.digSurface(action.target.col);
  //     this.syncSurfaceColumnVisual(action.target.col);
  //   } else {
  //     newlyDug = this.diggingSystem.digCell(action.target.row, action.target.col);
  //   }

  //   if (Math.abs(action.direction.y) > Math.abs(action.direction.x)) {
  //     if (action.target.kind === "cell") {
  //       this.diggingSystem.ensureLadderAtCell({
  //         row: action.target.row,
  //         col: action.target.col
  //       });
  //     }
  //     const currentCell = this.diggingSystem.getCellAtWorld(
  //       this.player.x + collisionOffset.x,
  //       this.player.y + collisionOffset.y
  //     );

  //     if (currentCell) {
  //       this.diggingSystem.ensureLadderAtCell(currentCell);
  //     }
  //   }

  //   this.activeDigAction = undefined;
  //   this.player.cancelDigAction(action.direction);
  //   await this.revealFossilsInCells(newlyDug);
  //   this.updateSurfaceOpenings(newlyDug);
  //   this.syncSurfaceColumnVisual(action.target.col);
  // }

  // private matchesDigDirection(
  //   input: Phaser.Math.Vector2,
  //   direction: Phaser.Math.Vector2
  // ): boolean {
  //   return Math.sign(input.x) === Math.sign(direction.x) &&
  //     Math.sign(input.y) === Math.sign(direction.y);
  // }

  // private async handleFossilOverlap(
  //   pickup: FossilPickup
  // ): Promise<void> {
  //   if (
  //     this.transitionStarted ||
  //     this.pickupInteractionLocked ||
  //     pickup.isBusy() ||
  //     !pickup.isCollectible()
  //   ) {
  //     return;
  //   }

  //   const currentSite = this.getCurrentCvcSite();

  //   if (!currentSite) {
  //     return;
  //   }

  //   if (pickup.pickupId !== currentSite.targetPickupId) {
  //     this.pickupInteractionLocked = true;
  //     this.audioFeedbackSystem.playIncorrectFeedback();
  //     await pickup.playIncorrectPickupFeedback(this.isSingleSiteSequentialCvcMode());
  //     this.pickupInteractionLocked = false;
  //     return;
  //   }

  //   this.pickupInteractionLocked = true;
  //   const pickupX = pickup.x;
  //   const pickupY = pickup.y;
  //   pickup.collect();
  //   this.mode.state.markFossilCollected(pickup.pickupId);
  //   this.collectedCorrectFossils.push({
  //     pickupId: pickup.pickupId,
  //     label: pickup.label,
  //     textureKey: pickup.getTextureKey()
  //   });
  //   await this.collectedFossilTray?.addCollectedFossil(
  //     pickup.getTextureKey(),
  //     pickup.label,
  //     pickupX,
  //     pickupY
  //   );
  //   await this.audioFeedbackSystem.playCorrectFeedback();
  //   this.updateCvcProgress();

  //   if (this.isSingleSiteSequentialCvcMode()) {
  //     currentSite.targetPickupIds = currentSite.targetPickupIds.filter(
  //       (targetPickupId) => targetPickupId !== pickup.pickupId
  //     );

  //     if (currentSite.targetPickupIds.length > 0) {
  //       const nextTargetPickupId =
  //         Phaser.Utils.Array.GetRandom(currentSite.targetPickupIds) ??
  //         currentSite.targetPickupIds[0];
  //       const nextTargetPickup = currentSite.pickups.find(
  //         (sitePickup) => sitePickup.id === nextTargetPickupId
  //       );

  //       if (nextTargetPickup) {
  //         currentSite.targetPickupId = nextTargetPickup.id;
  //         currentSite.targetLabel = nextTargetPickup.label;
  //         await this.announceCurrentCvcTarget();
  //         this.pickupInteractionLocked = false;
  //         return;
  //       }
  //     }
  //   }

  //   const nextSite = this.cvcDigSites[this.collectedCorrectFossils.length];

  //   if (nextSite && this.cvcDigSites.length > 1) {
  //     this.currentCvcSiteIndex = nextSite.index;
  //     this.promptSystem.setPrompt({
  //       kind: "collect_all",
  //       displayText: "Great job! Head right to the next dig site."
  //     });
  //     this.hud.setRepeatButtonEnabled(false);
  //     this.showNextSiteGuidance(nextSite);
  //     await this.audioFeedbackSystem.speakPhrase(
  //       "Good job. Let's move onto the next dig site. Head to the right.",
  //       { rate: 0.86, pitch: 1.06 }
  //     );
  //   } else {
  //     this.mode.state.markGemAvailable();
  //     if (this.revealGemIfReady()) {
  //       this.audioFeedbackSystem.playFossilDiscovered();
  //     }
  //     this.updateCvcProgress();
  //     this.hud.setRepeatButtonEnabled(false);
  //     this.hud.setRepeatButtonVisible(false);
  //     this.promptSystem.showGemPrompt();
  //     await this.audioFeedbackSystem.playVoiceClip(ASSET_KEYS.FIND_CRYSTAL, {
  //       volume: 0.9
  //     });
  //   }

  //   this.pickupInteractionLocked = false;
  // }

  private async announceInstructions(): Promise<void> {
    this.promptSystem.setPrompt({
      kind: "find_specific",
      displayText: "Look at the vowel. If it is a closed vowel sound, click the closed barn doors. If it is open vowel sound, click the open barn doors.",
      targetType: LearningType.VOWEL,
      targetValue: currentWord,
      spokenText: `Look at the vowel. If it is a closed vowel sound, click the closed barn doors. If it is open vowel sound, click the open barn doors.`
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
    await this.announceInstructions();
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
