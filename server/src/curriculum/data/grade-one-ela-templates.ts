import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = { status: "reviewed" as const, reviewer: "Project content review", reviewedAt: "2026-07-29T00:00:00.000Z", note: "Project-reviewed Grade 1 independently assessable ELA content." };

const skill = (standardId: string, id: string): CatalogTemplate => ({ id, standardId, grade: "1", subject: "ela", generatorKind: "gradeOneEla", responseType: "singleChoice", diagnosticEligible: true, audioSupported: true, provenance: "Project original", review: reviewed });

export const gradeOneElaTemplates: CatalogTemplate[] = [
  skill("1.L.1.b", "1.l.1.b.nouns"), skill("1.L.1.c", "1.l.1.c.noun-verb-agreement"), skill("1.L.1.d", "1.l.1.d.pronouns"), skill("1.L.1.e", "1.l.1.e.verb-tense"), skill("1.L.1.f", "1.l.1.f.adjectives"), skill("1.L.1.g", "1.l.1.g.conjunctions"), skill("1.L.1.h", "1.l.1.h.determiners"), skill("1.L.1.i", "1.l.1.i.prepositions"),
  skill("1.L.2.a", "1.l.2.a.capitalization"), skill("1.L.2.b", "1.l.2.b.end-punctuation"), skill("1.L.2.c", "1.l.2.c.commas"), skill("1.L.2.d", "1.l.2.d.spelling-patterns"),
  skill("1.L.4.a", "1.l.4.a.context-clues"), skill("1.L.4.b", "1.l.4.b.affixes"), skill("1.L.4.c", "1.l.4.c.root-words"), skill("1.L.5.a", "1.l.5.a.categories"), skill("1.L.5.b", "1.l.5.b.word-definitions"), skill("1.L.5.d", "1.l.5.d.shades-of-meaning"), skill("1.L.6", "1.l.6.acquired-words"),
  skill("1.RF.1.a", "1.rf.1.a.sentence-features"), skill("1.RF.2.a", "1.rf.2.a.vowel-sounds"), skill("1.RF.2.b", "1.rf.2.b.blending"), skill("1.RF.2.c", "1.rf.2.c.isolate-phonemes"), skill("1.RF.2.d", "1.rf.2.d.segment-phonemes"),
  skill("1.RF.3.a", "1.rf.3.a.digraphs"), skill("1.RF.3.b", "1.rf.3.b.one-syllable-decode"), skill("1.RF.3.c", "1.rf.3.c.long-vowels"), skill("1.RF.3.d", "1.rf.3.d.syllables"), skill("1.RF.3.e", "1.rf.3.e.two-syllable-decode"), skill("1.RF.3.f", "1.rf.3.f.inflectional-endings"), skill("1.RF.3.g", "1.rf.3.g.irregular-words")
  , skill("1.RI.1", "1.ri.1.key-details"), skill("1.RI.2", "1.ri.2.main-topic"), skill("1.RI.3", "1.ri.3.connections"), skill("1.RI.4", "1.ri.4.word-meaning"), skill("1.RI.5", "1.ri.5.text-features"), skill("1.RI.6", "1.ri.6.words-and-pictures"), skill("1.RI.7", "1.ri.7.illustration-details"), skill("1.RI.8", "1.ri.8.reasons"), skill("1.RI.9", "1.ri.9.compare-texts")
  , skill("1.RL.1", "1.rl.1.key-details"), skill("1.RL.2", "1.rl.2.lesson"), skill("1.RL.3", "1.rl.3.story-elements"), skill("1.RL.4", "1.rl.4.feeling-words"), skill("1.RL.5", "1.rl.5.text-types"), skill("1.RL.6", "1.rl.6.narrator"), skill("1.RL.7", "1.rl.7.story-illustrations"), skill("1.RL.9", "1.rl.9.compare-characters")
];
