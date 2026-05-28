import {
  buildLetterCatchContent,
  type LetterCatchContent
} from "./LetterCatchContent";
import {
  getLetterCatchModeConfig,
  type LetterCatchModeConfig,
  type LetterCatchVariant
} from "./LetterCatchConfig";
import { LetterCatchState } from "./LetterCatchState";

export class LetterCatchMode {
  readonly state: LetterCatchState;

  private constructor(
    readonly variant: LetterCatchVariant,
    readonly config: LetterCatchModeConfig,
    readonly content: LetterCatchContent
  ) {
    this.state = new LetterCatchState(config.catchGoal);
  }

  static create(variant: LetterCatchVariant): LetterCatchMode {
    return new LetterCatchMode(
      variant,
      getLetterCatchModeConfig(variant),
      buildLetterCatchContent(variant)
    );
  }
}
