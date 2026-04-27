import Phaser from "phaser";

import { dinoCatalog, getDinoAnimationKeys } from "../data/dinos";
import { ASSET_KEYS, FOSSIL_ASSET_KEYS, JEWEL_ASSET_KEYS } from "../utils/assetKeys";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  preload(): void {
    this.cameras.main.setBackgroundColor(COLORS.SKY);
    this.loadGameAssets();

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "Loading MollyLearningGame...", {
        fontFamily: "Trebuchet MS",
        fontSize: "34px",
        fontStyle: "bold",
        color: "#2d1f14"
      })
      .setOrigin(0.5);
  }

  create(): void {
    this.createDerivedPlayerTextures();
    this.applyTextureFilters();
    this.createPlaceholderTextures();
    this.createAnimations();
    this.scene.start(SCENE_KEYS.TITLE);
  }

  private loadGameAssets(): void {
    this.load.spritesheet(
      ASSET_KEYS.PLAYER,
      new URL("../assets/spritesheets/characters/player.spritesheet.png", import.meta.url)
        .toString(),
      {
        frameWidth: 280,
        frameHeight: 280,
        margin: 1,
        spacing: 0
      }
    );
    this.load.spritesheet(
      ASSET_KEYS.PLAYER_DIGGING,
      new URL(
        "../assets/spritesheets/characters/player-digging.spritesheet.png",
        import.meta.url
      ).toString(),
      {
        frameWidth: 280,
        frameHeight: 280,
        margin: 1,
        spacing: 0
      }
    );

    Object.values(dinoCatalog).forEach((dino) => {
      this.load.spritesheet(
        dino.textureKey,
        new URL(
          `../assets/spritesheets/dinosaurs/${dino.id}.spritesheet.png`,
          import.meta.url
        ).toString(),
        {
          frameWidth: dino.frameWidth,
          frameHeight: dino.frameHeight,
          margin: dino.frameMargin,
          spacing: dino.frameSpacing
        }
      );
    });

    this.load.image(
      FOSSIL_ASSET_KEYS.FEMUR,
      new URL("../assets/sprites/fossils/femur-fossil-pickup.sprite.png", import.meta.url)
        .toString()
    );
    this.load.image(
      FOSSIL_ASSET_KEYS.HORN,
      new URL("../assets/sprites/fossils/horn-fossil-pickup.sprite.png", import.meta.url)
        .toString()
    );
    this.load.image(
      FOSSIL_ASSET_KEYS.SKULL,
      new URL("../assets/sprites/fossils/skull-fossil-pickup.sprite.png", import.meta.url)
        .toString()
    );
    this.load.image(
      FOSSIL_ASSET_KEYS.SHELL,
      new URL("../assets/sprites/fossils/shell-fossil-pickup.sprite.png", import.meta.url)
        .toString()
    );

    this.load.image(
      JEWEL_ASSET_KEYS.GREEN,
      new URL("../assets/sprites/jewels/green-jewel.pickup.sprite.png", import.meta.url)
        .toString()
    );
    this.load.image(
      JEWEL_ASSET_KEYS.PURPLE,
      new URL("../assets/sprites/jewels/purple-jewel.pickup.sprite.png", import.meta.url)
        .toString()
    );
    this.load.image(
      JEWEL_ASSET_KEYS.RED,
      new URL("../assets/sprites/jewels/red-jewel.pickup.sprite.png", import.meta.url)
        .toString()
    );
    this.load.image(
      JEWEL_ASSET_KEYS.YELLOW,
      new URL("../assets/sprites/jewels/yellow-jewel.pickup.sprite.png", import.meta.url)
        .toString()
    );
    this.load.image(
      ASSET_KEYS.TUNNEL_DIRT,
      new URL("../assets/sprites/terrain/terrain-tunnel-dirt.sprite.png", import.meta.url)
        .toString()
    );
    this.load.image(
      ASSET_KEYS.LADDER_TOP,
      new URL("../assets/sprites/ladders/ladder-top.sprite.png", import.meta.url)
        .toString()
    );
    this.load.image(
      ASSET_KEYS.LADDER_MIDDLE,
      new URL("../assets/sprites/ladders/ladder-middle.sprite.png", import.meta.url)
        .toString()
    );
    this.load.image(
      ASSET_KEYS.LADDER_BOTTOM,
      new URL("../assets/sprites/ladders/ladder-bottom.sprite.png", import.meta.url)
        .toString()
    );

    this.load.spritesheet(
      ASSET_KEYS.TERRAIN,
      new URL("../assets/tilesets/terrain.tileset.png", import.meta.url).toString(),
      {
        frameWidth: 313,
        frameHeight: 313,
        margin: 1,
        spacing: 0
      }
    );
    this.load.spritesheet(
      ASSET_KEYS.INCORRECT_FOSSIL_CRUMBLE,
      new URL("../assets/incorrect-fossil-crumble.spritesheet.png", import.meta.url)
        .toString(),
      {
        frameWidth: 443,
        frameHeight: 443,
        margin: 1,
        spacing: 0
      }
    );

    this.load.image(
      ASSET_KEYS.TITLE_SCREEN,
      new URL("../assets/backgrounds/fossil-dig-titlescreen.background.png", import.meta.url)
        .toString()
    );
    this.load.image(
      ASSET_KEYS.TITLE_BUTTON_START_ACTIVE,
      new URL(
        "../assets/sprites/ui/title-buttons/bright-start-button.sprite.png",
        import.meta.url
      ).toString()
    );
    this.load.image(
      ASSET_KEYS.TITLE_BUTTON_START_INACTIVE,
      new URL(
        "../assets/sprites/ui/title-buttons/dark-start-button.sprite.png",
        import.meta.url
      ).toString()
    );
    this.load.image(
      ASSET_KEYS.TITLE_BUTTON_SETTINGS_ACTIVE,
      new URL(
        "../assets/sprites/ui/title-buttons/bright-settings-button.sprite.png",
        import.meta.url
      ).toString()
    );
    this.load.image(
      ASSET_KEYS.TITLE_BUTTON_SETTINGS_INACTIVE,
      new URL(
        "../assets/sprites/ui/title-buttons/dark-settings-button.sprite.png",
        import.meta.url
      ).toString()
    );
    this.load.image(
      ASSET_KEYS.TITLE_BUTTON_EXIT_ACTIVE,
      new URL(
        "../assets/sprites/ui/title-buttons/light-exit-button.sprite.png",
        import.meta.url
      ).toString()
    );
    this.load.image(
      ASSET_KEYS.TITLE_BUTTON_EXIT_INACTIVE,
      new URL(
        "../assets/sprites/ui/title-buttons/dark-exit-buttons.sprite.png",
        import.meta.url
      ).toString()
    );
  }

  private createAnimations(): void {
    if (!this.anims.exists("player-idle")) {
      this.anims.create({
        key: "player-idle",
        frames: [{ key: ASSET_KEYS.PLAYER, frame: 0 }],
        frameRate: 1,
        repeat: -1
      });
    }

    if (!this.anims.exists("player-dig-walk")) {
      this.anims.create({
        key: "player-dig-walk",
        frames: [
          { key: ASSET_KEYS.PLAYER, frame: 0 },
          { key: ASSET_KEYS.PLAYER, frame: 1 },
          { key: ASSET_KEYS.PLAYER_RUN_FRAME_2_FLIPPED },
          { key: ASSET_KEYS.PLAYER_RUN_FRAME_3_FLIPPED }
        ],
        frameRate: 5,
        repeat: -1
      });
    }

    if (!this.anims.exists("player-dig-action")) {
      this.anims.create({
        key: "player-dig-action",
        frames: this.anims.generateFrameNumbers(ASSET_KEYS.PLAYER_DIGGING, {
          frames: [4, 5, 6, 7]
        }),
        frameRate: 6,
        repeat: -1
      });
    }

    if (!this.anims.exists("player-chase-run")) {
      this.anims.create({
        key: "player-chase-run",
        frames: this.anims.generateFrameNumbers(ASSET_KEYS.PLAYER, {
          frames: [4, 5, 6, 7]
        }),
        frameRate: 8,
        repeat: -1
      });
    }

    if (!this.anims.exists("player-jump")) {
      this.anims.create({
        key: "player-jump",
        frames: this.anims.generateFrameNumbers(ASSET_KEYS.PLAYER, {
          frames: [12, 13, 14, 15]
        }),
        frameRate: 10,
        repeat: -1
      });
    }

    if (!this.anims.exists("incorrect-fossil-crumble")) {
      this.anims.create({
        key: "incorrect-fossil-crumble",
        frames: this.anims.generateFrameNumbers(
          ASSET_KEYS.INCORRECT_FOSSIL_CRUMBLE,
          {
            start: 0,
            end: 7
          }
        ),
        frameRate: 15,
        repeat: 0
      });
    }

    Object.values(dinoCatalog).forEach((dino) => {
      const animKeys = getDinoAnimationKeys(dino.id);

      if (!this.anims.exists(animKeys.chase)) {
        this.anims.create({
          key: animKeys.chase,
          frames: this.anims.generateFrameNumbers(dino.textureKey, {
            frames: dino.chaseFrames
          }),
          frameRate: 8,
          repeat: -1
        });
      }

      if (!this.anims.exists(animKeys.roar)) {
        this.anims.create({
          key: animKeys.roar,
          frames: this.anims.generateFrameNumbers(dino.textureKey, {
            frames: dino.roarFrames
          }),
          frameRate: 7,
          repeat: 0
        });
      }
    });
  }

  private createPlaceholderTextures(): void {
    const graphics = this.add.graphics();

    graphics.clear();
    graphics.fillStyle(0x8b5a2b);
    graphics.fillRoundedRect(6, 2, 6, 26, 3);
    graphics.fillStyle(0xc7ccd2);
    graphics.beginPath();
    graphics.moveTo(12, 2);
    graphics.lineTo(26, 8);
    graphics.lineTo(18, 18);
    graphics.lineTo(10, 10);
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture(ASSET_KEYS.SHOVEL, 28, 28);

    graphics.clear();
    graphics.fillStyle(COLORS.ROCK);
    graphics.fillRoundedRect(0, 10, 60, 38, 12);
    graphics.fillStyle(0x9ca3af);
    graphics.fillRoundedRect(8, 4, 30, 16, 8);
    graphics.generateTexture(ASSET_KEYS.OBSTACLE, 60, 50);

    graphics.clear();
    graphics.fillStyle(0xf6edd7);
    graphics.fillRoundedRect(0, 0, 280, 64, 18);
    graphics.lineStyle(4, 0x5e4127);
    graphics.strokeRoundedRect(2, 2, 276, 60, 18);
    graphics.generateTexture(ASSET_KEYS.BUTTON, 280, 64);

    graphics.destroy();
  }

  private createDerivedPlayerTextures(): void {
    this.createFlippedPlayerFrame(
      2,
      ASSET_KEYS.PLAYER_RUN_FRAME_2_FLIPPED
    );
    this.createFlippedPlayerFrame(
      3,
      ASSET_KEYS.PLAYER_RUN_FRAME_3_FLIPPED
    );
  }

  private createFlippedPlayerFrame(frameIndex: number, targetKey: string): void {
    if (this.textures.exists(targetKey)) {
      return;
    }

    const frame = this.textures.getFrame(ASSET_KEYS.PLAYER, frameIndex);
    const canvasTexture = this.textures.createCanvas(
      targetKey,
      frame.cutWidth,
      frame.cutHeight
    );
    if (!canvasTexture) {
      return;
    }

    const ctx = canvasTexture.context;

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(
      frame.source.image as CanvasImageSource,
      frame.cutX,
      frame.cutY,
      frame.cutWidth,
      frame.cutHeight,
      -frame.cutWidth,
      0,
      frame.cutWidth,
      frame.cutHeight
    );
    ctx.restore();
    canvasTexture.refresh();
  }

  private applyTextureFilters(): void {
    const nearestKeys = [
      ASSET_KEYS.TERRAIN,
      ASSET_KEYS.TUNNEL_DIRT,
      ASSET_KEYS.LADDER_TOP,
      ASSET_KEYS.LADDER_MIDDLE,
      ASSET_KEYS.LADDER_BOTTOM
    ];
    const linearKeys = [
      ASSET_KEYS.PLAYER,
      ASSET_KEYS.PLAYER_DIGGING,
      ASSET_KEYS.PLAYER_RUN_FRAME_2_FLIPPED,
      ASSET_KEYS.PLAYER_RUN_FRAME_3_FLIPPED,
      ASSET_KEYS.TITLE_SCREEN,
      ASSET_KEYS.TITLE_BUTTON_START_ACTIVE,
      ASSET_KEYS.TITLE_BUTTON_START_INACTIVE,
      ASSET_KEYS.TITLE_BUTTON_SETTINGS_ACTIVE,
      ASSET_KEYS.TITLE_BUTTON_SETTINGS_INACTIVE,
      ASSET_KEYS.TITLE_BUTTON_EXIT_ACTIVE,
      ASSET_KEYS.TITLE_BUTTON_EXIT_INACTIVE
    ];

    nearestKeys.forEach((key) => {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    });
    linearKeys.forEach((key) => {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });
    Object.values(FOSSIL_ASSET_KEYS).forEach((key) => {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });
    Object.values(JEWEL_ASSET_KEYS).forEach((key) => {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });
    Object.values(dinoCatalog).forEach((dino) => {
      this.textures.get(dino.textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });
  }
}
