import type { Standard } from "../domain/standard";
import { oklahomaScienceStandards } from "../data/oklahoma-science-standards";
import { oklahomaSocialStudiesStandards } from "../data/oklahoma-social-studies-standards";
import { loadAndValidateVendoredStandards } from "./vendored-standards.validator";

/** Combines the immutable Common Core source with separately sourced Oklahoma standards. */
export async function loadLearningStandards(): Promise<Standard[]> {
  const commonCore = await loadAndValidateVendoredStandards();
  return [...commonCore.records, ...oklahomaScienceStandards, ...oklahomaSocialStudiesStandards];
}
