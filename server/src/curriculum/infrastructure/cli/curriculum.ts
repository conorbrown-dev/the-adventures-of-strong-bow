import { importVendoredStandards } from "../../application/import-vendored-standards";
import { PrismaService } from "../../../prisma/prisma.service";
import { PrismaStandardRepository } from "../prisma-standard.repository";
import { loadAndValidateVendoredStandards } from "../vendored-standards.validator";

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command === "validate") {
    const dataset = await loadAndValidateVendoredStandards();
    console.log(JSON.stringify({ valid: true, records: dataset.records.length, copyrightNotice: dataset.copyrightNotice }, null, 2));
    return;
  }

  const prisma = new PrismaService();
  await prisma.onModuleInit();
  try {
    const repository = new PrismaStandardRepository(prisma);
    if (command === "import") {
      console.log(JSON.stringify(await importVendoredStandards(repository), null, 2));
      return;
    }
    if (command === "report") {
      console.log(JSON.stringify({
        imported: await repository.count(),
        quizTargets: (await repository.listQuizTargets()).length,
        countsByGradeAndSubject: await repository.countByGradeAndSubject()
      }, null, 2));
      return;
    }
    throw new Error("Usage: curriculum <validate|import|report>");
  } finally {
    await prisma.onModuleDestroy();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
