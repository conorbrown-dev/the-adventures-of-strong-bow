import type { Standard } from "../domain/standard";

const sourceUrl = "https://www.oklahoma.gov/education/services/standards-learning/educational-technology.html";
const license = { name: "ISTE Standards for Students", notice: "ISTE student-standard names are used only as short alignment references; K–2 activity descriptions are project original." };
type Entry = readonly [area: string, title: string, kindergarten: string, gradeOne: string, gradeTwo: string];

const entries: readonly Entry[] = [
  ["1.1", "Empowered Learner", "choose a learning goal and one safe tool or material that can help meet it with guidance", "use a safe digital tool with guidance to set a learning goal, try it, and notice progress", "choose a safe digital tool or strategy for a learning goal, monitor progress, and explain one adjustment"],
  ["1.2", "Digital Citizen", "identify private information and tell an adult before sharing anything online", "practice kind, safe, and responsible choices when using shared devices or digital spaces", "explain how a safe, respectful digital choice can affect self and others"],
  ["1.3", "Knowledge Constructor", "ask a question and use a book, person, or safe supervised resource to find an answer", "gather a few relevant facts about a question with adult guidance and say where each fact came from", "compare information from two safe, adult-selected sources and explain which facts answer a question"],
  ["1.4", "Innovative Designer", "draw, build, or arrange materials to solve a simple problem, then try one improvement", "plan, make, test, and improve a simple solution to a real or pretend problem", "use a design process to make, test, get feedback on, and improve a solution within given limits"],
  ["1.5", "Computational Thinker", "put the steps of a familiar task in order and notice a repeated pattern", "break a simple problem into parts and give precise ordered directions for a solution", "use data, patterns, and step-by-step directions to solve a problem and check the result"],
  ["1.6", "Creative Communicator", "choose a drawing, spoken explanation, movement, or simple digital creation to share an idea", "create and share an age-appropriate message for a listener using words, pictures, sound, or a safe digital tool", "choose a suitable format and create a clear message that shares learning with a specific audience"],
  ["1.7", "Global Collaborator", "take turns, listen, and add one helpful idea while working with a partner or group", "work with others to make a shared product and describe one way each person helped", "work respectfully with others who may have different ideas, use feedback, and help make a shared decision"]
];

export const oklahomaEducationTechnologyStandards: Standard[] = entries.flatMap(([area, title, kindergarten, gradeOne, gradeTwo]) => ([
  ["K", kindergarten], ["1", gradeOne], ["2", gradeTwo]
] as const).map(([grade, statement]) => ({
  schemaVersion: 1, officialId: `${grade}.ISTE.${area}`, canonicalId: `oklahoma.education-technology.${grade}.iste.${area.replace(".", "-")}`, subject: "computerScience", grade, gradeName: grade === "K" ? "Kindergarten" : `Grade ${grade}`, domainCode: "ISTE", domain: "Oklahoma Educational Technology Standards", strand: "Supplemental Digital Learning", clusterCode: null, parentId: area, sourceItem: `ISTE ${area} ${title}`, statement, childFriendlyDescription: `I can ${statement}.`, isLeaf: true, instructionalStatus: "assessable", prerequisiteIds: [], tags: ["oklahoma", "educational-technology", "iste", "digital-learning", "supplemental", "2016"], source: { publisher: "Oklahoma State Department of Education", package: "Oklahoma Educational Technology Standards (ISTE Standards for Students)", reference: `ISTE ${area} ${title}`, recoverySourceUrl: sourceUrl, recoveryRevision: "2016", officialReferencePdf: sourceUrl, verification: "Oklahoma adopted the 2016 ISTE Standards for Students as Educational Technology standards. This is a project-authored K–2 learning target aligned to that broad cross-curricular standard." }, license, active: true
})));
