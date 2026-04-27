import Phaser from "phaser";

import { getDinoById } from "../data/dinos";
import { DinoSkeleton } from "../entities/DinoSkeleton";
import { Obstacle } from "../entities/Obstacle";
import { Player } from "../entities/Player";
import type { FossilDigVariant } from "../modes/fossil-dig/FossilDigConfig";
import {
  createRandomFossilDigStageTheme,
  type FossilDigStageTheme
} from "../modes/fossil-dig/FossilDigStageTheme";
import { ChaseSystem } from "../systems/ChaseSystem";
import { CollisionSystem } from "../systems/CollisionSystem";
import { LearningPromptSystem } from "../systems/LearningPromptSystem";
import { Hud } from "../ui/Hud";
import {
  CHASE_FINISH_X,
  CHASE_WORLD_WIDTH,
  GAME_HEIGHT
} from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";

interface DinoChaseSceneData {
  variant?: FossilDigVariant;
  stageTheme?: FossilDigStageTheme;
}

export class DinoChaseScene extends Phaser.Scene {
  private variant: FossilDigVariant = "cvc";
  private stageTheme: FossilDigStageTheme = createRandomFossilDigStageTheme();
  private player!: Player;
  private dino!: DinoSkeleton;
  private chaseSystem!: ChaseSystem;

  constructor() {
    super(SCENE_KEYS.DINO_CHASE);
  }

  init(data: DinoChaseSceneData): void {
    this.variant = data.variant ?? "cvc";
    this.stageTheme = data.stageTheme ?? createRandomFossilDigStageTheme();
  }

  create(): void {
    const selectedDino = getDinoById(this.stageTheme.dinoId);

    this.cameras.main.setBackgroundColor(0xcde8ff);
    this.physics.world.setBounds(0, 0, CHASE_WORLD_WIDTH, GAME_HEIGHT);

    this.add.rectangle(CHASE_WORLD_WIDTH / 2, GAME_HEIGHT / 2, CHASE_WORLD_WIDTH, GAME_HEIGHT, 0xcde8ff);
    this.add.rectangle(CHASE_WORLD_WIDTH / 2, GAME_HEIGHT - 84, CHASE_WORLD_WIDTH, 168, 0xb77d3f);

    for (let index = 0; index < 10; index += 1) {
      this.add.circle(180 + index * 220, 140 + (index % 2) * 30, 46, 0xffffff, 0.7);
      this.add.ellipse(120 + index * 260, GAME_HEIGHT - 130, 220, 90, 0x8abf72, 0.8);
    }

    const ground = this.add.rectangle(
      CHASE_WORLD_WIDTH / 2,
      GAME_HEIGHT - 40,
      CHASE_WORLD_WIDTH,
      80,
      0x6f4c2f
    );
    this.physics.add.existing(ground, true);

    const cursors = this.input.keyboard!.createCursorKeys();
    const wasd = this.input.keyboard!.addKeys("W,A,S,D,SPACE") as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
      SPACE: Phaser.Input.Keyboard.Key;
    };

    this.player = new Player(this, 120, GAME_HEIGHT - 130);
    this.player.configureForChaseScene({
      left: this.cursorsOr(cursors.left, wasd.A),
      right: this.cursorsOr(cursors.right, wasd.D),
      up: this.cursorsOr(cursors.up, wasd.W),
      down: this.cursorsOr(cursors.down, wasd.S),
      jump: wasd.SPACE
    });

    CollisionSystem.addCollider(
      this,
      this.player,
      ground as Phaser.Types.Physics.Arcade.GameObjectWithBody
    );

    const obstacles = [680, 990, 1320, 1660, 1980].map(
      (x) => new Obstacle(this, x, GAME_HEIGHT - 84)
    );

    obstacles.forEach((obstacle) => {
      CollisionSystem.addCollider(this, this.player, obstacle);
    });

    this.dino = new DinoSkeleton(
      this,
      30,
      GAME_HEIGHT - 122,
      selectedDino
    );
    this.dino.setDisplaySize(180, 108);

    this.add
      .rectangle(CHASE_FINISH_X, GAME_HEIGHT - 180, 16, 180, 0xfff1a8)
      .setStrokeStyle(4, 0x5e4127);
    this.add
      .text(CHASE_FINISH_X, GAME_HEIGHT - 284, "Finish", {
        fontFamily: "Trebuchet MS",
        fontSize: "24px",
        color: "#2d1f14",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, CHASE_WORLD_WIDTH, GAME_HEIGHT);

    const hud = new Hud(this, `${selectedDino.name} Chase`);
    const promptSystem = new LearningPromptSystem(
      hud,
      {
        kind: "collect_all",
        displayText: `The ${selectedDino.name} is roaring...`
      },
      "free_collect"
    );
    promptSystem.showChasePrompt();
    hud.updateProgress({
      collected: 0,
      total: 0,
      gemAvailable: true,
      gemCollected: true
    });

    this.chaseSystem = new ChaseSystem(
      this.player,
      this.dino,
      {
        finishX: CHASE_FINISH_X,
        dinoSpeed: 192,
        catchDistance: 55
      },
      {
        onCaught: () => {
          this.scene.restart({
            variant: this.variant,
            stageTheme: this.stageTheme
          });
        },
        onWin: () => {
          this.scene.start(SCENE_KEYS.WIN);
        }
      }
    );

    void this.chaseSystem.beginIntro();
  }

  update(): void {
    this.player.updateChaseMovement();
    this.chaseSystem.update();
  }

  private cursorsOr(
    cursorKey: Phaser.Input.Keyboard.Key | undefined,
    fallback: Phaser.Input.Keyboard.Key
  ): Phaser.Input.Keyboard.Key {
    return cursorKey ?? fallback;
  }
}
