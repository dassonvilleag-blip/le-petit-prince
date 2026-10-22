// Rapport sur le contenu du mode « Vivre Card » :
//   node --experimental-strip-types outils/vie-rapport.ts            → validation + 500 vies simulées
//   node --experimental-strip-types outils/vie-rapport.ts 5000       → plus de vies
//   node --experimental-strip-types outils/vie-rapport.ts 0 pirates  → validation seule, erreurs d'un fichier
//   node --experimental-strip-types outils/vie-rapport.ts 1 --vie 42 → raconte la vie de graine 42

import { CONTENU } from "../src/games/roi-des-pirates/vie/contenu/index.ts";
import { validerContenu } from "../src/games/roi-des-pirates/vie/valider.ts";
import { Vie } from "../src/games/roi-des-pirates/vie/moteur.ts";
import { titreDeFin, evaluerSecrets } from "../src/games/roi-des-pirates/vie/fin.ts";

const args = process.argv.slice(2);
const nbVies = Number(args[0] ?? 500);
const filtre = args[1] && !args[1].startsWith("--") ? args[1] : undefined;
const vieIndex = args.indexOf("--vie");

const rapport = validerContenu(CONTENU);
const garde = (s: string): boolean => !filtre || s.includes(filtre) || CONTENU.evenements.some((e) => s.startsWith(e.id) && e.id.startsWith(filtre));
const erreurs = rapport.erreurs.filter(garde);
const avert = rapport.avertissements.filter(garde);
console.log(`Contenu : ${CONTENU.evenements.length} événements, ${CONTENU.histoire.length} faits historiques, ${CONTENU.fruits.length} fruits, ${CONTENU.secrets.length} secrets, ${CONTENU.titres.length} titres, ${CONTENU.repliques.length} répliques.`);
console.log(`Erreurs : ${erreurs.length}`);
for (const e of erreurs.slice(0, 200)) console.log("  ✗ " + e);
console.log(`Avertissements : ${avert.length}`);
for (const a of avert.slice(0, 60)) console.log("  ! " + a);

if (vieIndex >= 0) {
  const graine = Number(args[vieIndex + 1]);
  const vie = new Vie({ graine, contenu: CONTENU });
  while (vie.etat.vivant) vie.avancerAuto();
  for (const l of vie.etat.journal) console.log(`${String(l.age).padStart(3)} ${l.type.padEnd(8)} ${l.texte}`);
  console.log(`\nTitre : ${titreDeFin(vie)}`);
  process.exit(0);
}

if (nbVies > 0) {
  const vus = new Map<string, number>();
  const camps = new Map<string, number>();
  const titres = new Map<string, number>();
  const secrets = new Map<string, number>();
  const morts = new Map<string, number>();
  let ages = 0, evts = 0, decisions = 0, primes = 0, fruits = 0;
  const debut = Date.now();
  for (let g = 1; g <= nbVies; g++) {
    const vie = new Vie({ graine: g * 7919, contenu: CONTENU });
    let garde = 0;
    while (vie.etat.vivant && garde++ < 400) {
      vie.avancer();
      while (vie.enAttente) {
        decisions++;
        vie.choisir(vie.choixAuto());
      }
    }
    const v = vie.etat;
    ages += v.age;
    if (v.primeMax > 0) primes++;
    if (v.fruit) fruits++;
    for (const id of Object.keys(v.vus)) vus.set(id, (vus.get(id) ?? 0) + 1);
    evts += Object.keys(v.vus).length;
    const campsVus = new Set(v.flagsVus.filter((f) => f.startsWith("camp:")).map((f) => f.slice(5)));
    for (const c of campsVus) camps.set(c, (camps.get(c) ?? 0) + 1);
    const t = titreDeFin(vie);
    titres.set(t, (titres.get(t) ?? 0) + 1);
    morts.set(v.mort?.id ?? "?", (morts.get(v.mort?.id ?? "?") ?? 0) + 1);
    for (const s of evaluerSecrets(vie)) if (s.obtenu) secrets.set(s.secret.id, (secrets.get(s.secret.id) ?? 0) + 1);
  }
  const pct = (n: number): string => `${((100 * n) / nbVies).toFixed(1)} %`;
  console.log(`\n${nbVies} vies simulées en ${((Date.now() - debut) / 1000).toFixed(1)} s`);
  console.log(`Âge moyen à la mort : ${(ages / nbVies).toFixed(1)} ans · événements distincts par vie : ${(evts / nbVies).toFixed(1)} · décisions par vie : ${(decisions / nbVies).toFixed(1)}`);
  console.log(`Vies recherchées : ${pct(primes)} · vies avec un fruit : ${pct(fruits)}`);
  console.log("Camps traversés : " + [...camps].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${pct(n)}`).join(" · "));
  console.log("Morts : " + [...morts].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${pct(n)}`).join(" · "));
  console.log("Titres les plus fréquents : " + [...titres].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([c, n]) => `${c} (${n})`).join(" · "));
  console.log("Secrets obtenus : " + ([...secrets].map(([c, n]) => `${c} ${pct(n)}`).join(" · ") || "aucun"));
  const jamais = CONTENU.evenements.filter((e) => e.pool !== "chaine" && !vus.has(e.id)).map((e) => e.id);
  console.log(`Événements tirables jamais vus (${jamais.length}) : ${jamais.slice(0, 80).join(", ")}`);
  const tropFrequents = [...vus].filter(([, n]) => n / nbVies > 0.6).map(([id, n]) => `${id} ${pct(n)}`);
  console.log(`Événements vus dans plus de 60 % des vies : ${tropFrequents.join(", ")}`);
}
if (erreurs.length) process.exitCode = 1;
