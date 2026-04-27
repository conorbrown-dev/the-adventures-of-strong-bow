import { DinoSkeleton } from "../entities/DinoSkeleton";
import { Player } from "../entities/Player";

interface ChaseSystemConfig {
  finishX: number;
  dinoSpeed: number;
  catchDistance: number;
}

interface ChaseCallbacks {
  onCaught: () => void;
  onWin: () => void;
}

export class ChaseSystem {
  private chaseActive = false;
  private finished = false;

  constructor(
    private readonly player: Player,
    private readonly dino: DinoSkeleton,
    private readonly config: ChaseSystemConfig,
    private readonly callbacks: ChaseCallbacks
  ) {}

  async beginIntro(): Promise<void> {
    await this.dino.roar();
    this.chaseActive = true;
    this.dino.startChasing();
  }

  update(): void {
    if (this.finished) {
      return;
    }

    if (this.chaseActive) {
      this.dino.setVelocityX(this.config.dinoSpeed);
    } else {
      this.dino.setVelocityX(0);
    }

    if (
      this.chaseActive &&
      this.dino.x + this.config.catchDistance >= this.player.x
    ) {
      this.finished = true;
      this.callbacks.onCaught();
      return;
    }

    if (this.player.x >= this.config.finishX) {
      this.finished = true;
      this.callbacks.onWin();
    }
  }
}
