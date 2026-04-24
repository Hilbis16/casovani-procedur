export const CATEGORIES: Record<string, string> = {
  masaz: "Masáže",
  hydroterapie: "Hydroterapie",
  elektroterapie: "Elektroterapie",
  magnetoterapie: "Magnetoterapie",
  jine: "Jiné",
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

export const STATUS_LABELS: Record<string, string> = {
  planned: "Naplánováno",
  completed: "Dokončeno",
  cancelled: "Zrušeno",
};

export const DAY_NAMES = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
export const DAY_NAMES_FULL = ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"];

export const GRID_START_HOUR = 7;
export const GRID_END_HOUR = 18;
export const PIXELS_PER_MINUTE = 2;

export function generateTimeSlots(stepMin = 15): string[] {
  const slots: string[] = [];
  for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) {
    for (let m = 0; m < 60; m += stepMin) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

export const TIME_SLOTS = generateTimeSlots(15);
export const START_TIMES = generateTimeSlots(15);
