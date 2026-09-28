import {
  getFossilDigModeConfig,
  type FossilDigModeConfig,
} from "./FossilDigConfig";
import { buildFossilDigContent, type FossilDigModuleId } from "./FossilDigContent";
import { FossilDigState } from "./FossilDigState";
import { getDinoById } from "../../data/dinos";
import { getJewelById } from "../../data/jewels";
import { getCvcConfiguredTargetCount } from "../../settings/parentalSettings";
import {
  createRandomFossilDigStageTheme,
  type FossilDigStageTheme
} from "./FossilDigStageTheme";

export class FossilDigMode {
  readonly state: FossilDigState;

  private constructor(
    public readonly config: FossilDigModeConfig,
    public readonly content: ReturnType<typeof buildFossilDigContent>,
    public readonly stageTheme: FossilDigStageTheme,
    totalFossils: number
  ) {
    this.state = new FossilDigState(totalFossils);
  }

  get bossDino() {
    return getDinoById(this.stageTheme.dinoId);
  }

  get rewardJewel() {
    return getJewelById(this.stageTheme.jewelId);
  }

  static create(
    stageTheme: FossilDigStageTheme = createRandomFossilDigStageTheme(),
    moduleId: FossilDigModuleId = "cvc"
  ): FossilDigMode {
    const config = getFossilDigModeConfig();
    const content = buildFossilDigContent(moduleId);
    const totalFossils = getCvcConfiguredTargetCount(content.pickups.length)

    return new FossilDigMode({ ...config, title: content.title }, content, stageTheme, totalFossils);
  }
}
