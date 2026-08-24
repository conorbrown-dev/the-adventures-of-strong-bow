import type { CatalogTemplate } from "../infrastructure/k2-content-catalog";

const reviewed = {
  status: "reviewed" as const,
  reviewer: "Project content review",
  reviewedAt: "2026-08-24T00:00:00.000Z",
  note: "Project-reviewed Kindergarten independently assessable ELA content."
};

function skill(standardId: string, id: string): CatalogTemplate {
  return { id, standardId, grade: "K", subject: "ela", generatorKind: "kindergartenEla", responseType: "singleChoice", diagnosticEligible: true, audioSupported: true, provenance: "Project original", review: reviewed };
}

/** Kindergarten ELA targets that can be assessed with a clear, spoken single-choice prompt. */
export const kindergartenElaTemplates: CatalogTemplate[] = [
  skill("K.L.1.b", "k.l.1.b.nouns-verbs"), skill("K.L.1.c", "k.l.1.c.plural-nouns"), skill("K.L.1.d", "k.l.1.d.prepositions"), skill("K.L.1.e", "k.l.1.e.question-words"),
  skill("K.L.2.a", "k.l.2.a.capitalization"), skill("K.L.2.b", "k.l.2.b.punctuation"), skill("K.L.2.c", "k.l.2.c.cvc-spelling"), skill("K.L.2.d", "k.l.2.d.conventional-spelling"),
  skill("K.L.4.a", "k.l.4.a.context-clues"), skill("K.L.4.b", "k.l.4.b.word-parts"), skill("K.L.5.a", "k.l.5.a.sorting"), skill("K.L.5.b", "k.l.5.b.attributes"), skill("K.L.5.c", "k.l.5.c.opposites"), skill("K.L.5.d", "k.l.5.d.real-life-connections"), skill("K.L.6", "k.l.6.new-words"),
  skill("K.RF.1.a", "k.rf.1.a.book-parts"), skill("K.RF.1.b", "k.rf.1.b.print-direction"), skill("K.RF.1.c", "k.rf.1.c.words-and-sentences"), skill("K.RF.2.b", "k.rf.2.b.alliteration"), skill("K.RF.2.c", "k.rf.2.c.blending-segmenting"), skill("K.RF.2.e", "k.rf.2.e.sound-substitution"), skill("K.RF.3.a", "k.rf.3.a.letter-sounds"), skill("K.RF.3.b", "k.rf.3.b.common-sounds"), skill("K.RF.3.c", "k.rf.3.c.decode-cvc"), skill("K.RF.3.d", "k.rf.3.d.high-frequency-words"),
  skill("K.RI.1", "k.ri.1.ask-answer-details"), skill("K.RI.2", "k.ri.2.main-topic"), skill("K.RI.3", "k.ri.3.connections"), skill("K.RI.4", "k.ri.4.unknown-words"), skill("K.RI.5", "k.ri.5.text-parts"), skill("K.RI.6", "k.ri.6.author-illustrator"), skill("K.RI.7", "k.ri.7.illustrations"), skill("K.RI.8", "k.ri.8.reasons"), skill("K.RI.9", "k.ri.9.compare-texts"),
  skill("K.RL.1", "k.rl.1.ask-answer-details"), skill("K.RL.2", "k.rl.2.recount-story"), skill("K.RL.3", "k.rl.3.story-elements"), skill("K.RL.4", "k.rl.4.unknown-words"), skill("K.RL.5", "k.rl.5.story-parts"), skill("K.RL.6", "k.rl.6.author-illustrator"), skill("K.RL.7", "k.rl.7.illustrations"), skill("K.RL.9", "k.rl.9.compare-characters")
];
