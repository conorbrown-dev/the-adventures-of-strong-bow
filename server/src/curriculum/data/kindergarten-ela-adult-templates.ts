import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = {
  status: "reviewed" as const,
  reviewer: "Project content review",
  reviewedAt: "2026-08-24T00:00:00.000Z",
  note: "Project-reviewed Kindergarten ELA performance assessment; adult scoring required."
};

function skill(standardId: string, id: string): CatalogTemplate {
  return { id, standardId, grade: "K", subject: "ela", generatorKind: "kindergartenElaAdult", responseType: "constructedResponse", diagnosticEligible: false, audioSupported: true, provenance: "Project original", review: reviewed };
}

/** Skills that need an adult to observe speaking, handwriting, reading fluency, or open-ended composition. */
export const kindergartenElaAdultTemplates: CatalogTemplate[] = [
  skill("K.L.1.a", "k.l.1.a.printing-letters"), skill("K.L.1.f", "k.l.1.f.complete-sentences"), skill("K.RF.4", "k.rf.4.reading-fluency"), skill("K.RI.10", "k.ri.10.informational-comprehension"), skill("K.RL.10", "k.rl.10.literature-comprehension"),
  skill("K.SL.1.a", "k.sl.1.a.discussion-rules"), skill("K.SL.1.b", "k.sl.1.b.conversation"), skill("K.SL.2", "k.sl.2.confirm-understanding"), skill("K.SL.3", "k.sl.3.ask-answer-questions"), skill("K.SL.4", "k.sl.4.describe-people-places-things"), skill("K.SL.5", "k.sl.5.add-visuals"), skill("K.SL.6", "k.sl.6.speak-clearly"),
  skill("K.W.1", "k.w.1.opinion-writing"), skill("K.W.2", "k.w.2.informative-writing"), skill("K.W.3", "k.w.3.narrative-writing"), skill("K.W.5", "k.w.5.respond-to-feedback"), skill("K.W.6", "k.w.6.digital-publishing"), skill("K.W.7", "k.w.7.shared-research"), skill("K.W.8", "k.w.8.recall-information")
];
