export class BarnDoorVowelsState {
  private readonly correctVowelIds = new Set<string>();

  gemAvailable = false;
  gemCollected = false;

  constructor(public readonly totalVowels: number) { }

  markVowelCorrect(id: string): void {
    this.correctVowelIds.add(id);
  }

  get correctVowelCount(): number {
    return this.correctVowelIds.size;
  }

  get correctVowelCountReached(): boolean {
    return this.correctVowelCount >= this.totalVowels;
  }
}
