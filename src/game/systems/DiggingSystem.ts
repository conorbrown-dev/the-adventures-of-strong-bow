import Phaser from "phaser";

import { terrainTileFrames } from "../data/terrainTiles";
import { ASSET_KEYS } from "../utils/assetKeys";

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

export class DiggingSystem {
  private static readonly LADDER_DISPLAY_WIDTH = 92;
  private static readonly LADDER_MIDDLE_DISPLAY_WIDTH = 104;

  private readonly cols: number;
  private readonly rows: number;
  private readonly dug: boolean[][];
  private readonly laddered: boolean[][];
  private readonly tiles: Phaser.GameObjects.Sprite[][];
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
    this.laddered = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => false)
    );
    this.tiles = Array.from({ length: this.rows }, () => []);
    this.dugTiles = Array.from({ length: this.rows }, () => []);
    this.ladders = Array.from({ length: this.rows }, () => []);
    this.baseDirtFrame = Phaser.Utils.Array.GetRandom(
      [...terrainTileFrames.dirtUniformOptions]
    );
    this.terrainSeed = Phaser.Math.Between(0, 1000000);

    this.createTiles();
  }

  digCell(row: number, col: number): DigCell[] {
    if (!this.isInBounds(row, col) || this.dug[row][col]) {
      return [];
    }

    this.dug[row][col] = true;
    this.tiles[row][col].setVisible(false);
    this.dugTiles[row][col].setVisible(true);

    return [{ row, col }];
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

        this.dug[row][col] = true;
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

  getDigTargetCell(
    x: number,
    y: number,
    direction: Phaser.Math.Vector2
  ): DigCell | null {
    if (direction.lengthSq() === 0) {
      return null;
    }

    const isVertical = Math.abs(direction.y) > Math.abs(direction.x);

    if (y < this.config.undergroundTop) {
      if (!isVertical || direction.y <= 0) {
        return null;
      }

      const surfaceCol = Phaser.Math.Clamp(this.worldToCol(x), 0, this.cols - 1);
      return { row: 0, col: surfaceCol };
    }

    const currentCell = this.getCellAtWorld(x, y);

    if (!currentCell) {
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

    return this.isInBounds(target.row, target.col) ? target : null;
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
    const right = x + width / 2;
    const top = y - height / 2;
    const bottom = y + height / 2;

    if (bottom < this.config.undergroundTop) {
      return true;
    }

    const minCol = this.worldToCol(left);
    const maxCol = this.worldToCol(right);
    const minRow = this.worldToRow(top);
    const maxRow = this.worldToRow(bottom);

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        if (!this.isInBounds(row, col) || !this.dug[row][col]) {
          return false;
        }
      }
    }

    return true;
  }

  canClimbWorldRect(x: number, y: number, width: number, height: number): boolean {
    const left = x - width / 2;
    const right = x + width / 2;
    const top = y - height / 2;
    const bottom = y + height / 2;

    if (bottom < this.config.undergroundTop) {
      return true;
    }

    const minCol = this.worldToCol(left);
    const maxCol = this.worldToCol(right);
    const minRow = this.worldToRow(top);
    const maxRow = this.worldToRow(bottom);

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
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

        const tile = this.scene.add
          .sprite(
            x,
            y,
            ASSET_KEYS.TERRAIN,
            this.pickTerrainFrame(row, col)
          )
          .setDisplaySize(this.config.cellSize, this.config.cellSize)
          .setDepth(5);
        const dugTile = this.scene.add
          .image(x, y, ASSET_KEYS.TUNNEL_DIRT)
          .setDisplaySize(this.config.cellSize, this.config.cellSize)
          .setDepth(3)
          .setVisible(false);
        const ladder = this.scene.add
          .image(x, y, ASSET_KEYS.LADDER_MIDDLE)
          .setDisplaySize(
            DiggingSystem.LADDER_MIDDLE_DISPLAY_WIDTH,
            this.config.cellSize
          )
          .setDepth(4)
          .setVisible(false);

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

  private pickTerrainFrame(row: number, col: number): number {
    if (this.isStoneCell(row, col)) {
      const rockFrames = terrainTileFrames.rock;
      return rockFrames[(row + col + this.terrainSeed) % rockFrames.length];
    }

    return this.baseDirtFrame;
  }

  private isStoneCell(row: number, col: number): boolean {
    const noise = (row * 73 + col * 37 + this.terrainSeed) % 100;
    return noise < 9;
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
