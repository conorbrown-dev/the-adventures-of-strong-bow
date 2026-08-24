import type { Standard } from "../domain/standard";

const sourceUrl = "https://www.oklahoma.gov/content/dam/ok/en/osde/documents/services/standards-learning/health/2026%20OAS%20Health.pdf";
const license = { name: "Oklahoma Academic Standards", notice: "Oklahoma State Department of Education standards; identifiers and short descriptions are used for alignment." };

type Entry = readonly [id: string, description: string];
const entries: readonly Entry[] = [
  ["1.NU.2.1", "Explain what foods are in a healthy breakfast."], ["1.NU.2.2", "Identify healthy foods and snacks in the five food groups."], ["1.NU.2.3", "Identify benefits of drinking water and limiting sugary beverages."],
  ["1.PA.2.1", "Identify the recommended amount of physical activity for children."], ["1.PA.2.2", "Describe different ways to be physically active."], ["1.PA.2.3", "Describe the benefits of physical activity."],
  ["1.MH.2.1", "Identify healthy ways to express and cope with needs, wants, feelings, and difficult experiences."], ["1.MH.2.2", "Recognize the relationship between feelings and behavior."], ["1.MH.2.3", "Explain why boundaries of self and others deserve respect."],
  ["1.SU.2.1", "Identify safe and unsafe use of medicines and prescriptions."], ["1.SU.2.2", "Identify school rules for using medicines and prescriptions."], ["1.SU.2.3", "Identify tobacco products that have negative health effects."],
  ["1.HR.2.1", "Identify trusted adults and their characteristics."], ["1.HR.2.2", "Identify characteristics of healthy family and peer relationships."], ["1.HR.2.3", "Distinguish between wanted and unwanted touch."],
  ["1.IP.2.1", "Identify benefits of personal health-care practices."], ["1.IP.2.2", "Identify situations that can lead to injuries at home, school, and in the community."], ["1.IP.2.3", "Identify people who can help when someone is injured or suddenly ill."],
  ["2.AN.2.1", "Identify how family influences personal health practices and behaviors."], ["2.AN.2.2", "Identify how school culture supports personal health practices and behaviors."], ["2.AN.2.3", "Identify peers who can influence healthy and unhealthy behaviors."], ["2.AN.2.4", "Identify how media and technology influence health practices and behaviors."],
  ["3.AC.2.1", "Identify trusted adults and professionals who can help promote health information and services."], ["3.AC.2.2", "Locate school and community health helpers."],
  ["4.IC.2.1", "Identify healthy ways to express and communicate needs, wants, and feelings."], ["4.IC.2.2", "Identify personal space and boundaries of self and others to reduce health risks."], ["4.IC.2.3", "Identify safe and effective responses to conflict or dangerous situations."], ["4.IC.2.4", "Identify ways to tell a trusted adult when help is needed."],
  ["5.DM.2.1", "Identify health-related decisions and when help is needed to make a healthy choice."], ["5.DM.2.2", "Identify how family, peers, culture, technology, or media influence a health-related decision."],
  ["6.GS.2.1", "Identify a short-term personal health goal and who can help."], ["6.GS.2.2", "Describe steps to achieve a personal health goal."],
  ["7.SM.2.1", "Identify practices that prevent or reduce health risks."], ["7.SM.2.2", "Demonstrate healthy practices and behaviors that maintain or improve personal health."],
  ["8.AD.2.1", "Identify ways to promote personal health."], ["8.AD.2.2", "Identify strategies that encourage peers to make positive health choices."]
];

export const oklahomaHealthStandards: Standard[] = entries.map(([officialId, statement]) => ({
  schemaVersion: 1, officialId, canonicalId: `oklahoma.health.${officialId.toLowerCase()}`, subject: "health", grade: "K", gradeName: "PreK–Grade 2", domainCode: officialId.split(".")[0] ?? "1", domain: "Oklahoma Academic Standards for Health Education", strand: officialId.split(".")[1] ?? null, clusterCode: null, parentId: null, sourceItem: officialId, statement, childFriendlyDescription: `I can ${statement.charAt(0).toLowerCase()}${statement.slice(1)}`, isLeaf: true, instructionalStatus: "assessable", prerequisiteIds: [], tags: ["oklahoma", "health", "2026", "prek-2"], source: { publisher: "Oklahoma State Department of Education", package: "Oklahoma Academic Standards for Health Education 2026", reference: officialId, recoverySourceUrl: sourceUrl, recoveryRevision: "2026", officialReferencePdf: sourceUrl, verification: "Checked against the official 2026 OAS Health PreK–2 grade-band objectives." }, license, active: true
}));
