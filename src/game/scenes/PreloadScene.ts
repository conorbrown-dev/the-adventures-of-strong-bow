import Phaser from "phaser";

import { cvcWords } from "../data/cvcWords";
import { dinoCatalog, getDinoAnimationKeys } from "../data/dinos";
import { ASSET_KEYS, FOSSIL_ASSET_KEYS, JEWEL_ASSET_KEYS } from "../utils/assetKeys";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";

export class PreloadScene extends Phaser.Scene {
  private static readonly PLAYER_FRAME_SIZE = 280;
  private static readonly PLAYER_FRAMES_PER_ROW = 6;

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
        frameWidth: PreloadScene.PLAYER_FRAME_SIZE,
        frameHeight: PreloadScene.PLAYER_FRAME_SIZE,
        margin: 0,
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
        frameWidth: PreloadScene.PLAYER_FRAME_SIZE,
        frameHeight: PreloadScene.PLAYER_FRAME_SIZE,
        margin: 0,
        spacing: 0
      }
    );
    this.load.audio(
      ASSET_KEYS.SHOVEL_CLINK,
      new URL("../assets/sfx/sfx-shovel-clink.wav", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.DIGGING,
      new URL("../assets/sfx/sfx-digging.wav", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.FOSSIL_DISCOVERED,
      new URL("../assets/sfx/fossil-discovered.wav", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.BUTTON_CLICK,
      new URL("../assets/sfx/sfx-button-click.wav", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.BUTTON_HOVER,
      new URL("../assets/sfx/sfx-button-hover.wav", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.DIG_BGM,
      new URL("../assets/bgm/dig-bgm.wav", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.FOSSIL_DIG_INTRO,
      new URL("../assets/voice/fossil-dig-intro.wav", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.FIND_THE_FOSSIL_FOR,
      new URL("../assets/voice/find-the-fossil-for.wav", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.CLIMB_TO_THE_SURFACE,
      new URL("../assets/voice/climb-to-the-surface.wav", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.IS_THIS_THE_CORRECT_FOSSIL,
      new URL("../assets/voice/is-this-the-correct-fossil.wav", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.WAY_TO_GO,
      new URL("../assets/voice/way-to-go.wav", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.SUPERB,
      new URL("../assets/voice/superb.wav", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.GREAT_JOB_MOLLY,
      new URL("../assets/voice/great-job-molly.wav", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.EXCELLENT,
      new URL("../assets/voice/excellent.wav", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.DINO_COMES_TO_LIFE,
      new URL("../assets/voice/dino-comes-to-life.wav", import.meta.url).toString()
    );
    this.load.image(
      ASSET_KEYS.LEVEL_BACKGROUND,
      new URL("../assets/backgrounds/fossil-dig-level-background.png", import.meta.url)
        .toString()
    );
    cvcWords.forEach((word) => {
      this.load.audio(
        word.voiceAssetKey,
        new URL(`../assets/voice/cvc/cvc-${word.word}.wav`, import.meta.url).toString()
      );
    });

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
    if (!this.anims.exists("player-idle-right")) {
      this.anims.create({
        key: "player-idle-right",
        frames: this.getPlayerRowFrames(0),
        frameRate: 5,
        repeat: -1
      });
    }

    if (!this.anims.exists("player-walk-right")) {
      this.anims.create({
        key: "player-walk-right",
        frames: this.getPlayerRowFrames(1),
        frameRate: 8,
        repeat: -1
      });
    }

    if (!this.anims.exists("player-idle-left")) {
      this.anims.create({
        key: "player-idle-left",
        frames: this.getPlayerRowFrames(2),
        frameRate: 5,
        repeat: -1
      });
    }

    if (!this.anims.exists("player-walk-left")) {
      this.anims.create({
        key: "player-walk-left",
        frames: this.getPlayerRowFrames(3),
        frameRate: 8,
        repeat: -1
      });
    }

    if (!this.anims.exists("player-climb-up")) {
      this.anims.create({
        key: "player-climb-up",
        frames: this.getPlayerRowFrames(4),
        frameRate: 8,
        repeat: -1
      });
    }

    if (!this.anims.exists("player-climb-down")) {
      this.anims.create({
        key: "player-climb-down",
        frames: this.getPlayerRowFrames(5),
        frameRate: 8,
        repeat: -1
      });
    }

    if (!this.anims.exists("player-dig-right")) {
      this.anims.create({
        key: "player-dig-right",
        frames: this.getPlayerDigRowFrames(0),
        frameRate: 8,
        repeat: 0
      });
    }

    if (!this.anims.exists("player-dig-left")) {
      this.anims.create({
        key: "player-dig-left",
        frames: this.getPlayerDigRowFrames(1),
        frameRate: 8,
        repeat: 0
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
      ASSET_KEYS.TITLE_SCREEN,
      ASSET_KEYS.LEVEL_BACKGROUND,
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

  private getPlayerRowFrames(rowIndex: number): Phaser.Types.Animations.AnimationFrame[] {
    const start = rowIndex * PreloadScene.PLAYER_FRAMES_PER_ROW;
    const end = start + PreloadScene.PLAYER_FRAMES_PER_ROW - 1;

    return this.anims.generateFrameNumbers(ASSET_KEYS.PLAYER, {
      start,
      end
    });
  }

  private getPlayerDigRowFrames(rowIndex: number): Phaser.Types.Animations.AnimationFrame[] {
    const start = rowIndex * PreloadScene.PLAYER_FRAMES_PER_ROW;
    const end = start + PreloadScene.PLAYER_FRAMES_PER_ROW - 1;

    return this.anims.generateFrameNumbers(ASSET_KEYS.PLAYER_DIGGING, {
      start,
      end
    });
  }
}
