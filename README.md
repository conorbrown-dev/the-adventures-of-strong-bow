# MollyLearningGame

Browser-based learning game prototype for young children, built with Phaser 3, TypeScript, and Vite.

The current playable loop is:

`Title Screen -> Mode Select -> Fossil Dig -> Dino Chase -> Win`

## Tech Stack

- Phaser 3
- TypeScript
- Vite
- Arcade Physics
- Browser-only, no backend

## Getting Started

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Layout

```text
src/
  main.ts
  game/
    assets/
    config/
    data/
    entities/
    modes/
    scenes/
    systems/
    ui/
    utils/
```

Key files:

- [src/main.ts](/home/conor/repos/the-adventures-of-strongbow/src/main.ts): game bootstrap
- [src/game/config/gameConfig.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/config/gameConfig.ts): Phaser config and scene registration
- [src/game/scenes/PreloadScene.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/scenes/PreloadScene.ts): asset loading and animation registration
- [src/game/scenes/TitleScene.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/scenes/TitleScene.ts): first screen of the game
- [src/game/scenes/MainMenuScene.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/scenes/MainMenuScene.ts): current mode selection menu
- [src/game/README.md](/home/conor/repos/the-adventures-of-strongbow/src/game/README.md): architecture and content extension guide

## Current Game Flow

1. `BootScene` starts `PreloadScene`
2. `PreloadScene` loads assets, registers animations, starts `TitleScene`
3. `TitleScene` shows the title image and Start / Exit actions
4. `MainMenuScene` lets the player choose a Fossil Dig variant
5. `FossilDigScene` runs the digging and collection loop
6. `DinoChaseScene` runs the chase sequence
7. `WinScene` returns to the menu

## Development Rules of Thumb

- Keep scenes focused on flow, layout, camera, and scene-level composition.
- Put reusable logic in `systems/`.
- Put visual actors and input-aware objects in `entities/`.
- Put learning content and randomization data in `data/` or `modes/<mode-name>/`.
- Prefer adding new content through catalogs and config objects before adding new conditionals.
- Keep future mode-specific logic inside `modes/<mode-name>/` instead of spreading it globally.

## Common Development Tasks

### Add a New Game Mode

1. Create a new folder under `src/game/modes/`, for example `src/game/modes/space-run/`.
2. Add mode config, content, and state files similar to the Fossil Dig mode.
3. Add one or more scenes for that mode under `src/game/scenes/`.
4. Register the new scenes in [src/game/config/gameConfig.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/config/gameConfig.ts).
5. Add a new menu option in [src/game/scenes/MainMenuScene.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/scenes/MainMenuScene.ts).
6. Reuse existing UI, entities, and systems where that actually helps. Do not force every mode through Fossil Dig systems if the mechanics are different.

### Add a New Map or Stage Layout

The current Fossil Dig prototype uses hardcoded spawn cells and tile generation instead of a full map file.

To add richer maps:

1. Create a new data file under `src/game/modes/<mode-name>/`, for example `FossilDigMaps.ts`.
2. Move spawn positions, obstacle positions, terrain choices, and finish-line positions into map objects.
3. Update the scene to consume a selected map object instead of hardcoded coordinates.
4. If maps become large or hand-authored, add a `maps/` folder under `src/game/assets/` and introduce a loader in `PreloadScene`.
5. If you add map selection or random stage selection, keep the chosen map id in scene data so retries stay consistent.

### Add a New Tileset

1. Put the source image in `src/game/assets/tilesets/`.
2. Add or update an asset key in [src/game/utils/assetKeys.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/utils/assetKeys.ts).
3. Load it in [src/game/scenes/PreloadScene.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/scenes/PreloadScene.ts).
4. If frame-based, define frame size and margins there.
5. Add frame constants or helper data in `src/game/data/`, similar to [src/game/data/terrainTiles.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/data/terrainTiles.ts).
6. Update the scene or system that renders terrain to use the new frame indices.

### Add a New Title Screen or Background

1. Put the image in `src/game/assets/backgrounds/`.
2. Add or reuse an asset key in [src/game/utils/assetKeys.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/utils/assetKeys.ts).
3. Load it in [src/game/scenes/PreloadScene.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/scenes/PreloadScene.ts).
4. Use it in the target scene, such as [src/game/scenes/TitleScene.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/scenes/TitleScene.ts).

### Add a New Animated Character

1. Put the spritesheet in `src/game/assets/spritesheets/characters/` or `spritesheets/dinosaurs/`.
2. Add a stable asset key in [src/game/utils/assetKeys.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/utils/assetKeys.ts).
3. Load the sheet in [src/game/scenes/PreloadScene.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/scenes/PreloadScene.ts) with the correct frame dimensions.
4. Register animations in `PreloadScene.createAnimations()`.
5. If it is a reusable actor, create or update an entity class in `src/game/entities/`.
6. Keep animation keys centralized or deterministic so scenes do not hardcode ad hoc names.

### Add a New Boss Dino

1. Add the spritesheet file to `src/game/assets/spritesheets/dinosaurs/`.
2. Add a new asset key to [src/game/utils/assetKeys.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/utils/assetKeys.ts).
3. Extend the `DinoId` union and `dinoCatalog` in [src/game/data/dinos.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/data/dinos.ts).
4. Set correct frame size, idle frame, chase frames, and roar frames.
5. `PreloadScene` will load and animate it through the catalog pattern once the new entry exists.
6. The Fossil Dig stage theme RNG can then select it automatically.

### Add a New Jewel Reward

1. Add the image to `src/game/assets/sprites/jewels/`.
2. Add its asset key in [src/game/utils/assetKeys.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/utils/assetKeys.ts).
3. Extend the `JewelId` union and `jewelCatalog` in [src/game/data/jewels.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/data/jewels.ts).
4. Load it in [src/game/scenes/PreloadScene.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/scenes/PreloadScene.ts).
5. The Fossil Dig stage theme RNG can then select it automatically.

## Content and Learning Logic

Current learning data lives in:

- [src/game/data/cvcWords.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/data/cvcWords.ts)
- [src/game/data/letters.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/data/letters.ts)
- [src/game/data/learningTypes.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/data/learningTypes.ts)
- [src/game/modes/fossil-dig/FossilDigContent.ts](/home/conor/repos/the-adventures-of-strongbow/src/game/modes/fossil-dig/FossilDigContent.ts)

If you add stricter prompt validation later:

1. Keep the prompt definition in mode content.
2. Keep generic prompt display in `LearningPromptSystem`.
3. Add mode-specific validation rules without turning `LearningPromptSystem` into a giant switchboard for every future game.

## Testing Checklist

After changing gameplay or assets, verify:

1. The game boots to the title screen.
2. Start Game reaches the mode menu.
3. Both Fossil Dig variants start correctly.
4. The player can move and collect fossils.
5. A jewel appears after all fossils are collected.
6. The selected dino and jewel stay consistent across the dig stage and chase stage.
7. The chase scene restarts cleanly on failure.
8. The win scene returns to the menu.
9. `npm run build` still passes.

## Known Simplifications

- Digging terrain is still generated procedurally rather than from authored maps.
- Obstacle art is still placeholder-generated.
- Fossil assembly is still a simplified sequence rather than piece-by-piece animation.
- Browser tabs usually cannot be closed programmatically, so Exit Game falls back to an in-game message.

## Next Good Refactors

- Move Fossil Dig spawn positions into a map data file.
- Add a reusable animation registry helper if the animation list keeps growing.
- Add dedicated obstacle and UI assets.
- Add a generic stage definition type for map + boss + reward + learning content.
