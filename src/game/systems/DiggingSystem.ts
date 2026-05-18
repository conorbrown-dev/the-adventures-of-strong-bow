import Phaser from "phaser";

import { terrainTileFrames } from "../data/terrainTiles";
import { ASSET_KEYS } from "../utils/assetKeys";
import {
  DIG_LAVA_ROWS,
  DIG_PROTECTED_FLOOR_ROWS
} from "../utils/constants";

interface DiggingSystemConfig {
  width: number;
  height: number;
  cellSize: number;
  undergroundTop: number;
}

export interface DigCell {
  row: number;
  col: number;
}

export type DigTarget =
  | {
      kind: "surface";
      col: number;
    }
  | {
      kind: "cell";
      row: number;
      col: number;
    };

export class DiggingSystem {
  private static readonly LADDER_DISPLAY_WIDTH = 92;
  private static readonly LADDER_MIDDLE_DISPLAY_WIDTH = 104;
  private static readonly BOUNDS_EPSILON = 0.001;

  private readonly cols: number;
  private readonly rows: number;
  private readonly dug: boolean[][];
  private readonly stone: boolean[][];
  private readonly surfaceOpen: boolean[];
  private readonly laddered: boolean[][];
  private readonly tiles: Phaser.GameObjects.Sprite[][];
  private readonly tileBackings: Phaser.GameObjects.Rectangle[][];
  private readonly dugTiles: Phaser.GameObjects.Image[][];
  private readonly ladders: Phaser.GameObjects.Image[][];
  private readonly baseDirtFrame: number;
  private readonly terrainSeed: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: DiggingSystemConfig
  ) {
    this.cols = Math.ceil(config.width / config.cellSize);
    this.rows = Math.ceil((config.height - config.undergroundTop) / config.cellSize);
    this.dug = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => false)
    );
    this.stone = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => false)
    );
    this.surfaceOpen = Array.from({ length: this.cols }, () => false);
    this.laddered = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => false)
    );
    this.tiles = Array.from({ length: this.rows }, () => []);
    this.tileBackings = Array.from({ length: this.rows }, () => []);
    this.dugTiles = Array.from({ length: this.rows }, () => []);
    this.ladders = Array.from({ length: this.rows }, () => []);
    this.baseDirtFrame = Phaser.Utils.Array.GetRandom(
      [...terrainTileFrames.dirtUniformOptions]
    );
    this.terrainSeed = Phaser.Math.Between(0, 1000000);

    this.createTiles();
  }

  digCell(row: number, col: number): DigCell[] {
    if (!this.isInBounds(row, col) || this.dug[row][col] || this.stone[row][col]) {
      return [];
    }

    this.dug[row][col] = true;
    this.tiles[row][col].setVisible(false);
    this.dugTiles[row][col].setVisible(true);

    return [{ row, col }];
  }

  digSurface(col: number): boolean {
    if (col < 0 || col >= this.cols || this.surfaceOpen[col]) {
      return false;
    }

    this.surfaceOpen[col] = true;
    return true;
  }

  digWorldRect(x: number, y: number, width: number, height: number): DigCell[] {
    const left = x - width / 2;
    const right = x + width / 2;
    const top = y - height / 2;
    const bottom = y + height / 2;
    const newlyDug: DigCell[] = [];

    if (bottom < this.config.undergroundTop) {
      return newlyDug;
    }

    const minCol = this.worldToCol(left);
    const maxCol = this.worldToCol(right);
    const minRow = this.worldToRow(top);
    const maxRow = this.worldToRow(bottom);

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        if (!this.isInBounds(row, col) || this.dug[row][col]) {
          continue;
        }

        if (this.stone[row][col]) {
          continue;
        }

        this.dug[row][col] = true;
        if (row === 0) {
          this.surfaceOpen[col] = true;
        }
        this.tiles[row][col].setVisible(false);
        this.dugTiles[row][col].setVisible(true);
        newlyDug.push({ row, col });
      }
    }

    return newlyDug;
  }

  getCellAtWorld(x: number, y: number): DigCell | null {
    if (y < this.config.undergroundTop) {
      return null;
    }

    const col = this.worldToCol(x);
    const row = this.worldToRow(y);

    if (!this.isInBounds(row, col)) {
      return null;
    }

    return { row, col };
  }

  getDigTarget(
    x: number,
    y: number,
    direction: Phaser.Math.Vector2
  ): DigTarget | null {
    if (direction.lengthSq() === 0) {
      return null;
    }

    const isVertical = Math.abs(direction.y) > Math.abs(direction.x);

    if (y < this.config.undergroundTop) {
      if (!isVertical || direction.y <= 0) {
        return null;
      }

      const surfaceCol = Phaser.Math.Clamp(this.worldToCol(x), 0, this.cols - 1);

      if (!this.surfaceOpen[surfaceCol]) {
        return { kind: "surface", col: surfaceCol };
      }

      return { kind: "cell", row: 0, col: surfaceCol };
    }

    const currentCell = this.getCellAtWorld(x, y);

    if (!currentCell) {
      return null;
    }

    if (isVertical && direction.y < 0 && currentCell.row === 0) {
      if (!this.surfaceOpen[currentCell.col]) {
        return { kind: "surface", col: currentCell.col };
      }

      return null;
    }

    const target = isVertical
      ? {
          row: currentCell.row + Math.sign(direction.y),
          col: currentCell.col
        }
      : {
          row: currentCell.row,
          col: currentCell.col + Math.sign(direction.x)
        };

    if (!this.isInBounds(target.row, target.col) || this.stone[target.row][target.col]) {
      return null;
    }

    return {
      kind: "cell",
      row: target.row,
      col: target.col
    };
  }

  isDigBlockedByStone(
    x: number,
    y: number,
    direction: Phaser.Math.Vector2
  ): boolean {
    if (direction.lengthSq() === 0) {
      return false;
    }

    const isVertical = Math.abs(direction.y) > Math.abs(direction.x);

    if (y < this.config.undergroundTop) {
      return false;
    }

    const currentCell = this.getCellAtWorld(x, y);

    if (!currentCell) {
      return false;
    }

    if (isVertical && direction.y < 0 && currentCell.row === 0) {
      return false;
    }

    const target = isVertical
      ? {
          row: currentCell.row + Math.sign(direction.y),
          col: currentCell.col
        }
      : {
          row: currentCell.row,
          col: currentCell.col + Math.sign(direction.x)
        };

    return this.isInBounds(target.row, target.col) && this.stone[target.row][target.col];
  }

  getCellCenter(cell: DigCell): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      cell.col * this.config.cellSize + this.config.cellSize / 2,
      this.config.undergroundTop +
        cell.row * this.config.cellSize +
        this.config.cellSize / 2
    );
  }

  getWorldWidth(): number {
    return this.cols * this.config.cellSize;
  }

  getWorldHeight(): number {
    return this.config.undergroundTop + this.rows * this.config.cellSize;
  }

  isCellDug(row: number, col: number): boolean {
    return this.isInBounds(row, col) && this.dug[row][col];
  }

  isStoneCellAt(row: number, col: number): boolean {
    return this.isInBounds(row, col) && this.stone[row][col];
  }

  isSurfaceOpen(col: number): boolean {
    return col >= 0 && col < this.cols && this.surfaceOpen[col];
  }

  isCellLaddered(row: number, col: number): boolean {
    return this.isInBounds(row, col) && this.laddered[row][col];
  }

  ensureLadderAtCell(cell: DigCell): void {
    this.setLadder(cell.row, cell.col);
  }

  ensureLadderAtWorldRect(x: number, y: number, width: number, height: number): void {
    const left = x - width / 2;
    const right = x + width / 2;
    const top = y - height / 2;
    const bottom = y + height / 2;

    if (bottom < this.config.undergroundTop) {
      return;
    }

    const minCol = this.worldToCol(left);
    const maxCol = this.worldToCol(right);
    const minRow = this.worldToRow(top);
    const maxRow = this.worldToRow(bottom);

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        this.setLadder(row, col);
      }
    }
  }

  canMoveToWorldRect(x: number, y: number, width: number, height: number): boolean {
    const left = x - width / 2;
    const right = x + width / 2 - DiggingSystem.BOUNDS_EPSILON;
    const top = y - height / 2;
    const bottom = y + height / 2 - DiggingSystem.BOUNDS_EPSILON;

    if (bottom < this.config.undergroundTop) {
      return true;
    }

    const minCol = this.worldToCol(left);
    const maxCol = this.worldToCol(right);
    const minRow = this.worldToRow(top);
    const maxRow = this.worldToRow(bottom);

    if (minRow < 0) {
      for (let col = minCol; col <= maxCol; col += 1) {
        if (!this.isSurfaceOpen(col)) {
          return false;
        }
      }
    }

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        if (row < 0) {
          continue;
        }

        if (!this.isInBounds(row, col) || !this.dug[row][col]) {
          return false;
        }
      }
    }

    return true;
  }

  canClimbWorldRect(x: number, y: number, width: number, height: number): boolean {
    const left = x - width / 2;
    const right = x + width / 2 - DiggingSystem.BOUNDS_EPSILON;
    const top = y - height / 2;
    const bottom = y + height / 2 - DiggingSystem.BOUNDS_EPSILON;

    if (bottom < this.config.undergroundTop) {
      return true;
    }

    const minCol = this.worldToCol(left);
    const maxCol = this.worldToCol(right);
    const minRow = this.worldToRow(top);
    const maxRow = this.worldToRow(bottom);

    if (minRow < 0) {
      for (let col = minCol; col <= maxCol; col += 1) {
        if (!this.isSurfaceOpen(col)) {
          return false;
        }
      }
    }

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        if (row < 0) {
          continue;
        }

        if (!this.isInBounds(row, col) || !this.laddered[row][col]) {
          return false;
        }
      }
    }

    return true;
  }

  private createTiles(): void {
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const x = col * this.config.cellSize + this.config.cellSize / 2;
        const y =
          this.config.undergroundTop +
          row * this.config.cellSize +
          this.config.cellSize / 2;
        const isStone = this.isStoneCell(row, col);
        const isLava = this.isLavaCell(row);
        this.stone[row][col] = isStone;
        const tileFrame = isLava
          ? terrainTileFrames.lava[col % terrainTileFrames.lava.length]
          : isStone
            ? terrainTileFrames.rock[col % terrainTileFrames.rock.length]
            : this.baseDirtFrame;
        const tileBackingColor = isLava
          ? 0x5a1600
          : isStone
            ? 0x6f665d
            : 0x8b5a2b;

        const tileBacking = this.scene.add
          .rectangle(
            x,
            y,
            this.config.cellSize,
            this.config.cellSize,
            tileBackingColor,
            1
          )
          .setDepth(3);
        const tile = this.scene.add
          .sprite(
            x,
            y,
            ASSET_KEYS.TERRAIN,
            tileFrame
          )
          .setDisplaySize(this.config.cellSize, this.config.cellSize)
          .setAlpha(1)
          .setDepth(6);
        const dugTile = this.scene.add
          .image(x, y, ASSET_KEYS.TUNNEL_DIRT)
          .setDisplaySize(this.config.cellSize, this.config.cellSize)
          .setDepth(4)
          .setVisible(false);
        const ladder = this.scene.add
          .image(x, y, ASSET_KEYS.LADDER_MIDDLE)
          .setDisplaySize(
            DiggingSystem.LADDER_MIDDLE_DISPLAY_WIDTH,
            this.config.cellSize
          )
          .setDepth(5)
          .setVisible(false);

        this.tileBackings[row][col] = tileBacking;
        this.tiles[row][col] = tile;
        this.dugTiles[row][col] = dugTile;
        this.ladders[row][col] = ladder;
      }
    }
  }

  private worldToCol(x: number): number {
    return Math.floor(x / this.config.cellSize);
  }

  private worldToRow(y: number): number {
    return Math.floor((y - this.config.undergroundTop) / this.config.cellSize);
  }

  private isInBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  private isStoneCell(row: number, col: number): boolean {
    if (row >= this.rows - DIG_PROTECTED_FLOOR_ROWS) {
      return true;
    }

    const noise = (row * 73 + col * 37 + this.terrainSeed) % 100;
    return noise < 9;
  }

  private isLavaCell(row: number): boolean {
    return row >= this.rows - DIG_LAVA_ROWS;
  }

  private setLadder(row: number, col: number): void {
    if (!this.isInBounds(row, col) || !this.dug[row][col] || this.laddered[row][col]) {
      return;
    }

    this.laddered[row][col] = true;
    this.ladders[row][col].setVisible(true);
    this.updateLadderSegment(row, col);
    this.updateLadderSegment(row - 1, col);
    this.updateLadderSegment(row + 1, col);
  }

  private updateLadderSegment(row: number, col: number): void {
    if (!this.isInBounds(row, col) || !this.laddered[row][col]) {
      return;
    }

    const hasAbove = this.isInBounds(row - 1, col) && this.laddered[row - 1][col];
    const hasBelow = this.isInBounds(row + 1, col) && this.laddered[row + 1][col];

    let textureKey: string = ASSET_KEYS.LADDER_MIDDLE;

    if (!hasAbove && hasBelow) {
      textureKey = ASSET_KEYS.LADDER_TOP;
    } else if (hasAbove && !hasBelow) {
      textureKey = ASSET_KEYS.LADDER_BOTTOM;
    } else if (!hasAbove && !hasBelow) {
      textureKey = ASSET_KEYS.LADDER_MIDDLE;
    }

    const displayWidth =
      textureKey === ASSET_KEYS.LADDER_MIDDLE
        ? DiggingSystem.LADDER_MIDDLE_DISPLAY_WIDTH
        : DiggingSystem.LADDER_DISPLAY_WIDTH;

    this.ladders[row][col]
      .setTexture(textureKey)
      .setDisplaySize(displayWidth, this.config.cellSize);
  }
}
