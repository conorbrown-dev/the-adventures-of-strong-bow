import { kindergartenCoverageReport, loadK2ContentCatalog, validateK2ContentCatalog } from "./k2-content-catalog";

describe("Kindergarten production content catalog", () => {
  it("validates the catalog and preserves human review boundaries", async () => {
    const catalog = await loadK2ContentCatalog();
    await expect(validateK2ContentCatalog()).resolves.toMatchObject({ templates: expect.any(Number) });
    const kindergarten = catalog.templates.filter((template) => template.grade === "K");
    expect(kindergarten).toHaveLength(27);
    expect(kindergarten.filter((template) => template.review.status === "validated")).toHaveLength(24);
    expect(kindergarten.filter((template) => template.review.status === "reviewed").map((template) => template.id)).toEqual([
      "k.rf.1.d.letter-match", "k.rf.2.a.rhyme", "k.cc.a.2.next-number"
    ]);
  });

  it("does not claim diagnostic readiness until four probes receive human approval", async () => {
    const coverage = await kindergartenCoverageReport();
    expect(Object.keys(coverage)).toEqual(["K.RF.1.d", "K.RF.2.a", "K.RF.2.d", "K.CC.A.1", "K.CC.A.2", "K.CC.A.3"]);
    for (const item of Object.values(coverage)) {
      expect(item.total).toBeGreaterThanOrEqual(4);
      expect(item.status).toBe("awaiting-human-review");
    }
  });
});
