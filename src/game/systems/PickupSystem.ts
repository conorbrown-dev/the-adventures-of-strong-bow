import { FossilPickup } from "../entities/FossilPickup";
import { GemPickup } from "../entities/GemPickup";
import { FossilDigState } from "../modes/fossil-dig/FossilDigState";

export interface PickupProgress {
  collected: number;
  total: number;
  gemAvailable: boolean;
  gemCollected: boolean;
}

interface PickupSystemCallbacks {
  onProgress: (progress: PickupProgress) => void;
  onAllFossilsCollected: () => void;
  onGemCollected: () => void;
}

export class PickupSystem {
  constructor(
    private readonly state: FossilDigState,
    private readonly fossils: FossilPickup[],
    private readonly gem: GemPickup,
    private readonly callbacks: PickupSystemCallbacks
  ) {
    this.emitProgress();
  }

  collectFossil(pickup: FossilPickup): void {
    if (!pickup.collect()) {
      return;
    }

    this.state.markFossilCollected(pickup.pickupId);

    if (this.state.allFossilsCollected && !this.state.gemAvailable) {
      this.state.markGemAvailable();
      this.gem.activate();
      this.callbacks.onAllFossilsCollected();
    }

    this.emitProgress();
  }

  collectGem(): void {
    if (!this.state.gemAvailable || !this.gem.collect()) {
      return;
    }

    this.state.markGemCollected();
    this.emitProgress();
    this.callbacks.onGemCollected();
  }

  getProgress(): PickupProgress {
    return {
      collected: this.state.collectedCount,
      total: this.fossils.length,
      gemAvailable: this.state.gemAvailable,
      gemCollected: this.state.gemCollected
    };
  }

  private emitProgress(): void {
    this.callbacks.onProgress(this.getProgress());
  }
}
