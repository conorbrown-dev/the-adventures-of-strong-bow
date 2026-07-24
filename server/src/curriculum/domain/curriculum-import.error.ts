export class CurriculumImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CurriculumImportError";
  }
}
