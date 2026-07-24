import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importVendoredStandards } from "./import-vendored-standards";
import type { StandardRepository } from "../domain/standard.repository";
import type { Standard } from "../domain/standard";
import { CurriculumImportError } from "../domain/curriculum-import.error";
import { getCurriculumPaths, loadAndValidateVendoredStandards, type CurriculumPaths } from "../infrastructure/vendored-standards.validator";

class InMemoryStandardRepository implements StandardRepository {
  readonly standards = new Map<string, Standard>();
  async upsert(standard: Standard): Promise<void> { this.standards.set(standard.officialId, structuredClone(standard)); }
  async findByOfficialId(officialId: string): Promise<Standard | null> { return this.standards.get(officialId) ?? null; }
  async count(): Promise<number> { return this.standards.size; }
  async countByGradeAndSubject(): Promise<Record<string, number>> { return [...this.standards.values()].reduce<Record<string, number>>((counts, standard) => { const key = `${standard.subject}:${standard.grade}`; counts[key] = (counts[key] ?? 0) + 1; return counts; }, {}); }
  async listQuizTargets(): Promise<Standard[]> { return [...this.standards.values()].filter((standard) => standard.active && standard.isLeaf && standard.instructionalStatus === "assessable"); }
}

describe("vendored Common Core K-5 importer", () => {
  it("validates and imports all 695 records with unique identifiers", async () => {
    const dataset = await loadAndValidateVendoredStandards();
    expect(dataset.records).toHaveLength(695);
    expect(new Set(dataset.records.map((record) => record.officialId)).size).toBe(695);
    expect(new Set(dataset.records.map((record) => record.canonicalId)).size).toBe(695);
    expect(dataset.records.filter((record) => record.active && record.isLeaf && record.instructionalStatus === "assessable")).toHaveLength(601);
  });

  it("is idempotent and retains inactive placeholders outside quiz targets", async () => {
    const repository = new InMemoryStandardRepository();
    const first = await importVendoredStandards(repository);
    const second = await importVendoredStandards(repository);
    expect(first.imported).toBe(695);
    expect(second.imported).toBe(695);
    expect(await repository.count()).toBe(695);
    expect((await repository.listQuizTargets()).every((record) => record.active && record.instructionalStatus === "assessable")).toBe(true);
  });

  it("rejects duplicate official identifiers", async () => {
    await expect(withMutatedDataset((document) => { document.records[1] = { ...document.records[1], officialId: document.records[0].officialId }; })).rejects.toBeInstanceOf(CurriculumImportError);
  });

  it("rejects malformed records missing required provenance", async () => {
    await expect(withMutatedDataset((document) => { delete document.records[0].source; })).rejects.toBeInstanceOf(CurriculumImportError);
  });

  it("rejects records that violate the standard schema shape", async () => {
    await expect(withMutatedDataset((document) => { document.records[0].unexpected = true; })).rejects.toBeInstanceOf(CurriculumImportError);
  });

  it("rejects hierarchy records with a missing parent", async () => {
    await expect(withMutatedDataset((document) => { document.records[1] = { ...document.records[1], parentId: "missing.parent" }; })).rejects.toBeInstanceOf(CurriculumImportError);
  });
});

async function withMutatedDataset(mutate: (document: { records: Array<Record<string, unknown>> }) => void): Promise<void> {
  const sourcePaths = getCurriculumPaths();
  const directory = await mkdtemp(join(tmpdir(), "molly-curriculum-test-"));
  try {
    const standards = JSON.parse(await readFile(sourcePaths.standards, "utf8")) as { records: Array<Record<string, unknown>> };
    mutate(standards);
    const standardsText = `${JSON.stringify(standards)}\n`;
    const recoveryBytes = await readFile(sourcePaths.recoverySource);
    const manifest = JSON.parse(await readFile(sourcePaths.manifest, "utf8")) as { files: Record<string, { sha256: string; bytes: number }> };
    manifest.files["common-core-k5-standards.json"] = fileMetadata(Buffer.from(standardsText));
    manifest.files["ccss-recovery-source-philngo-rev-02895145.csv"] = fileMetadata(recoveryBytes);
    const paths: CurriculumPaths = { root: directory, standards: join(directory, "standards.json"), manifest: join(directory, "manifest.json"), recoverySource: join(directory, "recovery.csv") };
    await Promise.all([writeFile(paths.standards, standardsText), writeFile(paths.manifest, JSON.stringify(manifest)), writeFile(paths.recoverySource, recoveryBytes)]);
    await loadAndValidateVendoredStandards(paths);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function fileMetadata(bytes: Buffer): { sha256: string; bytes: number } {
  return { sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.byteLength };
}
