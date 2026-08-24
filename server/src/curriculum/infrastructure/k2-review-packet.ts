import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generateQuestion } from "../application/question-generator";
import type { QuestionInstance, QuestionTemplate } from "../domain/question-template";
import type { Standard } from "../domain/standard";
import type { CatalogTemplate } from "./k2-content-catalog";

const seeds = Array.from({ length: 10 }, (_, index) => `review-${index + 1}`);
const auditSeeds = Array.from({ length: 1000 }, (_, index) => `audit-${index + 1}`);
const esc = (value: unknown) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
const json = (value: unknown) => esc(JSON.stringify(value, null, 2));
const childSkill: Record<string, string> = {
  "K.RF.1.d": "I can name uppercase and lowercase letters.", "K.RF.2.a": "I can hear and find words that rhyme.", "K.RF.2.d": "I can hear the first, middle, and last sounds in a word.", "K.CC.A.1": "I can say numbers in counting order.", "K.CC.A.2": "I can count forward from a number.", "K.CC.A.3": "I can name numbers and match them to quantities."
};

function parameters(template: CatalogTemplate): Record<string, unknown> {
  if (template.generatorKind === "gradeOneMath") return { skill: template.standardId };
  if (template.generatorKind === "gradeOneEla") return { skill: template.standardId };
  if (template.generatorKind === "gradeOneElaAdult") return { skill: template.standardId };
  if (template.generatorKind === "gradeTwoMath") return { skill: template.standardId };
  if (template.generatorKind === "gradeTwoEla") return { skill: template.standardId };
  if (template.generatorKind === "gradeTwoElaAdult") return { skill: template.standardId };
  if (template.generatorKind === "kindergartenMath") return { skill: template.standardId };
  if (template.generatorKind === "kindergartenEla") return { skill: template.standardId };
  if (template.generatorKind === "kindergartenElaAdult") return { skill: template.standardId };
  if (template.generatorKind === "oklahomaScienceAdult") return { skill: template.standardId };
  if (template.generatorKind === "matchUpperLowerLetters") return { pairCount: 3 };
  if (template.generatorKind === "rhymeChoice") return { wordFamilies: ["-at", "-an", "-ig", "-op", "-ug"], choiceCount: 3 };
  if (template.generatorKind === "cvcMedialVowel") return { vowels: ["a", "e", "i", "o", "u"], choiceCount: 3 };
  if (template.generatorKind === "nextNumber") return { minimum: template.id.includes("teen") ? 11 : 1, maximum: template.id.includes("teen") ? 20 : 20, choiceCount: 3 };
  if (template.generatorKind === "countVisualObjects") return { minimum: template.id.includes("zero") ? 0 : 1, maximum: 10, choiceCount: 3, objectKey: "star" };
  if (template.generatorKind === "letterIdentification") return { case: template.id.includes("uppercase") ? "upper" : "lower" };
  return {};
}

function prompt(template: CatalogTemplate): { text: string; audioText: string; instructions: string } {
  if (template.generatorKind === "gradeOneMath") return { text: "{{question}}", audioText: "{{question}}", instructions: "Choose one answer." };
  if (template.generatorKind === "gradeOneEla") return { text: "{{question}}", audioText: "{{question}}", instructions: "Choose one answer." };
  if (template.generatorKind === "gradeOneElaAdult") return { text: "{{question}}", audioText: "{{question}}", instructions: "An adult will listen and score this activity." };
  if (template.generatorKind === "gradeTwoMath") return { text: "{{question}}", audioText: "{{question}}", instructions: "Choose one answer." };
  if (template.generatorKind === "gradeTwoEla") return { text: "{{question}}", audioText: "{{question}}", instructions: "Choose one answer." };
  if (template.generatorKind === "gradeTwoElaAdult") return { text: "{{question}}", audioText: "{{question}}", instructions: "An adult will listen and score this activity." };
  if (template.generatorKind === "kindergartenMath") return { text: "{{question}}", audioText: "{{question}}", instructions: "Choose one answer." };
  if (template.generatorKind === "kindergartenEla") return { text: "{{question}}", audioText: "{{question}}", instructions: "Choose one answer." };
  if (template.generatorKind === "kindergartenElaAdult") return { text: "{{question}}", audioText: "{{question}}", instructions: "An adult will listen and score this activity." };
  if (template.generatorKind === "oklahomaScienceAdult") return { text: "{{question}}", audioText: "{{question}}", instructions: "Work with an adult, then have the adult score what you demonstrated." };
  if (template.generatorKind === "letterIdentification") return { text: template.id.includes("uppercase") ? "Which uppercase letter matches {{letter}}?" : "Which lowercase letter matches {{letter}}?", audioText: template.id.includes("uppercase") ? "Which uppercase letter matches {{letter}}?" : "Which lowercase letter matches {{letter}}?", instructions: "Choose one answer." };
  if (template.generatorKind === "matchUpperLowerLetters") return { text: "Sort the letters into uppercase and lowercase.", audioText: "Sort the letters into uppercase and lowercase.", instructions: "Put each letter in the right group." };
  if (template.generatorKind === "rhymeOddOne") return { text: "Which word does not rhyme?", audioText: "Which word does not rhyme?", instructions: "Choose one answer." };
  if (template.generatorKind === "rhymeChoice") return { text: "Which word rhymes with {{targetWord}}?", audioText: "Which word rhymes with {{targetWord}}?", instructions: "Choose one answer." };
  if (template.generatorKind === "cvcMedialVowel") return { text: "What is the middle vowel sound in {{word}}?", audioText: "Listen to the word {{word}}. What is the middle vowel sound?", instructions: "Choose one answer." };
  if (template.generatorKind === "cvcSound") return { text: "What is the {{position}} sound in {{word}}?", audioText: "Listen to the word {{word}}. What is the {{position}} sound?", instructions: "Choose one answer." };
  if (template.generatorKind === "silentEDecode") return { text: "Which word has a silent e?", audioText: "Which word has a silent e?", instructions: "Choose one answer." };
  if (template.generatorKind === "placeValueConstruction") return { text: "What number has {{tens}} tens and {{ones}} ones?", audioText: "What number has {{tens}} tens and {{ones}} ones?", instructions: "Choose one answer." };
  if (template.generatorKind === "countSequence") return { text: template.responseType === "sequence" ? "Put these numbers in counting order starting at {{start}}." : "What number comes after {{start}}?", audioText: template.responseType === "sequence" ? "Put these numbers in counting order." : "What number comes after {{start}}?", instructions: template.responseType === "sequence" ? "Put the numbers in order." : "Choose one answer." };
  if (template.generatorKind === "nextNumber") return { text: "What number comes after {{start}}?", audioText: "What number comes after {{start}}?", instructions: "Choose one answer." };
  return { text: "Count the stars. How many are there?", audioText: "Count the stars. How many are there?", instructions: "Choose one answer." };
}

export function catalogTemplateToQuestionTemplate(template: CatalogTemplate): QuestionTemplate {
  const words = prompt(template);
  return { schemaVersion: 1, id: template.id, version: 1, primaryStandardId: template.standardId, supportingStandardIds: [], subject: template.subject as QuestionTemplate["subject"], grade: template.grade as QuestionTemplate["grade"], responseType: template.responseType as QuestionTemplate["responseType"], prompt: words, generator: { kind: template.generatorKind, parameters: parameters(template) }, difficulty: { band: 1, dimensions: { seedVariation: true } }, gameModes: ["standaloneLearning"], modalities: { requiresReading: false, audioSupported: template.audioSupported, visualSupported: true }, diagnosticEligible: template.diagnosticEligible, provenance: { origin: "original", license: template.provenance }, review: { status: template.review.status, reviewer: template.review.reviewer ?? null, reviewedAt: template.review.reviewedAt ?? null, notes: template.review.note ?? null } };
}

function rendered(instance: QuestionInstance): string {
  const interaction = instance.interaction as { choices?: Array<{ label: string }>; visual?: unknown; left?: unknown; right?: unknown; items?: unknown; categories?: unknown; target?: unknown };
  const choices = interaction.choices?.map((choice, index) => `<li class="${String(instance.canonicalAnswer) === choice.label ? "correct" : ""}">${index + 1}. ${esc(choice.label)}</li>`).join("") ?? "";
  const details = interaction.choices ? `<ol>${choices}</ol>` : `<pre>${json({ items: interaction.items ?? interaction.left, categories: interaction.categories, right: interaction.right, solution: instance.canonicalAnswer })}</pre>`;
  const visual = interaction.visual as { count?: number } | undefined;
  const preview = visual ? `<p class="visual" aria-label="${visual.count} stars">${"★".repeat(visual.count ?? 0) || "(no stars)"}</p><p><b>Visual model:</b> ${json(visual)}</p>` : "";
  return `<article class="example"><h4>${esc(instance.seed)} · ${esc(instance.id)}</h4><p><b>Visual prompt:</b> ${esc(instance.prompt.text)}</p><p><b>Spoken prompt:</b> ${esc(instance.prompt.audioText ?? "Not applicable")}</p><p><b>Instructions:</b> ${esc(instance.prompt.instructions ?? "")}</p>${preview}${details}<p><b>Correct answer:</b> ${json(instance.canonicalAnswer)}</p><p><b>Explanation:</b> ${esc(instance.explanation)}</p><p><b>Target data:</b> ${json(interaction.target ?? null)}</p><p><b>Accessibility text:</b> ${esc(instance.accessibility.textAlternative)}</p></article>`;
}

export type ReviewPacketTemplate = { template: CatalogTemplate; standard: Pick<Standard, "statement" | "childFriendlyDescription">; examples: QuestionInstance[]; metrics: Record<string, unknown> };
export function createTemplateReview(template: CatalogTemplate, standard: Standard): ReviewPacketTemplate {
  const questionTemplate = catalogTemplateToQuestionTemplate(template); const examples = seeds.map((seed) => generateQuestion(questionTemplate, seed)); const audit = auditSeeds.map((seed) => generateQuestion(questionTemplate, seed));
  const unique = (values: unknown[]) => new Set(values.map((value) => JSON.stringify(value))).size;
  const positions = audit.reduce<Record<string, number>>((total, instance) => { const choices = (instance.interaction.choices as Array<{ label: string }> | undefined) ?? []; const index = choices.findIndex((choice) => String(choice.label) === String(instance.canonicalAnswer)); if (index >= 0) total[String(index + 1)] = (total[String(index + 1)] ?? 0) + 1; return total; }, {});
  const invalid = audit.filter((instance) => !instance.id || !instance.prompt.text || !instance.accessibility.textAlternative).length;
  return { template, standard, examples, metrics: { seedsTested: audit.length, effectiveUniqueInstanceCount: unique(audit.map((item) => ({ prompt: item.prompt, interaction: item.interaction, answer: item.canonicalAnswer }))), uniquePromptCount: unique(audit.map((item) => item.prompt.text)), uniqueCanonicalAnswerCount: unique(audit.map((item) => item.canonicalAnswer)), uniqueTargetCount: unique(audit.map((item) => (item.interaction as { target?: unknown }).target)), duplicateRate: 1 - unique(audit.map((item) => ({ prompt: item.prompt, interaction: item.interaction, answer: item.canonicalAnswer }))) / audit.length, uniqueDistractorSetCount: unique(audit.map((item) => (item.interaction as { choices?: unknown }).choices ?? [])), answerPositionDistribution: positions, invalidInstanceCount: invalid, validationWarnings: [], diagnosticIndependentProbeCapacity: template.diagnosticEligible ? "pending human approval" : "not eligible", coverageStateContribution: template.review.status === "reviewed" ? "eligible reviewed probe" : "validated draft only" } };
}

export async function writeReviewPacket(templates: CatalogTemplate[], standards: readonly Standard[], outputDirectory: string): Promise<{ html: string; json: string; reviews: ReviewPacketTemplate[] }> {
  const byId = new Map(standards.map((standard) => [standard.officialId, standard])); const reviews = templates.filter((template) => template.grade === "K" && ["validated", "reviewed"].includes(template.review.status)).map((template) => createTemplateReview(template, byId.get(template.standardId)!));
  if (reviews.some((review) => review.examples.length !== 10 || review.examples.some((example) => !example.id))) throw new Error("Review packet generation failed: every template must produce 10 valid examples.");
  const toc = reviews.map((review) => `<li><a href="#${esc(review.template.id)}">${esc(review.template.id)}</a></li>`).join("");
  const sections = reviews.map((review) => `<details id="${esc(review.template.id)}" data-standard="${esc(review.template.standardId)}" data-status="${esc(review.template.review.status)}"><summary>${esc(review.template.id)} — ${esc(review.template.review.status)}</summary><p><b>Standard:</b> ${esc(review.template.standardId)} — ${esc(review.standard.statement)}</p><p><b>Child-friendly skill:</b> ${esc(review.standard.childFriendlyDescription ?? childSkill[review.template.standardId])}</p><p><b>Version:</b> 1 | <b>Generator:</b> ${esc(review.template.generatorKind)} | <b>Response:</b> ${esc(review.template.responseType)} | <b>Difficulty:</b> band 1, seeded variation | <b>Diagnostic:</b> ${String(review.template.diagnosticEligible)} | <b>Game modes:</b> none | <b>Accessibility:</b> audio ${String(review.template.audioSupported)}, reading not required | <b>Provenance:</b> ${esc(review.template.provenance)} | <b>Status:</b> ${esc(review.template.review.status)}</p><h3>Generated examples</h3>${review.examples.map(rendered).join("")}<h3>Validation evidence</h3><pre>${json(review.metrics)}</pre><p>Review action: <code>npm run curriculum:content:approve -- --template ${esc(review.template.id)} --reviewer "Name"</code></p></details>`).join("");
  await mkdir(outputDirectory, { recursive: true }); const html = resolve(outputDirectory, "kindergarten-review-packet.html"); const jsonPath = resolve(outputDirectory, "kindergarten-review-packet.json");
  await writeFile(html, `<!doctype html><html><head><meta charset="utf-8"><title>Kindergarten curriculum review packet</title><style>body{font:16px system-ui;margin:2rem;max-width:1100px}details{border:1px solid #aaa;padding:1rem;margin:1rem 0}summary{font-weight:700;cursor:pointer}.example{border-top:1px solid #ddd;padding:.75rem}.correct{background:#c8f7d0;font-weight:700}.visual{font-size:1.5rem;color:#d49500;letter-spacing:.15rem}pre{white-space:pre-wrap}@media print{details{display:block}summary{list-style:none}.filters{display:none}}</style></head><body><h1>Kindergarten curriculum review packet</h1><p>Validated and reviewed templates include deterministic generated instances and audit evidence. Audio text is shown for model-TTS preview; the report has no server dependency.</p><p class="filters"><label>Standard <select id="standard"><option value="">All</option>${[...new Set(reviews.map((review) => review.template.standardId))].map((id) => `<option>${esc(id)}</option>`).join("")}</select></label> <label>Status <select id="status"><option value="">All</option><option>validated</option><option>reviewed</option></select></label></p><h2>Contents</h2><ol>${toc}</ol>${sections}<script>for(const e of document.querySelectorAll('select'))e.onchange=()=>{const a=document.querySelector('#standard').value,b=document.querySelector('#status').value;for(const d of document.querySelectorAll('details'))d.hidden=!!(a&&d.dataset.standard!==a||b&&d.dataset.status!==b)}</script></body></html>`, "utf8");
  await writeFile(jsonPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), seeds, reviews }, null, 2)}\n`, "utf8"); return { html, json: jsonPath, reviews };
}
