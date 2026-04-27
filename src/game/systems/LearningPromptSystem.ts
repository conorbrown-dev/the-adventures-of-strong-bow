import { LearningType } from "../data/learningTypes";
import { FossilPickup } from "../entities/FossilPickup";
import type {
  PromptDescriptor,
  ValidationMode
} from "../modes/fossil-dig/FossilDigContent";
import { Hud } from "../ui/Hud";

export class LearningPromptSystem {
  private currentPrompt: PromptDescriptor;

  constructor(
    private readonly hud: Hud,
    initialPrompt: PromptDescriptor,
    private readonly validationMode: ValidationMode
  ) {
    this.currentPrompt = initialPrompt;
    this.hud.setPrompt(initialPrompt.displayText);
  }

  setPrompt(prompt: PromptDescriptor): void {
    this.currentPrompt = prompt;
    this.hud.setPrompt(prompt.displayText);
  }

  getCurrentPrompt(): PromptDescriptor {
    return this.currentPrompt;
  }

  canCollect(pickup: FossilPickup): boolean {
    if (this.validationMode === "free_collect") {
      return true;
    }

    if (
      this.currentPrompt.targetType &&
      pickup.learningType !== this.currentPrompt.targetType
    ) {
      return false;
    }

    if (
      this.currentPrompt.kind === "find_specific" &&
      this.currentPrompt.targetValue &&
      pickup.label !== this.currentPrompt.targetValue
    ) {
      return false;
    }

    return true;
  }

  showGemPrompt(): void {
    this.setPrompt({
      kind: "collect_all",
      displayText: "The gem is glowing. Grab it!"
    });
  }

  showAssemblyPrompt(): void {
    this.setPrompt({
      kind: "collect_all",
      displayText: "The dinosaur is waking up!"
    });
  }

  showChasePrompt(): void {
    this.setPrompt({
      kind: "collect_all",
      displayText: "Run and jump over the rocks!"
    });
  }

  showLetterScaffoldPrompt(type: LearningType): void {
    this.setPrompt({
      kind: "find_category",
      displayText:
        type === LearningType.VOWEL ? "Find a vowel" : "Find a consonant",
      targetType: type
    });
  }
}
