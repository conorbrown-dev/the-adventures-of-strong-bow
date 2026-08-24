import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = {
  status: "reviewed" as const,
  reviewer: "Project content review",
  reviewedAt: "2026-08-24T00:00:00.000Z",
  note: "Project-reviewed Grade 2 ELA performance assessment; adult scoring required."
};

function skill(standardId: string, id: string): CatalogTemplate {
  return { id, standardId, grade: "2", subject: "ela", generatorKind: "gradeTwoElaAdult", responseType: "constructedResponse", diagnosticEligible: false, audioSupported: true, provenance: "Project original", review: reviewed };
}

export const gradeTwoElaAdultTemplates: CatalogTemplate[] = [
  skill("2.L.2.e", "2.l.2.e.dictionary-spelling"), skill("2.L.4.e", "2.l.4.e.glossary-dictionary"),
  skill("2.RF.4.a", "2.rf.4.a.reading-purpose"), skill("2.RF.4.b", "2.rf.4.b.oral-fluency"), skill("2.RF.4.c", "2.rf.4.c.self-correction"), skill("2.RI.10", "2.ri.10.informational-comprehension"), skill("2.RL.10", "2.rl.10.literature-comprehension"),
  skill("2.SL.1.a", "2.sl.1.a.discussion-rules"), skill("2.SL.1.b", "2.sl.1.b.build-on-talk"), skill("2.SL.1.c", "2.sl.1.c.ask-for-clarification"), skill("2.SL.2", "2.sl.2.recount-information"), skill("2.SL.3", "2.sl.3.speaker-questions"), skill("2.SL.4", "2.sl.4.recount-experience"), skill("2.SL.5", "2.sl.5.audio-and-visual-support"), skill("2.SL.6", "2.sl.6.complete-sentences"),
  skill("2.W.1", "2.w.1.opinion-writing"), skill("2.W.2", "2.w.2.informative-writing"), skill("2.W.3", "2.w.3.narrative-writing"), skill("2.W.5", "2.w.5.revise-and-edit"), skill("2.W.6", "2.w.6.publish-writing"), skill("2.W.7", "2.w.7.shared-research"), skill("2.W.8", "2.w.8.gather-information")
];
