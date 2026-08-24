import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = {
  status: "reviewed" as const,
  reviewer: "Project content review",
  reviewedAt: "2026-08-24T00:00:00.000Z",
  note: "Project-reviewed Grade 2 independently assessable ELA content."
};

function skill(standardId: string, id: string): CatalogTemplate {
  return { id, standardId, grade: "2", subject: "ela", generatorKind: "gradeTwoEla", responseType: "singleChoice", diagnosticEligible: true, audioSupported: true, provenance: "Project original", review: reviewed };
}

export const gradeTwoElaTemplates: CatalogTemplate[] = [
  skill("2.L.1.a", "2.l.1.a.collective-nouns"), skill("2.L.1.b", "2.l.1.b.irregular-plurals"), skill("2.L.1.c", "2.l.1.c.reflexive-pronouns"), skill("2.L.1.d", "2.l.1.d.irregular-past-tense"), skill("2.L.1.e", "2.l.1.e.adjectives-adverbs"), skill("2.L.1.f", "2.l.1.f.complete-sentences"),
  skill("2.L.2.a", "2.l.2.a.proper-capitalization"), skill("2.L.2.b", "2.l.2.b.letter-commas"), skill("2.L.2.c", "2.l.2.c.apostrophes"), skill("2.L.2.d", "2.l.2.d.spelling-patterns"), skill("2.L.3.a", "2.l.3.a.formal-informal-language"),
  skill("2.L.4.a", "2.l.4.a.context-clues"), skill("2.L.4.b", "2.l.4.b.prefixes"), skill("2.L.4.c", "2.l.4.c.root-words"), skill("2.L.4.d", "2.l.4.d.compound-words"), skill("2.L.5.a", "2.l.5.a.real-life-word-connections"), skill("2.L.5.b", "2.l.5.b.shades-of-meaning"), skill("2.L.6", "2.l.6.acquired-words"),
  skill("2.RF.3.a", "2.rf.3.a.long-short-vowels"), skill("2.RF.3.b", "2.rf.3.b.vowel-teams"), skill("2.RF.3.c", "2.rf.3.c.two-syllable-long-vowels"), skill("2.RF.3.d", "2.rf.3.d.prefixes-suffixes"), skill("2.RF.3.e", "2.rf.3.e.common-irregular-words"), skill("2.RF.3.f", "2.rf.3.f.grade-two-irregular-words"),
  skill("2.RI.1", "2.ri.1.key-details"), skill("2.RI.2", "2.ri.2.main-topic"), skill("2.RI.3", "2.ri.3.connections"), skill("2.RI.4", "2.ri.4.subject-words"), skill("2.RI.5", "2.ri.5.text-features"), skill("2.RI.6", "2.ri.6.author-purpose"), skill("2.RI.7", "2.ri.7.images-and-diagrams"), skill("2.RI.8", "2.ri.8.reasons-and-points"), skill("2.RI.9", "2.ri.9.compare-information"),
  skill("2.RL.1", "2.rl.1.key-details"), skill("2.RL.2", "2.rl.2.lesson-or-moral"), skill("2.RL.3", "2.rl.3.character-response"), skill("2.RL.4", "2.rl.4.rhythm-and-meaning"), skill("2.RL.5", "2.rl.5.story-structure"), skill("2.RL.6", "2.rl.6.character-viewpoint"), skill("2.RL.7", "2.rl.7.words-and-illustrations"), skill("2.RL.9", "2.rl.9.compare-story-versions")
];
