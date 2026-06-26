import {
  getBarnDoorVowelsModeConfig,
  type BarnDoorVowelsModeConfig,
} from "./BarnDoorVowelsConfig";
import { buildBarnDoorVowelsContent } from "./BarnDoorVowelsContent";
import { BarnDoorVowelsState } from "./BarnDoorVowelsState";
import { getCvcConfiguredTargetCount } from "../../settings/parentalSettings";
import {
  createRandomBarnDoorVowelsStageTheme,
  type BarnDoorVowelsStageTheme
} from "./BarnDoorVowelsStageTheme";

export class BarnDoorVowelsMode {
  readonly state: BarnDoorVowelsState;

  private constructor(
    public readonly config: BarnDoorVowelsModeConfig,
    public readonly content: ReturnType<typeof buildBarnDoorVowelsContent>,
    public readonly stageTheme: BarnDoorVowelsStageTheme,
    totalVowels: number
  ) {
    this.state = new BarnDoorVowelsState(totalVowels);
  }

  static create(
    stageTheme: BarnDoorVowelsStageTheme = createRandomBarnDoorVowelsStageTheme()
  ): BarnDoorVowelsMode {
    const config = getBarnDoorVowelsModeConfig();
    const content = buildBarnDoorVowelsContent();
    const totalVowels = getCvcConfiguredTargetCount(content.vowels.length)

    return new BarnDoorVowelsMode(config, content, stageTheme, totalVowels);
  }
}
