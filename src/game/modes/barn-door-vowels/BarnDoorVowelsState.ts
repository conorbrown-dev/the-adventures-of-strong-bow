export class BarnDoorVowelsState {
  private correctAnswers = 0;

  constructor(public readonly totalVowels: number) { }

  markVowelCorrect(): void {
    this.correctAnswers += 1;
  }

  get correctVowelCount(): number {
    return this.correctAnswers;
  }

  get correctVowelCountReached(): boolean {
    return this.correctVowelCount >= this.totalVowels;
  }
}
