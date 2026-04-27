import {
  FOSSIL_DIG_MODE_CONFIGS,
  type FossilDigVariant
} from "./FossilDigConfig";
import { buildFossilDigContent } from "./FossilDigContent";
import { FossilDigState } from "./FossilDigState";
import { getDinoById } from "../../data/dinos";
import { getJewelById } from "../../data/jewels";
import {
  createRandomFossilDigStageTheme,
  type FossilDigStageTheme
} from "./FossilDigStageTheme";

export class FossilDigMode {
  readonly state: FossilDigState;

  private constructor(
    public readonly variant: FossilDigVariant,
    public readonly config: (typeof FOSSIL_DIG_MODE_CONFIGS)[FossilDigVariant],
    public readonly content: ReturnType<typeof buildFossilDigContent>,
    public readonly stageTheme: FossilDigStageTheme
  ) {
    this.state = new FossilDigState(content.pickups.length);
  }

  get bossDino() {
    return getDinoById(this.stageTheme.dinoId);
  }

  get rewardJewel() {
    return getJewelById(this.stageTheme.jewelId);
  }

  static create(
    variant: FossilDigVariant,
    stageTheme: FossilDigStageTheme = createRandomFossilDigStageTheme()
  ): FossilDigMode {
    const config = FOSSIL_DIG_MODE_CONFIGS[variant];
    const content = buildFossilDigContent(variant);

    return new FossilDigMode(variant, config, content, stageTheme);
  }
}
