import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = { status: "reviewed" as const, reviewer: "Project content review", reviewedAt: "2026-07-29T00:00:00.000Z", note: "Project-reviewed Grade 1 ELA performance assessment; adult scoring required." };
const skill = (standardId: string, id: string): CatalogTemplate => ({ id, standardId, grade: "1", subject: "ela", generatorKind: "gradeOneElaAdult", responseType: "constructedResponse", diagnosticEligible: false, audioSupported: true, provenance: "Project original", review: reviewed });

export const gradeOneElaAdultTemplates: CatalogTemplate[] = [
  skill("1.L.1.a", "1.l.1.a.handwriting"), skill("1.L.1.j", "1.l.1.j.complete-sentences"), skill("1.L.2.e", "1.l.2.e.phonetic-spelling"), skill("1.L.5.c", "1.l.5.c.real-life-words"),
  skill("1.RF.4.a", "1.rf.4.a.reading-purpose"), skill("1.RF.4.b", "1.rf.4.b.oral-fluency"), skill("1.RF.4.c", "1.rf.4.c.self-correction"), skill("1.RI.10", "1.ri.10.informational-reading"), skill("1.RL.10", "1.rl.10.literature-reading"),
  skill("1.SL.1.a", "1.sl.1.a.discussion-rules"), skill("1.SL.1.b", "1.sl.1.b.conversation-response"), skill("1.SL.1.c", "1.sl.1.c.clarifying-question"), skill("1.SL.2", "1.sl.2.read-aloud-details"), skill("1.SL.3", "1.sl.3.speaker-questions"), skill("1.SL.4", "1.sl.4.describe-details"), skill("1.SL.5", "1.sl.5.visual-support"), skill("1.SL.6", "1.sl.6.complete-sentences"),
  skill("1.W.1", "1.w.1.opinion-writing"), skill("1.W.2", "1.w.2.informative-writing"), skill("1.W.3", "1.w.3.narrative-writing"), skill("1.W.5", "1.w.5.revise-writing"), skill("1.W.6", "1.w.6.publish-writing"), skill("1.W.7", "1.w.7.shared-research"), skill("1.W.8", "1.w.8.gather-information")
];
