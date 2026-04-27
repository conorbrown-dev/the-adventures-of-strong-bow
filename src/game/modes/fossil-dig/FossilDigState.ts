export class FossilDigState {
  private readonly collectedFossilIds = new Set<string>();

  gemAvailable = false;
  gemCollected = false;

  constructor(public readonly totalFossils: number) {}

  markFossilCollected(id: string): void {
    this.collectedFossilIds.add(id);
  }

  markGemAvailable(): void {
    this.gemAvailable = true;
  }

  markGemCollected(): void {
    this.gemCollected = true;
  }

  get collectedCount(): number {
    return this.collectedFossilIds.size;
  }

  get allFossilsCollected(): boolean {
    return this.collectedCount >= this.totalFossils;
  }
}
