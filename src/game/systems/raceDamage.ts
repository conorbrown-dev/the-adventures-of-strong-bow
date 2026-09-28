export const PLAYER_HIT_LIMIT = 4;
export const RIVAL_HIT_LIMIT = 2;

export function applyRaceDamage(remainingHits: number): number {
  return Math.max(0, remainingHits - 1);
}

export function isKnockedOut(remainingHits: number): boolean {
  return remainingHits === 0;
}
