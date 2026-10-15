// Sauvegarde globale du site : toutes les parties de tous les jeux (le
// localStorage du site) dans un seul fichier ou un seul code à copier, pour
// survivre à un « vider les cookies » ou changer de navigateur.

export const CLE_DERNIER_EXPORT = "petit-prince:dernier-export";
export const PREFIXE_CODE = "PPSAVE1:";
export const RAPPEL_JOURS = 7;

export interface Sauvegarde {
  app: "le-petit-prince";
  v: 1;
  date: string; // ISO
  donnees: Record<string, string>;
}

// Le strict nécessaire de Storage, pour tester sans navigateur.
export interface Stockage {
  readonly length: number;
  key(i: number): string | null;
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

// Libellés lisibles des clés connues ; les autres s'affichent telles quelles.
const JEUX: [RegExp, string][] = [
  [/^du-kebab-au-cac-40/, "Du Kebab au CAC 40"],
  [/^les-caravanes/, "Les Caravanes"],
  [/^cite-petit-prince/, "Cité Petit Prince"],
  [/^paperasse/, "Paperasse"],
  [/^la-colonie/, "La Colonie"],
  [/^mini-mondes/, "Mini Mondes"],
  [/^abysse/, "Abysse"],
  [/^aquarium/, "Aquarium"],
  [/^peche-/, "Pêche abyssale"],
  [/^horde-/, "La Horde"],
  [/^jardin-infini/, "Jardin infini"],
  [/^phare-/, "Le Phare"],
  [/^petites-orbites/, "Petites orbites"],
  [/^ca-coute-combien/, "Ça coûte combien ?!"],
  [/^les-des-menteurs/, "Les Dés Menteurs"],
  [/^roi-des-pirates/, "Le Roi des Pirates"],
  [/^tarot-/, "Le Tarot"],
];

export function nomDuJeu(cle: string): string {
  for (const [re, nom] of JEUX) if (re.test(cle)) return nom;
  return cle;
}

// Jeux concernés par une sauvegarde, sans doublon, dans l'ordre d'apparition.
export function jeuxConcernes(donnees: Record<string, string>): string[] {
  return [...new Set(Object.keys(donnees).map(nomDuJeu))];
}

export function collecter(st: Stockage, date = new Date()): Sauvegarde {
  const donnees: Record<string, string> = {};
  for (let i = 0; i < st.length; i++) {
    const k = st.key(i);
    if (k === null || k === CLE_DERNIER_EXPORT) continue;
    const v = st.getItem(k);
    if (v !== null) donnees[k] = v;
  }
  return { app: "le-petit-prince", v: 1, date: date.toISOString(), donnees };
}

// ---- code texte (base64 de l'UTF-8, préfixé) ----

export function versCode(s: Sauvegarde): string {
  const octets = new TextEncoder().encode(JSON.stringify(s));
  let bin = "";
  for (let i = 0; i < octets.length; i += 0x8000) bin += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  return PREFIXE_CODE + btoa(bin);
}

// Accepte un code (« PPSAVE1:… ») ou le contenu d'un fichier JSON exporté.
export function lire(texte: string): Sauvegarde {
  const t = texte.trim();
  let json: string;
  if (t.startsWith(PREFIXE_CODE)) {
    let bin: string;
    try {
      bin = atob(t.slice(PREFIXE_CODE.length).replace(/\s+/g, ""));
    } catch {
      throw new Error("Ce code est abîmé (il manque peut-être un morceau).");
    }
    json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } else if (t.startsWith("{")) {
    json = t;
  } else {
    throw new Error("Ce n'est pas une sauvegarde du petit prince.");
  }
  let s: Partial<Sauvegarde>;
  try {
    s = JSON.parse(json);
  } catch {
    throw new Error("Ce code est abîmé (il manque peut-être un morceau).");
  }
  if (s?.app !== "le-petit-prince" || s.v !== 1 || typeof s.donnees !== "object" || s.donnees === null) {
    throw new Error("Ce n'est pas une sauvegarde du petit prince.");
  }
  for (const v of Object.values(s.donnees)) {
    if (typeof v !== "string") throw new Error("Cette sauvegarde est abîmée.");
  }
  return s as Sauvegarde;
}

// Remet les parties en place : chaque clé sauvegardée écrase la valeur
// actuelle, les autres clés ne sont pas touchées.
export function restaurer(st: Stockage, s: Sauvegarde): number {
  let n = 0;
  for (const [k, v] of Object.entries(s.donnees)) {
    if (k === CLE_DERNIER_EXPORT) continue;
    st.setItem(k, v);
    n++;
  }
  return n;
}

// ---- rappel ----

export function aDesParties(st: Stockage): boolean {
  return Object.keys(collecter(st).donnees).length > 0;
}

// Faut-il rappeler d'exporter ? Oui s'il y a des parties et que le dernier
// export date de plus de RAPPEL_JOURS (ou n'a jamais eu lieu).
export function rappelNecessaire(st: Stockage, maintenant = Date.now()): boolean {
  if (!aDesParties(st)) return false;
  const dernier = Number(st.getItem(CLE_DERNIER_EXPORT) ?? 0);
  return !dernier || maintenant - dernier > RAPPEL_JOURS * 86_400_000;
}

export function noterExport(st: Stockage, maintenant = Date.now()): void {
  st.setItem(CLE_DERNIER_EXPORT, String(maintenant));
}

export function nomFichier(date = new Date()): string {
  const j = date.toISOString().slice(0, 10);
  return `petit-prince-parties-${j}.json`;
}
