import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = { status: "reviewed" as const, reviewer: "Project content review", reviewedAt: "2026-07-29T00:00:00.000Z", note: "Project-reviewed Grade 1 auto-assessable mathematics content." };

const skill = (standardId: string, id: string): CatalogTemplate => ({ id, standardId, grade: "1", subject: "math", generatorKind: "gradeOneMath", responseType: "singleChoice", diagnosticEligible: true, audioSupported: true, provenance: "Project original", review: reviewed });

export const gradeOneMathTemplates: CatalogTemplate[] = [
  skill("1.OA.A.1", "1.oa.a.1.word-problem"), skill("1.OA.A.2", "1.oa.a.2.three-addends"), skill("1.OA.B.3", "1.oa.b.3.properties"), skill("1.OA.B.4", "1.oa.b.4.unknown-addend"), skill("1.OA.C.5", "1.oa.c.5.counting-on"), skill("1.OA.C.6", "1.oa.c.6.fluency"), skill("1.OA.D.7", "1.oa.d.7.equal-sign"), skill("1.OA.D.8", "1.oa.d.8.unknown-equation"),
  skill("1.NBT.A.1", "1.nbt.a.1.count-to-120"), skill("1.NBT.B.2.a", "1.nbt.b.2.a.ten-ones"), skill("1.NBT.B.2.b", "1.nbt.b.2.b.teen-tens"), skill("1.NBT.B.2.c", "1.nbt.b.2.c.tens"), skill("1.NBT.B.3", "1.nbt.b.3.compare"), skill("1.NBT.C.4", "1.nbt.c.4.add-within-100"), skill("1.NBT.C.5", "1.nbt.c.5.ten-more-less"), skill("1.NBT.C.6", "1.nbt.c.6.subtract-tens"),
  skill("1.MD.A.1", "1.md.a.1.compare-length"), skill("1.MD.A.2", "1.md.a.2.measure-length"), skill("1.MD.B.3", "1.md.b.3.time"), skill("1.MD.C.4", "1.md.c.4.data"),
  skill("1.G.A.1", "1.g.a.1.shape-attributes"), skill("1.G.A.2", "1.g.a.2.compose-shapes"), skill("1.G.A.3", "1.g.a.3.equal-shares")
];
