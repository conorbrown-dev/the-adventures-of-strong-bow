import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { QUESTION_RESPONSE_TYPES, type QuestionInstance, type QuestionTemplate } from "../domain/question-template";
import { CURRICULUM_GRADES, CURRICULUM_SUBJECTS, type Standard } from "../domain/standard";

export class QuestionValidationError extends Error {}
const productionStatuses = new Set(["reviewed"]);
const generators: Record<string, { responseType: string; required: string[] }> = {
  nextNumber: { responseType: "singleChoice", required: ["minimum", "maximum", "choiceCount"] },
  countVisualObjects: { responseType: "singleChoice", required: ["minimum", "maximum", "choiceCount", "objectKey"] },
  matchUpperLowerLetters: { responseType: "classification", required: ["pairCount"] },
  rhymeChoice: { responseType: "singleChoice", required: ["wordFamilies", "choiceCount"] },
  cvcMedialVowel: { responseType: "singleChoice", required: ["vowels", "choiceCount"] }
  , silentEDecode: { responseType: "singleChoice", required: [] }
  , placeValueConstruction: { responseType: "singleChoice", required: [] }
  , gradeOneMath: { responseType: "singleChoice", required: ["skill"] }
  , additionWithinRange: { responseType: "singleChoice", required: ["minimum", "maximum", "choiceCount"] }
  , subtractionWithinRange: { responseType: "singleChoice", required: ["minimum", "maximum", "choiceCount"] }
  , compareNumbers: { responseType: "singleChoice", required: ["minimum", "maximum"] }
};
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const requireString = (value: unknown, path: string): string => { if (typeof value !== "string" || value.trim() === "") throw new QuestionValidationError(`${path} must be a non-empty string`); return value; };
const requireInteger = (value: unknown, path: string): number => { if (!Number.isInteger(value)) throw new QuestionValidationError(`${path} must be an integer`); return value as number; };
const requireStringArray = (value: unknown, path: string): string[] => { if (!Array.isArray(value) || value.some((item) => typeof item !== "string") || new Set(value).size !== value.length) throw new QuestionValidationError(`${path} must be a unique string array`); return value as string[]; };

function validateBounds(parameters: Record<string, unknown>, path: string): void {
  const hasMinimum = "minimum" in parameters; const hasMaximum = "maximum" in parameters;
  if (hasMinimum !== hasMaximum) throw new QuestionValidationError(`${path} requires both minimum and maximum`);
  if (hasMinimum) { const minimum = requireInteger(parameters.minimum, `${path}.minimum`); const maximum = requireInteger(parameters.maximum, `${path}.maximum`); if (minimum > maximum) throw new QuestionValidationError(`${path} minimum cannot exceed maximum`); if (maximum - minimum > 100) throw new QuestionValidationError(`${path} range exceeds safe generator bounds`); }
  if ("choiceCount" in parameters) { const count = requireInteger(parameters.choiceCount, `${path}.choiceCount`); if (count < 2 || count > 8) throw new QuestionValidationError(`${path}.choiceCount must be between 2 and 8`); }
  if ("pairCount" in parameters) { const count = requireInteger(parameters.pairCount, `${path}.pairCount`); if (count < 2 || count > 10) throw new QuestionValidationError(`${path}.pairCount must be between 2 and 10`); }
  if ("avoidDenseLayoutAbove" in parameters && (!Number.isInteger(parameters.avoidDenseLayoutAbove) || Number(parameters.avoidDenseLayoutAbove) < 1 || Number(parameters.avoidDenseLayoutAbove) > 20)) throw new QuestionValidationError(`${path}.avoidDenseLayoutAbove must be within 1 to 20`);
  if ("divisor" in parameters && Number(parameters.divisor) === 0) throw new QuestionValidationError(`${path}.divisor cannot be zero`);
}

export function validateQuestionTemplate(value: unknown, standards: readonly Standard[], production = false): QuestionTemplate {
  if (!isRecord(value)) throw new QuestionValidationError("template must be an object");
  const allowed = new Set(["schemaVersion", "id", "version", "primaryStandardId", "supportingStandardIds", "subject", "grade", "responseType", "prompt", "generator", "answerSpec", "distractorStrategy", "difficulty", "gameModes", "modalities", "diagnosticEligible", "provenance", "review"]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new QuestionValidationError(`template has unsupported property ${key}`);
  if (requireInteger(value.schemaVersion, "schemaVersion") < 1) throw new QuestionValidationError("schemaVersion must be positive");
  const id = requireString(value.id, "id"); if (!/^[a-z0-9][a-z0-9._-]+$/.test(id)) throw new QuestionValidationError("id has an invalid format");
  if (requireInteger(value.version, "version") < 1) throw new QuestionValidationError("version must be positive");
  const primaryStandardId = requireString(value.primaryStandardId, "primaryStandardId"); const supportingStandardIds = requireStringArray(value.supportingStandardIds, "supportingStandardIds");
  const ids = [primaryStandardId, ...supportingStandardIds]; const known = new Set(standards.map((standard) => standard.officialId)); if (ids.some((id) => !known.has(id))) throw new QuestionValidationError("template references a standard that is not in the vendored dataset");
  if (!CURRICULUM_SUBJECTS.includes(value.subject as never) || !CURRICULUM_GRADES.includes(value.grade as never)) throw new QuestionValidationError("subject or grade is invalid");
  if (!QUESTION_RESPONSE_TYPES.includes(value.responseType as never)) throw new QuestionValidationError("responseType is invalid");
  if (!isRecord(value.prompt)) throw new QuestionValidationError("prompt must be an object"); requireString(value.prompt.text, "prompt.text"); if (value.grade === "K" && (!value.prompt.audioText || typeof value.prompt.audioText !== "string")) throw new QuestionValidationError("Kindergarten templates require prompt.audioText");
  if (!isRecord(value.generator)) throw new QuestionValidationError("generator must be an object");
  const generatorValue = value.generator;
  const kind = requireString(generatorValue.kind, "generator.kind");
  if (!isRecord(generatorValue.parameters)) throw new QuestionValidationError("generator.parameters must be an object");
  const generatorParameters = generatorValue.parameters;
  const generator = generators[kind]; if (!generator) throw new QuestionValidationError(`unsupported generator kind: ${kind}`); if (generator.responseType !== value.responseType) throw new QuestionValidationError(`${kind} requires ${generator.responseType}`); generator.required.forEach((key) => { if (!(key in generatorParameters)) throw new QuestionValidationError(`generator.parameters.${key} is required`); }); validateBounds(generatorParameters, "generator.parameters");
  if (!isRecord(value.difficulty) || requireInteger(value.difficulty.band, "difficulty.band") < 1 || Number(value.difficulty.band) > 5) throw new QuestionValidationError("difficulty.band must be between 1 and 5");
  if (!Array.isArray(value.gameModes) || value.gameModes.length === 0 || new Set(value.gameModes).size !== value.gameModes.length) throw new QuestionValidationError("gameModes must be a non-empty unique array");
  if (!isRecord(value.modalities) || typeof value.modalities.audioSupported !== "boolean" || typeof value.modalities.requiresReading !== "boolean" || typeof value.modalities.visualSupported !== "boolean") throw new QuestionValidationError("modalities is incomplete");
  if (!isRecord(value.provenance) || typeof value.provenance.license !== "string" || !["original", "adapted", "copied", "aiDraft"].includes(String(value.provenance.origin))) throw new QuestionValidationError("provenance with origin and license is required");
  if (!isRecord(value.review) || !["draft", "validated", "reviewed", "retired"].includes(String(value.review.status))) throw new QuestionValidationError("review.status is invalid");
  if (value.review.status === "reviewed" && (typeof value.review.reviewer !== "string" || !value.review.reviewer.trim() || typeof value.review.reviewedAt !== "string" || Number.isNaN(Date.parse(value.review.reviewedAt)))) throw new QuestionValidationError("reviewed templates require reviewer and reviewedAt metadata");
  if (production && !productionStatuses.has(String(value.review.status))) throw new QuestionValidationError(`unreviewed template ${id} cannot enter a production bundle`);
  return value as unknown as QuestionTemplate;
}

export function validateQuestionTemplateBundle(values: unknown, standards: readonly Standard[], production = false): QuestionTemplate[] {
  if (!Array.isArray(values)) throw new QuestionValidationError("template bundle must be an array");
  const templates = values.map((template) => validateQuestionTemplate(template, standards, production)); const ids = templates.map((template) => template.id); if (new Set(ids).size !== ids.length) throw new QuestionValidationError("template IDs must be unique"); return templates;
}

export function validateQuestionInstance(instance: QuestionInstance): void {
  if (!instance.id || !instance.templateId || instance.standardIds.length === 0 || new Set(instance.standardIds).size !== instance.standardIds.length) throw new QuestionValidationError("instance identifiers or standard references are invalid");
  if (!instance.prompt.text || !instance.explanation || !instance.accessibility.textAlternative) throw new QuestionValidationError("instance requires prompt, explanation, and text alternative");
  if (instance.responseType === "singleChoice") { const choices = instance.interaction.choices; if (!Array.isArray(choices) || choices.length < 2) throw new QuestionValidationError("single-choice instance requires at least two choices"); const labels = choices.map((choice) => String((choice as Record<string, unknown>).label).trim().toLowerCase()); if (new Set(labels).size !== labels.length) throw new QuestionValidationError("duplicate or ambiguous choices are not allowed"); if (labels.filter((label) => label === String(instance.canonicalAnswer).trim().toLowerCase()).length !== 1) throw new QuestionValidationError("single-choice instance requires exactly one answer"); }
}

export async function loadAndValidateQuestionTemplates(path: string, standards: readonly Standard[], production = false): Promise<QuestionTemplate[]> {
  const parsed: unknown = JSON.parse(await readFile(resolve(path), "utf8")); return validateQuestionTemplateBundle(parsed, standards, production);
}
