Art is organized by resource type so loaders stay predictable:

- `backgrounds/` for title screens and scene backgrounds
- `sprites/ladders/` for ladder segments used in vertical tunnels
- `tilesets/` for tile grids used by terrain or map systems
- `sprites/terrain/` for terrain-adjacent single sprites such as tunnel overlays
- `spritesheets/` for multi-frame characters or animated creatures
- `sprites/` for single-image pickups and props

Current usage:

- `backgrounds/fossil-dig-titlescreen.background.png`
- `sprites/ladders/ladder-top.sprite.png`
- `sprites/ladders/ladder-middle.sprite.png`
- `sprites/ladders/ladder-bottom.sprite.png`
- `spritesheets/characters/player.spritesheet.png`
- `spritesheets/dinosaurs/trex.spritesheet.png`
- `spritesheets/dinosaurs/triceratops.spritesheet.png`
- `sprites/fossils/*.png`
- `sprites/jewels/*.png`
- `sprites/terrain/terrain-tunnel-dirt.sprite.png`
- `tilesets/terrain.tileset.png`

## How To Add Assets

### New Title or Background Art

1. Place the file in `src/game/assets/backgrounds/`.
2. Add an asset key in `src/game/utils/assetKeys.ts`.
3. Load it in `src/game/scenes/PreloadScene.ts`.
4. Use it in the target scene.

### New Character or Dino Spritesheet

1. Put the file in the correct `spritesheets/` subfolder.
2. Add its asset key in `src/game/utils/assetKeys.ts`.
3. Load it in `src/game/scenes/PreloadScene.ts`.
4. Register animations in `PreloadScene.createAnimations()`.
5. If it belongs to a randomized family like dinos, also register it in the matching data catalog.

### New Pickup Sprite

1. Put it in the correct `sprites/` subfolder.
2. Add an asset key.
3. Load it in `PreloadScene`.
4. Register it in the correct catalog or array, such as `dinos.ts`, `jewels.ts`, or `fossils.ts`.

### New Ladder or Tunnel Piece

1. Put tunnel overlays in `src/game/assets/sprites/terrain/`.
2. Put ladder segment art in `src/game/assets/sprites/ladders/`.
3. Add asset keys in `src/game/utils/assetKeys.ts`.
4. Load them in `src/game/scenes/PreloadScene.ts`.
5. Update `src/game/systems/DiggingSystem.ts` if the ladder segmentation or tunnel layering rules change.

### New Tileset

1. Add it to `tilesets/`.
2. Load it in `PreloadScene` with correct frame dimensions.
3. Define named frame groups in a data file.
4. Update the scene or system that paints terrain.

TODO:
- Add more dino sheets into `spritesheets/dinosaurs/` and register them in `src/game/data/dinos.ts`.
- Add more jewel pickups into `sprites/jewels/` and register them in `src/game/data/jewels.ts`.
- Replace placeholder UI and obstacle art when dedicated assets exist.
