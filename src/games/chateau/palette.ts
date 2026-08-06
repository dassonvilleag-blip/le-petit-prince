export interface ColorDef {
  id: string;
  label: string;
  hex: number;
}

export const COLORS: ColorDef[] = [
  { id: "rouge", label: "Rouge", hex: 0xe6533c },
  { id: "orange", label: "Orange", hex: 0xf08c3c },
  { id: "jaune", label: "Jaune", hex: 0xf0c93c },
  { id: "vert", label: "Vert", hex: 0x6fbf6a },
  { id: "bleu", label: "Bleu", hex: 0x4a90d9 },
  { id: "violet", label: "Violet", hex: 0x8a6fd9 },
  { id: "rose", label: "Rose", hex: 0xd97ba0 },
  { id: "brun", label: "Brun", hex: 0xa9754a },
  { id: "gris", label: "Gris", hex: 0x9a9a9a },
];

export const DEFAULT_COLOR_ID = COLORS[0].id;

export function colorById(id: string): ColorDef {
  return COLORS.find((c) => c.id === id) ?? COLORS[0];
}
