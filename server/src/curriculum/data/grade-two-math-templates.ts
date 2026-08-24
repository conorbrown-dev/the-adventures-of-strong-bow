import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = {
  status: "reviewed" as const,
  reviewer: "Project content review",
  reviewedAt: "2026-08-24T00:00:00.000Z",
  note: "Project-reviewed Grade 2 auto-assessable mathematics content."
};

function skill(standardId: string, id: string): CatalogTemplate {
  return {
    id,
    standardId,
    grade: "2",
    subject: "math",
    generatorKind: "gradeTwoMath",
    responseType: "singleChoice",
    diagnosticEligible: true,
    audioSupported: true,
    provenance: "Project original",
    review: reviewed
  };
}

/** One independently answerable template for every Grade 2 mathematics target. */
export const gradeTwoMathTemplates: CatalogTemplate[] = [
  skill("2.OA.A.1", "2.oa.a.1.word-problems"),
  skill("2.OA.B.2", "2.oa.b.2.fluency-within-20"),
  skill("2.OA.C.3", "2.oa.c.3.odd-even"),
  skill("2.OA.C.4", "2.oa.c.4.arrays"),
  skill("2.NBT.A.1.a", "2.nbt.a.1.a.ten-tens"),
  skill("2.NBT.A.1.b", "2.nbt.a.1.b.hundreds"),
  skill("2.NBT.A.2", "2.nbt.a.2.skip-counting"),
  skill("2.NBT.A.3", "2.nbt.a.3.expanded-form"),
  skill("2.NBT.A.4", "2.nbt.a.4.compare-three-digit"),
  skill("2.NBT.B.5", "2.nbt.b.5.add-subtract-within-100"),
  skill("2.NBT.B.6", "2.nbt.b.6.four-addends"),
  skill("2.NBT.B.7", "2.nbt.b.7.add-subtract-within-1000"),
  skill("2.NBT.B.8", "2.nbt.b.8.ten-or-hundred-more-less"),
  skill("2.NBT.B.9", "2.nbt.b.9.place-value-strategy"),
  skill("2.MD.A.1", "2.md.a.1.measurement-tools"),
  skill("2.MD.A.2", "2.md.a.2.unit-size"),
  skill("2.MD.A.3", "2.md.a.3.estimate-length"),
  skill("2.MD.A.4", "2.md.a.4.length-difference"),
  skill("2.MD.B.5", "2.md.b.5.length-word-problems"),
  skill("2.MD.B.6", "2.md.b.6.number-lines"),
  skill("2.MD.C.7", "2.md.c.7.time-to-five"),
  skill("2.MD.C.8", "2.md.c.8.money"),
  skill("2.MD.D.9", "2.md.d.9.line-plots"),
  skill("2.MD.D.10", "2.md.d.10.bar-graphs"),
  skill("2.G.A.1", "2.g.a.1.shape-attributes"),
  skill("2.G.A.2", "2.g.a.2.rows-and-columns"),
  skill("2.G.A.3", "2.g.a.3.equal-shares")
];
