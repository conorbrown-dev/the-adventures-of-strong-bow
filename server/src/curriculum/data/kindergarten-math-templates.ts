import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = {
  status: "reviewed" as const,
  reviewer: "Project content review",
  reviewedAt: "2026-08-24T00:00:00.000Z",
  note: "Project-reviewed Kindergarten auto-assessable mathematics content."
};

function skill(standardId: string, id: string): CatalogTemplate {
  return { id, standardId, grade: "K", subject: "math", generatorKind: "kindergartenMath", responseType: "singleChoice", diagnosticEligible: true, audioSupported: true, provenance: "Project original", review: reviewed };
}

/** Fills every Kindergarten mathematics target not covered by the original reviewed probes. */
export const kindergartenMathTemplates: CatalogTemplate[] = [
  skill("K.CC.B.4.a", "k.cc.b.4.a.one-to-one-counting"), skill("K.CC.B.4.b", "k.cc.b.4.b.last-number-counted"), skill("K.CC.B.4.c", "k.cc.b.4.c.one-more"), skill("K.CC.B.5", "k.cc.b.5.count-how-many"), skill("K.CC.C.6", "k.cc.c.6.compare-groups"), skill("K.CC.C.7", "k.cc.c.7.compare-numerals"),
  skill("K.G.A.1", "k.g.a.1.positions-and-shapes"), skill("K.G.A.2", "k.g.a.2.name-shapes"), skill("K.G.A.3", "k.g.a.3.flat-and-solid"), skill("K.G.B.4", "k.g.b.4.compare-shapes"), skill("K.G.B.5", "k.g.b.5.build-shapes"), skill("K.G.B.6", "k.g.b.6.compose-shapes"),
  skill("K.MD.A.1", "k.md.a.1.measurable-attributes"), skill("K.MD.A.2", "k.md.a.2.compare-measurement"), skill("K.MD.B.3", "k.md.b.3.sort-and-count"), skill("K.NBT.A.1", "k.nbt.a.1.ten-and-ones"),
  skill("K.OA.A.1", "k.oa.a.1.represent-operations"), skill("K.OA.A.2", "k.oa.a.2.word-problems"), skill("K.OA.A.3", "k.oa.a.3.decompose-numbers"), skill("K.OA.A.4", "k.oa.a.4.make-ten"), skill("K.OA.A.5", "k.oa.a.5.fluency-within-five")
];
