# Game Architecture Guide

This file explains where to put new game code and how to extend the current scaffold cleanly.

## Core Structure

- `config/`: Phaser game configuration and scene registration
- `scenes/`: screen flow and scene composition
- `modes/`: mode-specific config, state, content, and future map data
- `entities/`: player, pickups, enemies, obstacles, reusable world actors
- `systems/`: small gameplay services used by scenes
- `data/`: catalogs, learning content, tileset frame data, randomization pools
- `ui/`: HUD and prompt displays
- `utils/`: stable keys, constants, scene ids

## Where New Code Should Go

### Add a New Scene

Put it in `src/game/scenes/` when it is a new screen or a distinct gameplay phase.

Examples:

- title screen
- main menu
- dig gameplay
- chase gameplay
- win / lose screens

Scenes should:

- create the camera and layout
- compose entities and systems
- transition to other scenes
- avoid owning all business logic inline

### Add a New Entity

Put it in `src/game/entities/` when it is a visible object with behavior or physics.

Examples:

- player avatar
- collectible
- boss dino
- obstacle
- NPC

Entities should:

- own their sprite setup
- own local animation choices
- expose small methods such as `collect()`, `roar()`, `startChasing()`
- avoid knowing scene flow

### Add a New System

Put it in `src/game/systems/` when the logic coordinates multiple entities or manages a gameplay rule.

Examples:

- digging
- pickup tracking
- learning prompts
- chase rules
- collision setup

Systems should:

- stay small and focused
- receive dependencies instead of reaching into globals
- avoid turning into giant manager classes

### Add New Data

Put it in `src/game/data/` when it is reusable catalog/config content rather than scene code.

Examples:

- dino definitions
- jewel definitions
- word lists
- letter lists
- tileset frame groups

Good pattern:

- scene asks mode for content
- mode uses data files
- systems consume already-selected content

## Adding New Game Modes

A new mode should usually get its own folder under `src/game/modes/<mode-name>/`.

Recommended files:

- `<ModeName>Config.ts`
- `<ModeName>Content.ts`
- `<ModeName>State.ts`
- `<ModeName>Maps.ts` if stage layouts become authored
- optional `<ModeName>Theme.ts` if the mode has randomized theme selection

Then:

1. Add one or more scenes for the mode.
2. Register those scenes in `gameConfig.ts`.
3. Add an entry point from the main menu or another hub.
4. Reuse shared systems only if they genuinely fit the mechanic.

If a future mode is very different, do not force it through the Fossil Dig abstractions.

## Adding New Maps

The current prototype is ready for maps, but does not yet have a full map format.

Recommended path:

1. Create `src/game/modes/<mode-name>/<ModeName>Maps.ts`.
2. Define a stage type, for example:

```ts
export interface FossilDigMap {
  id: string;
  fossilSpawnCells: Array<[number, number]>;
  gemSpawnCell: [number, number];
  surfaceFramePattern?: number[];
  obstaclePositions?: number[];
}
```

3. Move hardcoded positions out of the scene.
4. Pass the selected map through scene data during restarts or transitions.
5. If using external map files later, keep the runtime stage type stable and just change how the data is loaded.

## Adding New Tilesets

Tilesets currently load in `PreloadScene` and frame groupings live in `data/terrainTiles.ts`.

To add or swap a tileset:

1. Save the tileset image in `src/game/assets/tilesets/`.
2. Add an asset key in `utils/assetKeys.ts`.
3. Load the tileset in `PreloadScene`.
4. Add a data file or update an existing one with named frame groups.
5. Update the rendering system or scene that consumes those frame groups.

If the game gains multiple biome themes, add a catalog file like:

```ts
export interface TerrainTheme {
  id: string;
  textureKey: string;
  dirtFrames: number[];
  grassFrames: number[];
  rockFrames: number[];
}
```

Then let stage config choose the theme.

## Adding Animated Characters

There are two main patterns already in use:

- player animations loaded directly from a character spritesheet
- dino animations generated from a catalog entry

For future animated characters:

1. Put the art under `assets/spritesheets/`.
2. Decide whether the character is:
   - a one-off scene actor
   - a reusable entity class
   - a catalog-driven family of actors like the dinos
3. Load the spritesheet in `PreloadScene`.
4. Register animations once in `createAnimations()`.
5. Keep animation names deterministic and scoped, for example `npc-guide-wave` or `dino-pterodactyl-roar`.

If multiple characters share the same behavior but different art, prefer a catalog-driven definition over subclassing.

## Adding New Learning Content

For phonics and similar educational content:

1. Put raw content in `src/game/data/`.
2. Build mode-ready content in `modes/<mode-name>/<ModeName>Content.ts`.
3. Keep prompt display generic in `LearningPromptSystem`.
4. Add validation rules only where the mode actually needs them.

This keeps content growth separate from low-level scene wiring.

## Random Theme Selection

Fossil Dig currently chooses:

- a random boss dino
- a random jewel reward

The pattern lives in:

- [src/game/data/dinos.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/data/dinos.ts)
- [src/game/data/jewels.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/data/jewels.ts)
- [src/game/modes/fossil-dig/FossilDigStageTheme.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/modes/fossil-dig/FossilDigStageTheme.ts)

If future modes have similar random theme setup, create separate `<ModeName>Theme.ts` files rather than folding all randomization into one shared global registry.

## Asset Naming and Folders

The current naming pattern is:

`[descriptor1]-[optional descriptor2]-[optional descriptor3].[resourceType].png`

Current folders:

- `assets/backgrounds/`
- `assets/tilesets/`
- `assets/spritesheets/characters/`
- `assets/spritesheets/dinosaurs/`
- `assets/sprites/fossils/`
- `assets/sprites/jewels/`

When adding new asset families, keep the folder split by resource type first, then by content family if needed.

## Build Discipline

After any structural change:

1. Run `npm run build`
2. Boot the game with `npm run dev`
3. Click through the scene flow manually
4. Verify scene transitions still carry the expected stage or mode data

That last check matters because scene-data bugs often survive type checking.
