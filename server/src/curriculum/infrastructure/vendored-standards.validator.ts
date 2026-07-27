import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  CURRICULUM_GRADES,
  CURRICULUM_SUBJECTS,
  INSTRUCTIONAL_STATUSES,
  type Standard
} from "../domain/standard";
import { CurriculumImportError } from "../domain/curriculum-import.error";

const EXPECTED_RECORD_COUNT = 695;

interface ManifestFile {
  sha256: string;
  bytes: number;
}

interface StandardsManifest {
  schemaVersion: number;
  recordCount: number;
  files: Record<string, ManifestFile>;
}

interface StandardsDocument {
  schemaVersion: number;
  title: string;
  copyrightNotice: string;
  recordCount: number;
  records: unknown[];
}

export interface ValidatedStandardsDataset {
  records: Standard[];
  manifest: StandardsManifest;
  copyrightNotice: string;
}

export interface CurriculumPaths {
  root: string;
  standards: string;
  manifest: string;
  recoverySource: string;
}

export function getCurriculumPaths(start = process.cwd()): CurriculumPaths {
  let root = resolve(start);
  while (!existsSync(resolve(root, "data", "curriculum", "generated", "common-core-k5-standards.json"))) {
    const parent = dirname(root);
    if (parent === root) throw new CurriculumImportError("Could not locate the vendored curriculum dataset.");
    root = parent;
  }
  return {
    root,
    standards: resolve(root, "data/curriculum/generated/common-core-k5-standards.json"),
    manifest: resolve(root, "data/curriculum/generated/common-core-k5-manifest.json"),
    recoverySource: resolve(root, "resources/raw/ccss-recovery-source-philngo-rev-02895145.csv")
  };
}

export async function loadAndValidateVendoredStandards(paths = getCurriculumPaths()): Promise<ValidatedStandardsDataset> {
  const [standardsText, manifestText] = await Promise.all([readFile(paths.standards, "utf8"), readFile(paths.manifest, "utf8")]);
  const document = parseJson<StandardsDocument>(standardsText, "standards dataset");
  const manifest = parseJson<StandardsManifest>(manifestText, "standards manifest");
  await validateManifest(paths, manifest);

  if (document.schemaVersion !== 1 || manifest.schemaVersion !== 1) {
    throw new CurriculumImportError("Unsupported curriculum dataset schema version.");
  }
  if (document.recordCount !== EXPECTED_RECORD_COUNT || manifest.recordCount !== EXPECTED_RECORD_COUNT || document.records.length !== EXPECTED_RECORD_COUNT) {
    throw new CurriculumImportError(`Expected ${EXPECTED_RECORD_COUNT} vendored K-5 standards.`);
  }
  if (!document.copyrightNotice.trim()) throw new CurriculumImportError("Missing Common Core copyright notice.");

  const records = document.records.map((record, index) => validateStandard(record, index));
  validateCollection(records);
  return { records, manifest, copyrightNotice: document.copyrightNotice };
}

function parseJson<T>(text: string, label: string): T {
  try { return JSON.parse(text) as T; }
  catch { throw new CurriculumImportError(`Malformed ${label} JSON.`); }
}

async function validateManifest(paths: CurriculumPaths, manifest: StandardsManifest): Promise<void> {
  const standardsFile = manifest.files["common-core-k5-standards.json"];
  if (!standardsFile) throw new CurriculumImportError("Manifest is missing required standards dataset metadata.");
  // The recovery CSV documents how this immutable artifact was built. Runtime
  // must validate the shipped artifact itself and must not depend on recovery
  // inputs that are not needed to serve curriculum content.
  await validateFileHash(paths.standards, standardsFile, "standards dataset");
}

async function validateFileHash(path: string, expected: ManifestFile, label: string): Promise<void> {
  const bytes = await readFile(path);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (bytes.byteLength !== expected.bytes || sha256 !== expected.sha256) {
    throw new CurriculumImportError(`Manifest validation failed for ${label}.`);
  }
}

function validateStandard(value: unknown, index: number): Standard {
  if (!isRecord(value)) throw new CurriculumImportError(`Standard at index ${index} must be an object.`);
  const allowedFields = new Set([
    "schemaVersion", "officialId", "canonicalId", "subject", "grade", "gradeName", "domainCode", "domain", "strand", "clusterCode", "parentId", "sourceItem", "statement", "childFriendlyDescription", "isLeaf", "instructionalStatus", "prerequisiteIds", "tags", "source", "license", "active"
  ]);
  Object.keys(value).forEach((field) => {
    if (!allowedFields.has(field)) throw new CurriculumImportError(`Unexpected standard field ${field} at index ${index}.`);
  });
  const record = value as Partial<Standard>;
  const requiredStrings = ["officialId", "canonicalId", "gradeName", "domainCode", "domain", "statement"] as const;
  requiredStrings.forEach((field) => requireString(record[field], `${field} at index ${index}`));
  if (record.schemaVersion !== 1) throw new CurriculumImportError(`Invalid schemaVersion at index ${index}.`);
  if (!CURRICULUM_SUBJECTS.includes(record.subject as Standard["subject"])) throw new CurriculumImportError(`Invalid subject at index ${index}.`);
  if (!CURRICULUM_GRADES.includes(record.grade as Standard["grade"])) throw new CurriculumImportError(`Invalid grade at index ${index}.`);
  if (!INSTRUCTIONAL_STATUSES.includes(record.instructionalStatus as Standard["instructionalStatus"])) throw new CurriculumImportError(`Invalid instructional status at index ${index}.`);
  if (typeof record.isLeaf !== "boolean" || typeof record.active !== "boolean") throw new CurriculumImportError(`Invalid leaf or active flag at index ${index}.`);
  if (!isNullableString(record.strand) || !isNullableString(record.clusterCode) || !isNullableString(record.parentId) || !isNullableString(record.sourceItem) || !isNullableString(record.childFriendlyDescription)) throw new CurriculumImportError(`Invalid hierarchy metadata at index ${index}.`);
  if (!isStringArray(record.prerequisiteIds) || !isStringArray(record.tags)) throw new CurriculumImportError(`Invalid standard metadata array at index ${index}.`);
  if (!isSource(record.source) || !isLicense(record.license)) throw new CurriculumImportError(`Missing source or license provenance at index ${index}.`);
  return record as Standard;
}

function validateCollection(records: Standard[]): void {
  const officialIds = new Set<string>();
  const canonicalIds = new Set<string>();
  const recordsById = new Set(records.map((record) => record.officialId));
  records.forEach((record) => {
    if (officialIds.has(record.officialId) || canonicalIds.has(record.canonicalId)) throw new CurriculumImportError(`Duplicate standard identifier: ${record.officialId}.`);
    officialIds.add(record.officialId);
    canonicalIds.add(record.canonicalId);
    if (record.parentId && !recordsById.has(record.parentId)) throw new CurriculumImportError(`Missing parent ${record.parentId} for ${record.officialId}.`);
  });
}

function requireString(value: unknown, label: string): void { if (typeof value !== "string" || !value.trim()) throw new CurriculumImportError(`Missing ${label}.`); }
function isNullableString(value: unknown): value is string | null { return value === null || typeof value === "string"; }
function isStringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every((item) => typeof item === "string") && new Set(value).size === value.length; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isSource(value: unknown): boolean { return isRecord(value) && ["publisher", "package", "reference", "recoverySourceUrl", "recoveryRevision", "officialReferencePdf", "verification"].every((key) => typeof value[key] === "string" && value[key].trim()); }
function isLicense(value: unknown): boolean { return isRecord(value) && typeof value.name === "string" && !!value.name.trim() && typeof value.notice === "string" && !!value.notice.trim(); }
