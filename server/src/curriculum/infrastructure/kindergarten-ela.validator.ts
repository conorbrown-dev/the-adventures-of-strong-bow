import { assertDecodableText } from "../domain/decodable-scope";
import { ACTIVITY_PURPOSES } from "../domain/ela-skill";
import { LESSON_RECIPE_IDS, type LearningActivityDefinition, type LessonChoice } from "../domain/learning-activity";
import { KINDERGARTEN_AUDIO_CUE_CATALOG, KINDERGARTEN_AUDIO_CUES, KINDERGARTEN_ELA_ACTIVITIES, KINDERGARTEN_ELA_SKILLS, KINDERGARTEN_LESSON_RECIPES, SHORT_A_SCOPE } from "./kindergarten-ela-catalog";
import { loadLearningStandards } from "./learning-standards";

function assertUnique(values: readonly string[], label: string): void {
  const duplicate = values.find((value, index) => values.indexOf(value) !== index);
  if (duplicate) throw new Error(`Duplicate ${label}: ${duplicate}.`);
}

function assertAcyclic(): void {
  const byId = new Map(KINDERGARTEN_ELA_SKILLS.map((skill) => [skill.id, skill]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (skillId: string): void => {
    if (visiting.has(skillId)) throw new Error(`Kindergarten ELA prerequisite cycle includes ${skillId}.`);
    if (visited.has(skillId)) return;
    const skill = byId.get(skillId);
    if (!skill) throw new Error(`Unknown prerequisite skill ${skillId}.`);
    visiting.add(skillId);
    skill.prerequisiteSkillIds.forEach(visit);
    visiting.delete(skillId);
    visited.add(skillId);
  };
  KINDERGARTEN_ELA_SKILLS.forEach((skill) => visit(skill.id));
}

export function validateDistractors(targetDomain: string, choices: readonly LessonChoice[], canonicalAnswer: unknown): void {
  if (choices.length < 2) throw new Error("A choice activity needs at least two plausible choices.");
  assertUnique(choices.map((choice) => choice.id), "choice ID");
  const correct = choices.filter((choice) => choice.id === canonicalAnswer);
  if (correct.length !== 1) throw new Error("A choice activity must contain exactly one canonical choice.");
  choices.filter((choice) => choice.id !== canonicalAnswer).forEach((distractor) => {
    if (distractor.conceptDomain !== targetDomain) throw new Error(`Distractor ${distractor.id} is outside target concept ${targetDomain}.`);
    if (!distractor.misconception) throw new Error(`Distractor ${distractor.id} needs misconception metadata.`);
  });
}

function validateActivity(activity: LearningActivityDefinition): void {
  if (!KINDERGARTEN_ELA_SKILLS.some((skill) => skill.id === activity.primarySkillId)) throw new Error(`Activity ${activity.id} targets an unknown skill.`);
  const recipe = KINDERGARTEN_LESSON_RECIPES.find((candidate) => candidate.id === activity.recipeId);
  if (!recipe) throw new Error(`Activity ${activity.id} references unknown recipe ${activity.recipeId}.`);
  if (!recipe.supportedPurposes.includes(activity.purpose)) throw new Error(`Recipe ${recipe.id} does not support ${activity.purpose}.`);
  if (!recipe.supportedPresentationKinds.includes(activity.presentation.kind)) throw new Error(`Recipe ${recipe.id} does not support ${activity.presentation.kind}.`);
  if (activity.presentation.kind === "CHOICE_BOARD" && activity.targetConceptDomain) validateDistractors(activity.targetConceptDomain, activity.presentation.choices, activity.canonicalAnswer);
  if (activity.presentation.kind === "CONTROLLED_TEXT") {
    assertDecodableText(activity.presentation.text, SHORT_A_SCOPE);
    validateDistractors("literal-sentence", activity.presentation.choices, activity.canonicalAnswer);
  }
  if (activity.presentation.kind === "CARD_WORKSPACE" && activity.presentation.wordAudioText) assertDecodableText(activity.presentation.wordAudioText, SHORT_A_SCOPE);
  if (activity.contentScopeId === SHORT_A_SCOPE.id && typeof activity.canonicalAnswer === "string" && activity.recipeId === "ela.word-mapping.v1") assertDecodableText(activity.canonicalAnswer, SHORT_A_SCOPE);
  const audioCueIds = "audioCueIds" in activity.presentation ? activity.presentation.audioCueIds ?? [] : [];
  audioCueIds.forEach((cueId) => {
    if (!(KINDERGARTEN_AUDIO_CUES as readonly string[]).includes(cueId)) throw new Error(`Activity ${activity.id} references unknown audio cue ${cueId}.`);
  });
}

export async function validateKindergartenElaCatalog(): Promise<void> {
  assertUnique(KINDERGARTEN_LESSON_RECIPES.map((recipe) => `${recipe.id}@${recipe.version}`), "lesson recipe version");
  LESSON_RECIPE_IDS.forEach((recipeId) => {
    if (!KINDERGARTEN_LESSON_RECIPES.some((recipe) => recipe.id === recipeId)) throw new Error(`Missing Stage 3 lesson recipe ${recipeId}.`);
  });
  assertUnique(KINDERGARTEN_AUDIO_CUE_CATALOG.map((cue) => `${cue.id}@${cue.version}`), "audio cue version");
  SHORT_A_SCOPE.regularWords.forEach((word) => {
    const invalidGrapheme = [...word].find((grapheme) => !SHORT_A_SCOPE.allowedGraphemes.includes(grapheme));
    if (invalidGrapheme) throw new Error(`Word ${word} uses disallowed grapheme ${invalidGrapheme}.`);
    if (word.includes("c") && !word.startsWith("c")) throw new Error(`Word ${word} uses c outside the reviewed initial /k/ position.`);
  });
  assertUnique(KINDERGARTEN_ELA_SKILLS.map((skill) => `${skill.id}@${skill.version}`), "skill version");
  assertUnique(KINDERGARTEN_ELA_ACTIVITIES.map((activity) => `${activity.id}@${activity.version}`), "activity version");
  assertAcyclic();

  const standardIds = new Set((await loadLearningStandards()).map((standard) => standard.officialId));
  KINDERGARTEN_ELA_SKILLS.forEach((skill) => {
    skill.standardMappings.forEach((mapping) => {
      if (!standardIds.has(mapping.standardId)) throw new Error(`Skill ${skill.id} maps unknown standard ${mapping.standardId}.`);
    });
    ACTIVITY_PURPOSES.forEach((purpose) => {
      const count = KINDERGARTEN_ELA_ACTIVITIES.filter((activity) => activity.primarySkillId === skill.id && activity.purpose === purpose).length;
      const minimum = purpose === "GUIDED_PRACTICE" || purpose === "REVIEW" ? 2 : purpose === "INDEPENDENT_PRACTICE" || purpose === "MASTERY_CHECK" ? 3 : 1;
      if (count < minimum) throw new Error(`Skill ${skill.id} needs ${minimum} ${purpose} activities; found ${count}.`);
    });
  });
  KINDERGARTEN_ELA_ACTIVITIES.forEach(validateActivity);
  assertDecodableText("Sam sat.", SHORT_A_SCOPE);
}
