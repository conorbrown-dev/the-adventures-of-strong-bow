export class LetterCatchState {
  correctCaught = 0;
  incorrectCaught = 0;
  missedTarget = 0;

  constructor(readonly catchGoal: number) {}

  registerCorrectCatch(): void {
    this.correctCaught += 1;
  }

  registerIncorrectCatch(): void {
    this.incorrectCaught += 1;
  }

  registerMissedTarget(): void {
    this.missedTarget += 1;
  }

  get remaining(): number {
    return Math.max(0, this.catchGoal - this.correctCaught);
  }

  get isComplete(): boolean {
    return this.correctCaught >= this.catchGoal;
  }
}
