import Phaser from "phaser";

import { cvcWords } from "../data/cvcWords";
import { dinoCatalog, getDinoAnimationKeys } from "../data/dinos";
import {
  ASSET_KEYS,
  FOSSIL_ASSET_KEYS,
  JEWEL_ASSET_KEYS,
  YARN_ASSET_KEYS
} from "../utils/assetKeys";
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from "../utils/constants";
import { SCENE_KEYS } from "../utils/sceneKeys";

export class PreloadScene extends Phaser.Scene {
  private static readonly PLAYER_FRAME_SIZE = 280;
  private static readonly PLAYER_FRAMES_PER_ROW = 6;
  private static readonly KITTEN_FRAME_WIDTH = 192;
  private static readonly KITTEN_FRAME_HEIGHT = 160;
  private static readonly KITTEN_FRAME_COUNT = 13;

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
    this.createAdditionShipTextures();
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
    this.load.image(
      ASSET_KEYS.STARSHIP_SHEET,
      new URL("../assets/starships.PNG", import.meta.url).toString()
    );
    this.load.spritesheet(
      ASSET_KEYS.ENEMY_STARSHIP_SHEET,
      new URL("../assets/enemy-starships.png", import.meta.url).toString(),
      { frameWidth: 63, frameHeight: 80 }
    );
    this.load.image(
      ASSET_KEYS.BEAM_SHEET,
      new URL("../assets/beams.png", import.meta.url).toString()
    );
    this.load.spritesheet(
      ASSET_KEYS.KITTEN_CATCHER,
      new URL(
        "../assets/spritesheets/characters/cat-walking.spritesheet.png",
        import.meta.url
      ).toString(),
      {
        frameWidth: PreloadScene.KITTEN_FRAME_WIDTH,
        frameHeight: PreloadScene.KITTEN_FRAME_HEIGHT,
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
    this.load.image(
      ASSET_KEYS.LEARNING_ACADEMY_BACKGROUND,
      new URL("../assets/backgrounds/learning-academy-background.png", import.meta.url)
        .toString()
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
      ASSET_KEYS.FIND_CRYSTAL,
      new URL("../assets/voice/find-crystal.wav", import.meta.url).toString()
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
    this.load.audio(
      ASSET_KEYS.KITTEN_CATCH_INSTRUCTIONS,
      new URL(
        "../assets/voice/kitten-catch/kitten-catch-instructions.mp3",
        import.meta.url
      ).toString()
    );
    this.load.audio(
      ASSET_KEYS.BARN_DOOR_VOWELS_INSTRUCTIONS,
      new URL(
        "../assets/voice/barn-door-vowels/instructions.mp3",
        import.meta.url,
      ).toString()
    );
    this.load.audio(
      ASSET_KEYS.BARN_DOOR_VOWELS_EXCELLENT,
      new URL("../assets/voice/barn-door-vowels/excellent.mp3", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.BARN_DOOR_VOWELS_IMPRESSIVE,
      new URL("../assets/voice/barn-door-vowels/impressive.mp3", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.BARN_DOOR_VOWELS_WAY_TO_GO_GIRL,
      new URL("../assets/voice/barn-door-vowels/way-to-go-girl.mp3", import.meta.url).toString()
    );
    this.load.audio(
      ASSET_KEYS.BARN_DOOR_VOWELS_TRY_AGAIN,
      new URL(
        "../assets/voice/barn-door-vowels/whoops-try-again.mp3",
        import.meta.url
      ).toString()
    );
    this.load.audio(
      ASSET_KEYS.BARN_DOOR_VOWELS_PRONOUNCE_WORD,
      new URL("../assets/pronounce-the-word.mp3", import.meta.url).toString()
    );
    this.load.image(
      ASSET_KEYS.BARN_DOOR_VOWELS_TITLE_SCREEN,
      new URL(
        "../assets/barn-door-vowels/barn-door-vowels-title-screen.png",
        import.meta.url
      ).toString()
    );
    this.load.audio(
      ASSET_KEYS.KITTEN_CATCH_VOWELS,
      new URL(
        "../assets/voice/kitten-catch/kitten-catch-vowels.mp3",
        import.meta.url
      ).toString()
    );
    this.load.audio(
      ASSET_KEYS.KITTEN_CATCH_CONSONANTS,
      new URL(
        "../assets/voice/kitten-catch/kitten-catch-consonants.mp3",
        import.meta.url
      ).toString()
    );
    this.load.audio(
      ASSET_KEYS.KITTEN_CATCH_WAY_TO_GO,
      new URL(
        "../assets/voice/kitten-catch/kitten-catch-way-to-go.mp3",
        import.meta.url
      ).toString()
    );
    this.load.audio(
      ASSET_KEYS.KITTEN_CATCH_IMPRESSIVE,
      new URL(
        "../assets/voice/kitten-catch/kitten-catch-impressive-most-impressive.mp3",
        import.meta.url
      ).toString()
    );
    this.load.image(
      ASSET_KEYS.LEVEL_BACKGROUND,
      new URL("../assets/backgrounds/fossil-dig-level-background.png", import.meta.url)
        .toString()
    );
    this.load.spritesheet(
      ASSET_KEYS.BARN_DOOR_TERRAIN,
      new URL("../assets/barn-door-vowels/terrain-v7.png", import.meta.url).toString(),
      { frameWidth: 128, frameHeight: 128 }
    );
    this.load.tilemapTiledJSON(
      ASSET_KEYS.BARN_DOOR_FARM_MAP,
      new URL("../assets/barn-door-vowels/farm.json", import.meta.url).toString()
    );
    const farmMapTilesets = [
      [ASSET_KEYS.BARN_DOOR_MAP_TERRAIN_ATLAS_A, new URL("../assets/barn-door-vowels/terrain-map-v7-a.png", import.meta.url).toString()],
      [ASSET_KEYS.BARN_DOOR_MAP_TERRAIN_ATLAS_B, new URL("../assets/barn-door-vowels/terrain-map-v7-b.png", import.meta.url).toString()],
      [ASSET_KEYS.BARN_DOOR_MAP_TERRAIN, new URL("../assets/barn-door-vowels/terrain-v7.png", import.meta.url).toString()],
      [ASSET_KEYS.BARN_DOOR_MAP_FENCE, new URL("../assets/barn-door-vowels/fence_medieval.png", import.meta.url).toString()],
      [ASSET_KEYS.BARN_DOOR_MAP_BARN, new URL("../assets/barn-door-vowels/barn-sheet.png", import.meta.url).toString()],
      [ASSET_KEYS.BARN_DOOR_MAP_BLADE, new URL("../assets/barn-door-vowels/blade.png", import.meta.url).toString()],
      [ASSET_KEYS.BARN_DOOR_MAP_DECORATIONS, new URL("../assets/barn-door-vowels/decorations-medieval.png", import.meta.url).toString()]
    ] as const;
    farmMapTilesets.forEach(([key, url]) => {
      this.load.image(key, url);
    });
    this.load.spritesheet(
      ASSET_KEYS.BARN_DOOR_BARN,
      new URL("../assets/barn-door-vowels/barn-sheet.png", import.meta.url).toString(),
      { frameWidth: 151, frameHeight: 117 }
    );
    this.load.spritesheet(
      ASSET_KEYS.BARN_DOOR_FENCE,
      new URL("../assets/barn-door-vowels/fence_medieval.png", import.meta.url).toString(),
      { frameWidth: 128, frameHeight: 128 }
    );
    this.load.spritesheet(
      ASSET_KEYS.BARN_DOOR_WINDMILL_BLADE,
      new URL("../assets/barn-door-vowels/blade.png", import.meta.url).toString(),
      { frameWidth: 128, frameHeight: 128 }
    );
    this.load.spritesheet(
      ASSET_KEYS.BARN_DOOR_WINDMILL_WHEEL,
      new URL("../assets/barn-door-vowels/water-wheel.png", import.meta.url).toString(),
      { frameWidth: 64, frameHeight: 64 }
    );
    const farmAnimals = [
      [ASSET_KEYS.BARN_DOOR_COW, new URL("../assets/barn-door-vowels/cow_walk.png", import.meta.url).toString(), 128],
      [ASSET_KEYS.BARN_DOOR_PIG, new URL("../assets/barn-door-vowels/pig_walk.png", import.meta.url).toString(), 128],
      [ASSET_KEYS.BARN_DOOR_SHEEP, new URL("../assets/barn-door-vowels/sheep_walk.png", import.meta.url).toString(), 128],
      [ASSET_KEYS.BARN_DOOR_LLAMA, new URL("../assets/barn-door-vowels/llama_walk.png", import.meta.url).toString(), 128],
      [ASSET_KEYS.BARN_DOOR_CHICKEN, new URL("../assets/barn-door-vowels/chicken_walk.png", import.meta.url).toString(), 32]
    ] as const;
    farmAnimals.forEach(([key, url, frameSize]) => {
      this.load.spritesheet(
        key,
        url,
        { frameWidth: frameSize, frameHeight: frameSize }
      );
    });
    this.load.image(
      ASSET_KEYS.KITTEN_CATCH_BACKGROUND,
      new URL("../assets/backgrounds/kitten-catch-background.png", import.meta.url)
        .toString()
    );
    this.load.image(
      ASSET_KEYS.KITTEN_CATCH_TITLE_SCREEN,
      new URL("../assets/backgrounds/kitten-catch-title-screen.png", import.meta.url)
        .toString()
    );
    this.load.image(
      ASSET_KEYS.KITTEN_CATCH_BUTTON_START,
      new URL(
        "../assets/sprites/ui/kitten-catch/kitten-catch-start-game.png",
        import.meta.url
      ).toString()
    );
    this.load.image(
      ASSET_KEYS.KITTEN_CATCH_BUTTON_SETTINGS,
      new URL(
        "../assets/sprites/ui/kitten-catch/kitten-catch-settings.png",
        import.meta.url
      ).toString()
    );
    this.load.image(
      ASSET_KEYS.KITTEN_CATCH_BUTTON_BACK,
      new URL(
        "../assets/sprites/ui/kitten-catch/kitten-catch-back.png",
        import.meta.url
      ).toString()
    );
    this.load.image(
      ASSET_KEYS.KITTEN_CATCH_BASKET,
      new URL("../assets/sprites/props/kitten-catch-basket.png", import.meta.url)
        .toString()
    );
    this.load.image(
      YARN_ASSET_KEYS.BLUE,
      new URL("../assets/sprites/props/yarn/blue-yarn.png", import.meta.url).toString()
    );
    this.load.image(
      YARN_ASSET_KEYS.ORANGE,
      new URL("../assets/sprites/props/yarn/orange-yarn.png", import.meta.url).toString()
    );
    this.load.image(
      YARN_ASSET_KEYS.PURPLE,
      new URL("../assets/sprites/props/yarn/purple-yarn.png", import.meta.url).toString()
    );
    this.load.image(
      YARN_ASSET_KEYS.RED,
      new URL("../assets/sprites/props/yarn/red-yarn.png", import.meta.url).toString()
    );
    this.load.image(
      YARN_ASSET_KEYS.TEAL,
      new URL("../assets/sprites/props/yarn/teal-yarn.png", import.meta.url).toString()
    );
    cvcWords.forEach((word) => {
      this.load.audio(word.voiceAssetKey, word.encodedAudio);
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

  /** Prepares cropped, transparent gameplay sprites from the supplied art sheets. */
  private createAdditionShipTextures(): void {
    const source = this.textures.get(ASSET_KEYS.STARSHIP_SHEET).getSourceImage() as HTMLImageElement;
    const beamSource = this.textures.get(ASSET_KEYS.BEAM_SHEET).getSourceImage() as HTMLImageElement;
    const createTexture = (key: string, image: HTMLImageElement, sourceX: number, sourceY: number, width: number, height: number, preserveWhiteGlow = false): void => {
      if (this.textures.exists(key)) return;
      const texture = this.textures.createCanvas(key, width, height);
      if (!texture) return;
      const context = texture.context;
      context.drawImage(image, sourceX, sourceY, width, height, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height);
      if (preserveWhiteGlow) {
        const visited = new Uint8Array(width * height);
        const pending: number[] = [];
        const isWhite = (position: number): boolean => pixels.data[position * 4] > 245 && pixels.data[position * 4 + 1] > 245 && pixels.data[position * 4 + 2] > 245;
        const visit = (x: number, y: number): void => {
          const position = y * width + x;
          if (visited[position] || !isWhite(position)) return;
          visited[position] = 1; pending.push(position);
        };
        for (let x = 0; x < width; x += 1) { visit(x, 0); visit(x, height - 1); }
        for (let y = 1; y < height - 1; y += 1) { visit(0, y); visit(width - 1, y); }
        while (pending.length) {
          const position = pending.pop()!;
          pixels.data[position * 4 + 3] = 0;
          const x = position % width; const y = Math.floor(position / width);
          if (x > 0) visit(x - 1, y); if (x < width - 1) visit(x + 1, y);
          if (y > 0) visit(x, y - 1); if (y < height - 1) visit(x, y + 1);
        }
      } else for (let index = 0; index < pixels.data.length; index += 4) {
        if (pixels.data[index] > 235 && pixels.data[index + 1] > 235 && pixels.data[index + 2] > 235) pixels.data[index + 3] = 0;
      }
      context.putImageData(pixels, 0, 0);
      texture.refresh();
    };

    createTexture(ASSET_KEYS.PLAYER_STARSHIP, source, 263, 0, 52, 58);
    createTexture(ASSET_KEYS.PLAYER_LASER, beamSource, 128, 306, 58, 100, true);
    createTexture(ASSET_KEYS.ENEMY_LASER, beamSource, 201, 306, 64, 100, true);
    createTexture(ASSET_KEYS.ENEMY_BOMB, beamSource, 112, 237, 48, 55, true);
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

    if (!this.anims.exists("kitten-catcher-walk")) {
      this.anims.create({
        key: "kitten-catcher-walk",
        frames: this.anims.generateFrameNumbers(ASSET_KEYS.KITTEN_CATCHER, {
          start: 0,
          end: PreloadScene.KITTEN_FRAME_COUNT - 1
        }),
        frameRate: 12,
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

    this.createLetterAppleTexture(
      graphics,
      ASSET_KEYS.LETTER_APPLE_VOWEL,
      0xf07c57,
      0xffc6b0
    );
    this.createLetterAppleTexture(
      graphics,
      ASSET_KEYS.LETTER_APPLE_CONSONANT,
      0x4bb06c,
      0xa9efba
    );

    graphics.destroy();
  }

  private applyTextureFilters(): void {
    const nearestKeys = [
      ASSET_KEYS.TERRAIN,
      ASSET_KEYS.TUNNEL_DIRT,
      ASSET_KEYS.LADDER_TOP,
      ASSET_KEYS.LADDER_MIDDLE,
      ASSET_KEYS.LADDER_BOTTOM,
      ASSET_KEYS.BARN_DOOR_TERRAIN,
      ASSET_KEYS.BARN_DOOR_MAP_TERRAIN_ATLAS_A,
      ASSET_KEYS.BARN_DOOR_MAP_TERRAIN_ATLAS_B,
      ASSET_KEYS.BARN_DOOR_MAP_TERRAIN,
      ASSET_KEYS.BARN_DOOR_MAP_FENCE,
      ASSET_KEYS.BARN_DOOR_MAP_BARN,
      ASSET_KEYS.BARN_DOOR_MAP_BLADE,
      ASSET_KEYS.BARN_DOOR_MAP_DECORATIONS,
      ASSET_KEYS.BARN_DOOR_VOWELS_TITLE_SCREEN
    ];
    const linearKeys = [
      ASSET_KEYS.PLAYER,
      ASSET_KEYS.PLAYER_DIGGING,
      ASSET_KEYS.LEARNING_ACADEMY_BACKGROUND,
      ASSET_KEYS.TITLE_SCREEN,
      ASSET_KEYS.LEVEL_BACKGROUND,
      ASSET_KEYS.KITTEN_CATCH_BACKGROUND,
      ASSET_KEYS.KITTEN_CATCH_TITLE_SCREEN,
      ASSET_KEYS.KITTEN_CATCH_BUTTON_START,
      ASSET_KEYS.KITTEN_CATCH_BUTTON_SETTINGS,
      ASSET_KEYS.KITTEN_CATCH_BUTTON_BACK,
      ASSET_KEYS.KITTEN_CATCH_BASKET,
      ASSET_KEYS.TITLE_BUTTON_START_ACTIVE,
      ASSET_KEYS.TITLE_BUTTON_START_INACTIVE,
      ASSET_KEYS.TITLE_BUTTON_SETTINGS_ACTIVE,
      ASSET_KEYS.TITLE_BUTTON_SETTINGS_INACTIVE,
      ASSET_KEYS.TITLE_BUTTON_EXIT_ACTIVE,
      ASSET_KEYS.TITLE_BUTTON_EXIT_INACTIVE,
      ASSET_KEYS.KITTEN_CATCHER,
      ASSET_KEYS.LETTER_APPLE_VOWEL,
      ASSET_KEYS.LETTER_APPLE_CONSONANT
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
    Object.values(YARN_ASSET_KEYS).forEach((key) => {
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

  private createLetterAppleTexture(
    graphics: Phaser.GameObjects.Graphics,
    key: string,
    fillColor: number,
    highlightColor: number
  ): void {
    graphics.clear();
    graphics.fillStyle(fillColor);
    graphics.fillCircle(28, 32, 24);
    graphics.fillCircle(42, 32, 20);
    graphics.fillStyle(highlightColor);
    graphics.fillCircle(26, 25, 9);
    graphics.fillStyle(0x704628);
    graphics.fillRect(32, 6, 4, 14);
    graphics.fillStyle(0x65b95a);
    graphics.fillEllipse(46, 13, 18, 10);
    graphics.lineStyle(3, 0x8e4c31);
    graphics.strokeCircle(28, 32, 24);
    graphics.strokeCircle(42, 32, 20);
    graphics.generateTexture(key, 68, 68);
  }
}
