import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLE_DERNIER_EXPORT,
  collecter,
  jeuxConcernes,
  lire,
  nomFichier,
  noterExport,
  rappelNecessaire,
  restaurer,
  versCode,
  type Stockage,
} from "../sauvegarde.ts";

function faux(init: Record<string, string> = {}): Stockage & { m: Map<string, string> } {
  const m = new Map(Object.entries(init));
  return {
    m,
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
  };
}

const parties = {
  "du-kebab-au-cac-40:v1": JSON.stringify({ argent: 1e15, nom: "Ça coûte 12 € — œuf" }),
  "paperasse-v1": JSON.stringify({ dossiers: 42 }),
  "peche-record": "17",
  "peche-bestiaire": "[]",
};

test("collecter prend toutes les clés sauf la date du dernier export", () => {
  const st = faux({ ...parties, [CLE_DERNIER_EXPORT]: "123" });
  const s = collecter(st, new Date("2026-10-15T12:00:00Z"));
  assert.deepEqual(s.donnees, parties);
  assert.equal(s.date, "2026-10-15T12:00:00.000Z");
});

test("le code fait l'aller-retour, accents et symboles compris", () => {
  const s = collecter(faux(parties));
  const code = versCode(s);
  assert.ok(code.startsWith("PPSAVE1:"));
  assert.deepEqual(lire(code), s);
  // un code recopié avec des retours à la ligne passe quand même
  assert.deepEqual(lire(code.slice(0, 40) + "\n " + code.slice(40)), s);
});

test("le fichier JSON exporté se relit aussi", () => {
  const s = collecter(faux(parties));
  assert.deepEqual(lire(JSON.stringify(s, null, 1)), s);
});

test("un texte quelconque ou un code tronqué est refusé proprement", () => {
  assert.throws(() => lire("bonjour"), /pas une sauvegarde/);
  assert.throws(() => lire('{"app":"autre","v":1,"donnees":{}}'), /pas une sauvegarde/);
  const code = versCode(collecter(faux(parties)));
  assert.throws(() => lire(code.slice(0, code.length - 30)), /abîmé/);
});

test("restaurer écrase les clés sauvegardées et laisse les autres", () => {
  const s = collecter(faux(parties));
  const st = faux({ "paperasse-v1": "ancienne", "autre-jeu": "garde" });
  assert.equal(restaurer(st, s), 4);
  assert.equal(st.getItem("paperasse-v1"), parties["paperasse-v1"]);
  assert.equal(st.getItem("autre-jeu"), "garde");
});

test("jeuxConcernes regroupe les clés d'un même jeu", () => {
  assert.deepEqual(jeuxConcernes(parties), ["Du Kebab au CAC 40", "Paperasse", "Pêche abyssale"]);
});

test("rappel : jamais sans partie, sinon après 7 jours sans export", () => {
  const jour = 86_400_000;
  assert.equal(rappelNecessaire(faux()), false);
  const st = faux(parties);
  assert.equal(rappelNecessaire(st, 10 * jour), true, "jamais exporté");
  noterExport(st, 10 * jour);
  assert.equal(rappelNecessaire(st, 16 * jour), false);
  assert.equal(rappelNecessaire(st, 18 * jour), true);
});

test("le nom du fichier porte la date", () => {
  assert.equal(nomFichier(new Date("2026-10-15T08:00:00Z")), "petit-prince-parties-2026-10-15.json");
});
