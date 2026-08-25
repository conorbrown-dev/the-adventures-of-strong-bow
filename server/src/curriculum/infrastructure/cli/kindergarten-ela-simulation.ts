import { simulateAllKindergartenProfiles } from "../../application/kindergarten-ela-simulation";

async function main(): Promise<void> {
  const selectionCount = Number.parseInt(process.argv[2] ?? "20", 10);
  if (!Number.isInteger(selectionCount) || selectionCount < 10 || selectionCount > 20) throw new Error("Selection count must be an integer from 10 through 20.");
  process.stdout.write(`${JSON.stringify(await simulateAllKindergartenProfiles(selectionCount), null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
