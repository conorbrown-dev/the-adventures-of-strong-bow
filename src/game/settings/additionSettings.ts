export type AdditionLayout = "horizontal" | "vertical";

export interface AdditionSettings {
  maximumSum: number;
  layout: AdditionLayout;
  enemyShipCount: number;
}

const STORAGE_KEY = "molly-learning-addition-settings";
const defaultSettings: AdditionSettings = { maximumSum: 20, layout: "horizontal", enemyShipCount: 8 };

export function loadAdditionSettings(): AdditionSettings {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...defaultSettings };
    const parsed = JSON.parse(stored) as Partial<AdditionSettings>;
    return {
      maximumSum: [5, 10, 20].includes(parsed.maximumSum ?? 0) ? parsed.maximumSum! : defaultSettings.maximumSum,
      layout: parsed.layout === "vertical" ? "vertical" : "horizontal",
      enemyShipCount: [5, 8, 12].includes(parsed.enemyShipCount ?? 0) ? parsed.enemyShipCount! : defaultSettings.enemyShipCount
    };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveAdditionSettings(settings: AdditionSettings): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
