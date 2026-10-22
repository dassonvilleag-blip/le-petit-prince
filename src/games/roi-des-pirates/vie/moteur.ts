// Le moteur d'une vie : chaque tour est une année (deux pour les géants).
// Le monde passe (l'Histoire), des événements sont tirés selon qui l'on est
// et où l'on est, certains demandent un choix, et la mort peut venir.

import type { ChoixVisible, Contenu, Decision, EtatVie, Ligne, MetaLecture, TypeLigne, Volonte } from "./etat.ts";
import type { Camp, Choix, Effet, EffetFruit, EffetLien, Evenement, Fruit, Jauge, Rarete, Role, Sexe, Texte } from "./types.ts";
import { JAUGES } from "./types.ts";
import { creerRng, hacher, entre, pondere, gauss, type Rng } from "./rng.ts";
import { naitre, type NaissanceImposee } from "./naissance.ts";
import { verifier, trouverJumeau, ageEchelle, type Sujet } from "./conditions.ts";
import { rendre, choisirVariante, nomDeLaVie, lienActif, type ContexteTexte } from "./texte.ts";
import { ILES, ZONES, MONDES, RISQUE_CAMP, LIGNE_CONNAISSANCE, grade as gradeParId, gradeEntree, gradeSuivant, ileExiste, ile as ileParId } from "./monde.ts";
import { nomIleAnonyme, prenom } from "./noms.ts";

const MULT_RARETE: Record<Rarete, number> = {
  commun: 1,
  "peu-commun": 0.4,
  rare: 0.1,
  "tres-rare": 0.025,
  legendaire: 0.006,
};

const POIDS_RARETE_FRUIT: Record<number, number> = { 1: 50, 2: 25, 3: 10, 4: 3, 5: 0.6 };

export const AGES_PAUSES = [5, 15, 30, 50, 70];
/** Au-delà, les manchettes d'une même année sont résumées en une ligne. */
const MANCHETTES_PAR_AN = 4;

interface Index {
  parId: Map<string, Evenement>;
  tirables: Evenement[];
  fruits: Map<string, Fruit>;
  morts: Map<string, import("./types.ts").Mort>;
}

const INDEX = new WeakMap<Contenu, Index>();
function indexer(c: Contenu): Index {
  let idx = INDEX.get(c);
  if (!idx) {
    idx = {
      parId: new Map(c.evenements.map((e) => [e.id, e])),
      tirables: c.evenements.filter((e) => e.pool !== "chaine"),
      fruits: new Map(c.fruits.map((f) => [f.id, f])),
      morts: new Map(c.morts.map((m) => [m.id, m])),
    };
    INDEX.set(c, idx);
  }
  return idx;
}

export interface OptionsVie {
  graine: number;
  contenu: Contenu;
  meta?: MetaLecture;
  volonte?: Volonte;
  impose?: NaissanceImposee;
  /** Une vie « jumelle » : jouée en automatique, sans jumeaux à elle. */
  jumelle?: boolean;
  /** Le futur du monde (sinon tiré de la graine). */
  monde?: string;
}

interface EnCours {
  evt: Evenement;
  ctx: ContexteTexte;
}

export class Vie {
  readonly etat: EtatVie;
  readonly jumeaux: Vie[] = [];
  enAttente: Decision | null = null;
  readonly contenu: Contenu;
  readonly meta: MetaLecture;
  volonte?: Volonte;

  private readonly rng: Rng;
  private readonly idx: Index;
  private readonly jumelle: boolean;
  private file: { id: string; verifier: boolean }[] = [];
  private enCours: EnCours | null = null;
  private tourOuvert = false;
  private demarre = false;
  private tensionTour = 0;
  private marqueTour?: string;
  private sortie: Ligne[] = [];
  private journauxManques: string[] = [];
  private annonces = new Set<string>();

  constructor(o: OptionsVie) {
    this.contenu = o.contenu;
    this.idx = indexer(o.contenu);
    this.meta = o.meta ?? { flags: new Set(), vies: 0 };
    this.jumelle = Boolean(o.jumelle);
    this.rng = creerRng(o.graine);
    this.etat = naitre(this.rng, o.graine, o.impose);
    this.etat.monde = o.monde ?? tirerMonde(o.graine);
    this.volonte = o.volonte;
    if (o.volonte) this.recevoirVolonte(o.volonte);
    if (this.jumelle) this.etat.focus = this.focusAuto();
    if (!this.jumelle) {
      for (let i = 0; i < 4; i++) {
        this.jumeaux.push(new Vie({
          graine: hacher(`${o.graine}:jumeau:${i}`),
          contenu: o.contenu,
          meta: this.meta,
          impose: { annee: this.etat.anneeNaissance },
          jumelle: true,
          monde: this.etat.monde,
        }));
      }
    }
  }

  // ── Accès ──

  private get sujet(): Sujet {
    return { etat: this.etat, jumeaux: this.jumeaux.map((j) => j.etat), meta: this.meta, fruits: this.idx.fruits };
  }

  fruit(id: string | undefined): Fruit | undefined {
    return id ? this.idx.fruits.get(id) : undefined;
  }

  get nom(): string {
    return nomDeLaVie(this.etat);
  }

  // ── Déroulé ──

  /** Joue un tour (une année). Renvoie les lignes produites ; peut laisser une décision en attente. */
  avancer(): Ligne[] {
    const v = this.etat;
    if (!v.vivant || this.enAttente) return [];
    this.sortie = [];
    const anneePrecedente = v.annee;
    if (this.demarre) {
      v.age += v.pas;
      v.annee += v.pas;
    }
    this.tensionTour = 0;
    this.marqueTour = undefined;
    this.ligne("annee", `${v.annee}`);

    const age = ageEchelle(v);
    const pause = AGES_PAUSES.find((a) => age >= a && !v.pausesFaites.includes(a));
    if (pause !== undefined && !this.jumelle) this.file.push({ id: `__pause__${pause}`, verifier: false });
    else if (pause !== undefined) v.pausesFaites.push(pause);

    this.leMondePasse(this.demarre ? anneePrecedente : v.annee - 1);
    this.demarre = true;

    for (const p of [...v.planifies]) {
      if (p.annee <= v.annee) {
        v.planifies.splice(v.planifies.indexOf(p), 1);
        this.file.push({ id: p.id, verifier: true });
      }
    }
    this.tirerEvenements();

    this.tourOuvert = true;
    this.poursuivre();
    return this.sortie;
  }

  /** Répond à la décision en attente. `note` : texte libre d'une pause. */
  choisir(index: number, note?: string): Ligne[] {
    const d = this.enAttente;
    if (!d) return [];
    this.sortie = [];
    this.enAttente = null;
    const v = this.etat;
    if (d.type === "pause") {
      const age = Number(d.id.replace("__pause__", ""));
      v.pausesFaites.push(age);
      if (note && note.trim()) {
        v.notes[age] = note.trim().slice(0, 500);
        this.ligne("pause", `« ${v.notes[age]} »`);
      }
    } else if (this.enCours) {
      const { evt, ctx } = this.enCours;
      this.enCours = null;
      const ch = evt.choix?.[index];
      if (ch) this.appliquerChoix(ch, ctx);
    }
    this.poursuivre();
    return this.sortie;
  }

  /** Joue tout seul jusqu'à la fin du tour (jumeaux, mode automatique, simulations). */
  avancerAuto(): Ligne[] {
    const lignes = this.avancer();
    let garde = 0;
    while (this.enAttente && garde++ < 50) {
      lignes.push(...this.choisir(this.choixAuto()));
    }
    return lignes;
  }

  choixAuto(): number {
    const d = this.enAttente;
    if (!d || d.type === "pause" || !this.enCours) return -1;
    const evt = this.enCours.evt;
    const focus = this.etat.focus;
    const choisi = pondere(this.rng, d.choix, (c) => {
      const ch = evt.choix![c.index];
      let w = ch.auto ?? 1;
      if (ch.effets?.mort) w *= 0.08;
      if (focus !== "repos" && (ch.effets?.jauges?.[focus] ?? 0) > 0) w *= 1.6;
      if (ch.effets?.reve && this.etat.reve) w *= 0.5;
      return w;
    });
    return choisi?.index ?? d.choix[0]?.index ?? 0;
  }

  private poursuivre(): void {
    const v = this.etat;
    while (this.file.length && !this.enAttente && v.vivant) {
      const { id, verifier: aVerifier } = this.file.shift()!;
      this.jouer(id, aVerifier);
    }
    if (!this.enAttente && v.vivant && this.tourOuvert) this.finirTour();
  }

  // ── L'Histoire ──

  private journauxAccessibles(): boolean {
    const v = this.etat;
    if (ageEchelle(v) < 8) return false;
    if (v.camp === "esclave" || v.flags.includes("prisonnier") || v.zone === "impel-down") return false;
    if (v.zone === "wano" && v.annee >= 1504 && v.annee < 1524) return false;
    return true;
  }

  private leMondePasse(depuis: number): void {
    const v = this.etat;
    const accessibles = this.journauxAccessibles();
    if (accessibles && this.journauxManques.length) {
      const n = this.journauxManques.length;
      this.ligne("monde", `Les journaux que vous n'avez pas pu lire vous tombent dessus d'un coup — ${n} nouvelle${n > 1 ? "s" : ""} du monde. ${this.journauxManques.slice(-3).join(" ")}`);
      this.journauxManques = [];
    }
    // Certaines années débordent de nouvelles : on en lit quelques-unes, les autres passent.
    const lues = new Map<number, number>();
    const tues = new Map<number, number>();
    for (const f of this.contenu.histoire) {
      if (f.annee <= depuis || f.annee > v.annee) continue;
      if (f.monde && !f.monde.includes(v.monde)) continue;
      const ici = f.ile ? f.ile === v.ile : f.zone ? f.zone === v.zone : false;
      if (f.vecu && ici) {
        const e = this.idx.parId.get(f.vecu);
        if (e && verifier(e.quand, this.sujet)) {
          this.file.push({ id: f.vecu, verifier: false });
          continue;
        }
      }
      if (this.jumelle) continue;
      if (f.rumeur && f.zone === v.zone && ageEchelle(v) >= 5) {
        this.ligne("rumeur", rendre(f.rumeur, v));
      } else if (accessibles) {
        const n = lues.get(f.annee) ?? 0;
        if (n < MANCHETTES_PAR_AN) {
          lues.set(f.annee, n + 1);
          this.ligne("monde", rendre(f.manchette, v), undefined, f.projection || f.annee > LIGNE_CONNAISSANCE);
        } else tues.set(f.annee, (tues.get(f.annee) ?? 0) + 1);
      } else if (ageEchelle(v) >= 8) {
        this.journauxManques.push(rendre(f.manchette, v));
      }
    }
    for (const [annee, n] of tues) {
      this.ligne("monde", `${annee} déborde de nouvelles : ${n} autre${n > 1 ? "s" : ""} manchette${n > 1 ? "s" : ""} passe${n > 1 ? "nt" : ""} sans que vous ayez le temps de les lire.`, undefined, annee > LIGNE_CONNAISSANCE);
    }
  }

  // ── Les événements ──

  private eligible(e: Evenement): boolean {
    const v = this.etat;
    const vu = v.vus[e.id];
    if (vu !== undefined) {
      if (e.repetable === undefined) return false;
      if (v.annee - vu < e.repetable) return false;
    }
    return verifier(e.quand, this.sujet);
  }

  private tirerEvenements(): void {
    const v = this.etat;
    const age = ageEchelle(v);
    let nb: number;
    // La naissance est toujours racontée ; ensuite, la petite enfance passe vite.
    if (v.age === 0) nb = 1;
    else if (age < 3) nb = this.rng() < 0.45 ? 1 : 0;
    else if (age < 12) nb = (this.rng() < 0.8 ? 1 : 0) + (this.rng() < 0.2 ? 1 : 0);
    else nb = 1 + (this.rng() < 0.4 ? 1 : 0) + (this.rng() < 0.08 ? 1 : 0);
    if (this.file.some((f) => !f.id.startsWith("__"))) nb = Math.max(0, nb - 1);

    const candidats = this.idx.tirables.filter((e) => this.eligible(e));
    for (let k = 0; k < nb && candidats.length; k++) {
      const choisi = pondere(this.rng, candidats, (e) => (e.poids ?? 10) * MULT_RARETE[e.rarete ?? "commun"]);
      if (!choisi) break;
      candidats.splice(candidats.indexOf(choisi), 1);
      this.file.push({ id: choisi.id, verifier: true });
    }
  }

  private jouer(id: string, aVerifier: boolean): void {
    const v = this.etat;
    if (id.startsWith("__pause__")) {
      const age = Number(id.replace("__pause__", ""));
      const questions = this.contenu.pauses.filter((q) => q.age === age && verifier(q.si, this.sujet));
      const q = questions.length ? questions[Math.floor(this.rng() * questions.length)] : undefined;
      this.enAttente = {
        type: "pause",
        id,
        titre: `${age} ans`,
        texte: q ? rendre(choisirVariante(q.texte, this.rng), v) : "Un instant, on s'arrête.",
        choix: [],
        age: v.age,
      };
      return;
    }
    const evt = this.idx.parId.get(id);
    if (!evt) return;
    if (aVerifier && !verifier(evt.quand, this.sujet)) return;
    v.vus[evt.id] = v.annee;

    const ctx: ContexteTexte = {};
    if (evt.quand?.jumeau) {
      const j = trouverJumeau(this.sujet, evt.quand.jumeau);
      if (j) ctx.jumeau = { nom: nomDeLaVie(j), sexe: j.sexe };
    }
    const compagnons = v.liens.filter((l) => l.role === "compagnon" && l.vivant && !l.parti);
    if (compagnons.length) ctx.compagnon = compagnons[Math.floor(this.rng() * compagnons.length)];
    if (v.fruit) ctx.fruitNom = this.idx.fruits.get(v.fruit)?.surnom;
    if (v.fruitEnPoche) ctx.fruitNom = this.idx.fruits.get(v.fruitEnPoche)?.surnom;

    const tension = evt.tension ?? 1;
    this.tensionTour = Math.max(this.tensionTour, tension);
    if (evt.titre && tension >= 3) this.marqueTour = evt.titre;
    if (evt.titre) this.ligne("titre", rendre(evt.titre, v, ctx));
    this.ligne("recit", rendre(choisirVariante(evt.texte, this.rng), v, ctx));

    if (evt.clinOeil && !v.clins.includes(evt.clinOeil.id)) {
      v.clins.push(evt.clinOeil.id);
      this.ligne("clin", evt.clinOeil.ref);
    }
    if (evt.rencontre && !v.rencontres.includes(evt.rencontre)) v.rencontres.push(evt.rencontre);
    if (evt.effets) this.appliquer(evt.effets, ctx);
    if (!v.vivant) return;

    const visibles: ChoixVisible[] = [];
    (evt.choix ?? []).forEach((ch, index) => {
      if (verifier(ch.si, this.sujet)) {
        visibles.push({ index, label: rendre(ch.label, v, ctx), detail: ch.detail ? rendre(ch.detail, v, ctx) : undefined, risque: Boolean(ch.test) });
      }
    });
    if (visibles.length) {
      this.enCours = { evt, ctx };
      this.enAttente = {
        type: "evenement",
        id: evt.id,
        titre: evt.titre ? rendre(evt.titre, v, ctx) : undefined,
        texte: this.sortie.filter((l) => l.type === "recit").slice(-1)[0]?.texte ?? "",
        choix: visibles,
        bascule: evt.bascule,
        age: v.age,
      };
      if (this.jumelle && evt.tension !== undefined && evt.tension >= 3) this.fait(evt.titre ? rendre(evt.titre, v, ctx) : this.enAttente.texte);
    } else if (this.jumelle && tension >= 3) {
      this.fait(evt.titre ? rendre(evt.titre, v, ctx) : rendre(choisirVariante(evt.texte, this.rng), v, ctx));
    }
  }

  private appliquerChoix(ch: Choix, ctx: ContexteTexte): void {
    const v = this.etat;
    this.ligne("resultat", `→ ${rendre(ch.label, v, ctx)}`);
    if (ch.effets) this.appliquer(ch.effets, ctx, true);
    if (!v.vivant) return;
    if (ch.texte) this.ligne("recit", rendre(choisirVariante(ch.texte, this.rng), v, ctx));
    if (ch.test) {
      const reussi = this.reussit(ch.test.jauge, ch.test.difficulte);
      const issue = reussi ? ch.test.reussite : ch.test.echec;
      if (issue.texte) this.ligne("recit", rendre(choisirVariante(issue.texte, this.rng), v, ctx), reussi ? "bon" : "mauvais");
      if (issue.effets) this.appliquer(issue.effets, ctx, true);
    }
  }

  puissance(): number {
    const v = this.etat;
    const f = this.fruit(v.fruit);
    return v.jauges.force * 0.6 + v.jauges.haki * 0.4 + (f ? f.rarete * 5 : 0) + v.haki.length * 4;
  }

  private reussit(jauge: Jauge | "pc" | "chance", difficulte: number): boolean {
    const v = this.etat;
    const valeur = jauge === "chance" ? 50 : jauge === "pc" ? this.puissance() : v.jauges[jauge];
    return valeur + gauss(this.rng, 0, 12) >= difficulte;
  }

  // ── Les effets ──

  private appliquer(e: Effet, ctx: ContexteTexte, enTete = false): void {
    const v = this.etat;
    if (e.jauges) {
      for (const j of JAUGES) {
        const d = e.jauges[j];
        if (d) v.jauges[j] = Math.max(0, Math.min(100, v.jauges[j] + d));
      }
    }
    if (e.sante) v.sante = Math.max(0, Math.min(100, v.sante + e.sante));
    if (e.prime) {
      const f = this.fruit(v.fruit);
      this.poserPrime(v.prime + e.prime * (e.prime > 0 ? (f?.primeX ?? 1) : 1));
    }
    if (e.primeX) this.poserPrime(v.prime * e.primeX);
    for (const f of e.flags ?? []) this.poserFlag(f);
    for (const f of e.retirerFlags ?? []) v.flags = v.flags.filter((x) => x !== f);
    for (const [nom, n] of Object.entries(e.compteurs ?? {})) v.compteurs[nom] = (v.compteurs[nom] ?? 0) + n;
    if (e.camp) this.changerCamp(e.camp);
    if (e.grade) {
      const g = gradeParId(e.grade);
      if (g) {
        if (g.camp !== v.camp) this.changerCamp(g.camp);
        v.grade = g.id;
        this.poserFlag(`grade:${g.id}`);
      }
    }
    if (e.promotion) {
      const g = gradeSuivant(v.grade, v.camp);
      if (g) {
        v.grade = g.id;
        this.poserFlag(`grade:${g.id}`);
        this.ligne("gain", `Vous voilà ${g.nom.toLowerCase()}.`, "bon");
      }
    }
    if (e.metier) {
      v.metier = e.metier;
      this.poserFlag(`metier:${e.metier}`);
    }
    if (e.reve) {
      v.reve = e.reve;
      this.poserFlag(`reve:${e.reve}`);
    }
    if (e.reveAccompli && !v.reveAccompli) {
      v.reveAccompli = true;
      this.poserFlag("reve-accompli");
    }
    if (e.aller) this.voyager(e.aller);
    if (e.fruit) this.recevoirFruit(e.fruit);
    if (e.mangerFruitEnPoche && v.fruitEnPoche) {
      const f = this.fruit(v.fruitEnPoche);
      v.fruitEnPoche = undefined;
      if (f) this.manger(f);
    }
    if (e.vendreFruitEnPoche && v.fruitEnPoche) {
      this.poserFlag(`fruit-vendu:${v.fruitEnPoche}`);
      v.fruitEnPoche = undefined;
    }
    if (e.haki && !v.haki.includes(e.haki)) {
      v.haki.push(e.haki);
      this.poserFlag(`haki:${e.haki}`);
      const noms = { observation: "le Haki de l'observation", armement: "le Haki de l'armement", rois: "le Haki des rois" };
      this.ligne("gain", `Vous avez éveillé ${noms[e.haki]}.`, "bon");
    }
    if (e.revelerD && v.d && !v.dConnu) {
      v.dConnu = true;
      this.poserFlag("d-revele");
      this.ligne("gain", `Votre nom véritable : ${nomDeLaVie(v)}.`, "bon");
    }
    if (e.lien) for (const l of Array.isArray(e.lien) ? e.lien : [e.lien]) this.toucherLien(l, ctx);
    if (e.heriterRelique && this.volonte?.type === "relique" && this.contenu.reliques.some((r) => r.id === this.volonte!.valeur)) {
      this.poserFlag(`objet:${this.volonte.valeur}`);
    }
    if (e.blessure) {
      this.poserFlag(`blessure:${e.blessure}`);
      v.sante = Math.max(0, v.sante - 8);
    }
    if (e.planifier) {
      for (const p of Array.isArray(e.planifier) ? e.planifier : [e.planifier]) {
        v.planifies.push({ id: p.id, annee: v.annee + entre(this.rng, p.dans[0], p.dans[1]) });
      }
    }
    if (e.journal) this.ligne("recit", rendre(e.journal, v, ctx));
    for (const r of e.rencontre ? (Array.isArray(e.rencontre) ? e.rencontre : [e.rencontre]) : []) {
      if (!v.rencontres.includes(r)) v.rencontres.push(r);
    }
    if (e.clinOeil && !v.clins.includes(e.clinOeil)) v.clins.push(e.clinOeil);
    if (e.rumeur && !v.rumeurs.includes(e.rumeur)) v.rumeurs.push(e.rumeur);
    for (const m of e.metaFlags ?? []) this.poserFlag(`meta:${m}`);
    if (e.poneglyphe && !v.poneglyphes.includes(e.poneglyphe)) {
      v.poneglyphes.push(e.poneglyphe);
      this.poserFlag(`poneglyphe:${e.poneglyphe}`);
    }
    if (e.equipageNom) v.equipageNom = rendre(e.equipageNom, v, ctx);
    if (e.navire) v.navire = rendre(e.navire, v, ctx);
    if (e.surnom) v.surnom = rendre(e.surnom, v, ctx);
    if (e.suite) {
      if (enTete) this.file.unshift({ id: e.suite, verifier: false });
      else this.file.unshift({ id: e.suite, verifier: false });
    }
    if (e.mort) this.mourir(e.mort);
  }

  private poserFlag(f: string): void {
    const v = this.etat;
    if (!v.flags.includes(f)) v.flags.push(f);
    if (!v.flagsVus.includes(f)) v.flagsVus.push(f);
  }

  private poserPrime(montant: number): void {
    const v = this.etat;
    const avant = v.prime;
    v.prime = Math.max(0, Math.round(montant));
    v.primeMax = Math.max(v.primeMax, v.prime);
    if (v.prime > avant && avant === 0) this.poserFlag("recherche");
    if (v.prime > avant && !this.jumelle) {
      this.ligne("gain", `Prime : ${new Intl.NumberFormat("fr-FR").format(v.prime)} berrys.`, "neutre");
    }
  }

  private changerCamp(camp: Camp): void {
    const v = this.etat;
    if (v.camp === camp) return;
    v.camp = camp;
    v.grade = gradeEntree(camp)?.id;
    this.poserFlag(`camp:${camp}`);
    if (v.grade) this.poserFlag(`grade:${v.grade}`);
    if (this.jumelle) {
      v.focus = this.focusAuto();
      this.fait(`Devient ${campTexte(camp, v.sexe)}.`);
    }
  }

  private voyager(a: { ile?: string; zone?: import("./types.ts").Zone; tag?: string }): void {
    const v = this.etat;
    let cible = a.ile && ileExiste(a.ile) ? ileParId(a.ile) : undefined;
    if (!cible) {
      const candidates = ILES.filter((i) =>
        i.id !== v.ile &&
        (!a.zone || i.zone === a.zone) &&
        (!a.tag || i.tags.includes(a.tag)) &&
        (!i.habitee || (v.annee >= i.habitee[0] && v.annee <= i.habitee[1])) &&
        i.zone !== "impel-down" && i.id !== "red-line-ruines");
      cible = pondere(this.rng, candidates, (i) => (i.anonyme ? i.poids * 0.3 : Math.max(1, i.poids)));
    }
    if (!cible) return;
    v.ile = cible.id;
    v.zone = cible.zone;
    v.nomIle = cible.anonyme ? nomIleAnonyme(this.rng, cible.zone) : cible.nom;
    if (!v.zonesVisitees.includes(cible.zone)) {
      v.zonesVisitees.push(cible.zone);
      this.poserFlag(`zone:${cible.zone}`);
    }
    if (!v.ilesVisitees.includes(cible.id)) v.ilesVisitees.push(cible.id);
    this.poserFlag(`ile:${cible.id}`);
  }

  private recevoirFruit(e: EffetFruit): void {
    const v = this.etat;
    const pris = new Set<string>();
    for (const j of [v, ...this.jumeaux.map((x) => x.etat)]) if (j.fruit) pris.add(j.fruit);
    const candidats = this.contenu.fruits.filter((f) =>
      (!e.id || f.id === e.id) &&
      (!e.type || e.type.includes(f.type)) &&
      f.rarete <= (e.rareteMax ?? (e.id ? 5 : 3)) &&
      !pris.has(f.id) &&
      (!f.libre || f.libre.some(([a, b]) => v.annee >= a && v.annee <= b)));
    // Un fruit hérité retrouve d'abord celui de la vie passée, s'il est libre.
    const ancien = e.mode === "herite" && !e.id && this.volonte?.type === "fruit" && !pris.has(this.volonte.valeur)
      ? this.contenu.fruits.find((x) => x.id === this.volonte!.valeur) : undefined;
    const f = ancien ?? pondere(this.rng, candidats, (x) => POIDS_RARETE_FRUIT[x.rarete] ?? 1);
    if (!f) return;
    this.poserFlag(`fruit-${e.mode}`);
    if (e.manger === false) {
      v.fruitEnPoche = f.id;
      return;
    }
    this.manger(f);
  }

  private manger(f: Fruit): void {
    const v = this.etat;
    if (v.fruit && !v.traits.includes("corps-singulier")) {
      this.ligne("recit", "Un second fruit. Votre corps se déchire de l'intérieur — on ne mange pas deux fruits du démon.", "mauvais");
      this.mourir("deux-fruits");
      return;
    }
    if (v.fruit) this.poserFlag("deux-fruits");
    v.fruit = f.id;
    v.fruitsManges++;
    this.poserFlag("fruit");
    this.poserFlag(`fruit:${f.id}`);
    this.poserFlag("ne-nage-plus");
    for (const j of JAUGES) {
      const d = f.bonus[j];
      if (d) v.jauges[j] = Math.max(0, Math.min(100, v.jauges[j] + d));
    }
    this.ligne("gain", `${f.nom} — ${f.description}`, "bon");
    if (this.jumelle) this.fait(`A mangé ${f.surnom}.`);
  }

  private toucherLien(l: EffetLien, ctx: ContexteTexte): void {
    const v = this.etat;
    // Le compagnon nommé dans le texte est celui que l'effet touche.
    const viser = (role: Role) => (role === "compagnon" && ctx.compagnon?.vivant && !ctx.compagnon.parti ? ctx.compagnon : lienActif(v, role));
    if (l.creer) {
      const sexe: Sexe = l.sexe ?? (l.creer === "amour" || l.creer === "conjoint"
        ? (this.rng() < 0.88 ? (v.sexe === "h" ? "f" : "h") : v.sexe)
        : this.rng() < 0.5 ? "h" : "f");
      const nom = l.nom ?? prenom(this.rng, sexe, v.peuple === "humain" ? "humain" : v.peuple, v.zone);
      v.liens.push({ id: v.prochainLien++, role: l.creer, nom, sexe, vivant: true, parti: false, metier: l.metier, depuis: v.age });
      this.poserFlag(`lien:${l.creer}`);
      if (l.creer === "capitaine" && !v.equipageNom) v.equipageNom = `l'équipage de ${nom}`;
    }
    if (l.mort) {
      const cible = viser(l.mort);
      if (cible) {
        cible.vivant = false;
        this.poserFlag(`deuil:${l.mort}`);
      }
    }
    if (l.perdre) {
      const cible = viser(l.perdre);
      if (cible) cible.parti = true;
    }
    if (l.devient) {
      const cible = viser(l.devient.de);
      if (cible) {
        cible.role = l.devient.vers;
        this.poserFlag(`lien:${l.devient.vers}`);
      }
    }
  }

  private recevoirVolonte(vo: Volonte): void {
    const v = this.etat;
    this.poserFlag(`volonte:${vo.type}`);
    this.poserFlag(`volonte:${vo.type}:${vo.valeur}`);
    if (this.idx.parId.has(`volonte-${vo.type}`)) {
      v.planifies.push({ id: `volonte-${vo.type}`, annee: v.annee + entre(this.rng, 7, 14) * v.pas });
    }
  }

  // ── La fin du tour ──

  private finirTour(): void {
    const v = this.etat;
    this.tourOuvert = false;
    const age = ageEchelle(v);

    if (v.age > 0) this.grandir(age);
    v.compteurs[`annees:${v.camp}`] = (v.compteurs[`annees:${v.camp}`] ?? 0) + v.pas;

    v.grille.push({ age: v.age, annee: v.annee, camp: v.camp, zone: v.zone, tension: this.tensionTour, marque: this.marqueTour });

    if (v.age > 0 && v.vivant) this.peutMourir(age);

    if (!this.jumelle && v.vivant) this.lesJumeauxVivent();
  }

  private grandir(age: number): void {
    const v = this.etat;
    const rythme = age < 6 ? 0.4 : age < 13 ? 1.6 : age < 31 ? 2.4 : age < 51 ? 1.5 : 0.7;
    for (let k = 0; k < v.pas; k++) {
      if (v.focus === "repos") {
        v.sante = Math.min(100, v.sante + 4);
      } else {
        const j = v.focus;
        const actuel = v.jauges[j];
        let gain = rythme * (1 - actuel / 115) * (0.6 + this.rng() * 0.8);
        if (j === "haki") {
          gain *= v.haki.length ? 0.9 : 0.45;
          if (actuel >= v.potentielHaki) gain *= 0.1;
        }
        v.jauges[j] = Math.min(100, actuel + gain);
      }
      // Le temps use.
      if (age >= 55) v.jauges.force = Math.max(0, v.jauges.force - (age >= 70 ? 1.5 : 0.7));
      if (age >= 40) v.sante = Math.max(0, v.sante - (age >= 65 ? 1.6 : 0.6));
      if (age >= 25 && v.focus !== "equipage") v.jauges.equipage = Math.max(0, v.jauges.equipage - 0.15);
    }
    for (const j of JAUGES) v.jauges[j] = Math.round(v.jauges[j] * 10) / 10;
  }

  /** Risque de mourir cette année, par composante. */
  risques(): { enfance: number; usure: number; violence: number } {
    const v = this.etat;
    const age = ageEchelle(v);
    const classe = v.classe === "pauvre" ? 2 : v.classe === "esclave" ? 3 : v.classe === "noble" || v.classe === "celeste" ? 0.5 : 1;
    const enfance = (age < 1 ? 0.035 : age < 5 ? 0.008 : age < 15 ? 0.0015 : 0) * classe;
    const usure = 0.00012 * Math.exp(0.088 * age);
    let violence = age < 14 ? 0 : 0.0025 * ZONES[v.zone].danger * RISQUE_CAMP[v.camp];
    if (v.prime > 0) violence *= 1 + Math.log10(Math.max(10, v.prime)) / 12;
    if (v.flags.includes("prisonnier")) violence *= 1.5;
    const forme = v.sante < 20 ? 3 : v.sante < 40 ? 1.6 : v.sante > 85 ? 0.75 : 1;
    const solidite = Math.max(0.35, 1 - this.puissance() / 160);
    return { enfance: enfance * forme, usure: usure * forme, violence: violence * solidite };
  }

  private peutMourir(age: number): void {
    const v = this.etat;
    const r = this.risques();
    const total = 1 - Math.pow(1 - Math.min(0.95, r.enfance + r.usure + r.violence), v.pas);
    if (this.rng() >= total) return;
    const tirage = this.rng() * (r.enfance + r.usure + r.violence);
    let cause: string;
    if (tirage < r.enfance) cause = this.rng() < 0.6 ? "fievre-enfance" : "maladie";
    else if (tirage < r.enfance + r.usure) cause = age >= 62 ? (this.rng() < 0.7 ? "vieillesse" : "coeur") : this.rng() < 0.6 ? "maladie" : "coeur";
    else cause = this.causeViolente();
    this.mourir(cause);
  }

  private causeViolente(): string {
    const v = this.etat;
    const enMer = v.camp === "pirate" || v.camp === "marine" || v.metier === "pecheur" || v.metier === "navigateur";
    const options: [string, number][] = [
      ["accident", 2],
      ["naufrage", enMer ? 4 : 0.5],
      ["roi-des-mers", enMer && v.zone !== "east-blue" ? 2 : 0.2],
      ["pirates-raid", v.camp === "civil" ? 3 : 0.5],
      ["combat", v.camp === "civil" ? 0.5 : 5],
      ["execution", v.prime > 0 ? 1.5 : 0],
      ["noye-fruit", v.flags.includes("ne-nage-plus") && enMer ? 3 : 0],
      ["tempete-grand-line", v.zone === "paradis" || v.zone === "nouveau-monde" ? 2 : 0],
      ["epuisement", v.camp === "esclave" ? 6 : 0],
      ["prison", v.flags.includes("prisonnier") ? 5 : 0],
    ];
    return pondere(this.rng, options, ([, w]) => w)?.[0] ?? "accident";
  }

  mourir(cause: string): void {
    const v = this.etat;
    if (!v.vivant) return;
    v.vivant = false;
    const m = this.idx.morts.get(cause);
    // Une seule passe de rendu : le libellé suit une virgule, il garde sa minuscule.
    const texte = `{prenom} est mort{/e} à {age} ans, ${m?.libelle ?? "de causes inconnues"}.`;
    v.mort = { id: cause, age: v.age, annee: v.annee, texte: rendre(texte, v) };
    this.poserFlag(`mort:${cause}`);
    this.file = [];
    this.enAttente = null;
    this.enCours = null;
    this.tourOuvert = false;
    if (v.grille.length === 0 || v.grille[v.grille.length - 1].annee !== v.annee) {
      v.grille.push({ age: v.age, annee: v.annee, camp: v.camp, zone: v.zone, tension: 5, marque: "La fin" });
    }
    this.ligne("mort", v.mort.texte);
    if (this.jumelle) this.fait(v.mort.texte);
  }

  private lesJumeauxVivent(): void {
    for (const j of this.jumeaux) {
      if (!j.etat.vivant) continue;
      const etaitVivant = j.etat.vivant;
      while (j.etat.annee < this.etat.annee && j.etat.vivant) j.avancerAuto();
      if (etaitVivant && !j.etat.vivant) {
        this.ligne("jumeau", `Quelque part, ${zoneTexte(j.etat.zone)}, la Vivre Card de ${j.nom} achève de se consumer.`);
      }
      const cle = `prime:${j.etat.graine}`;
      if (j.etat.prime >= 30_000_000 && !this.annonces.has(cle) && this.journauxAccessibles()) {
        this.annonces.add(cle);
        this.ligne("monde", `Le journal publie un nouvel avis de recherche : ${j.nom}, ${new Intl.NumberFormat("fr-FR").format(j.etat.prime)} berrys. Ce visage ne vous dit rien.`);
      }
    }
  }

  // ── Divers ──

  private focusAuto(): Jauge | "repos" {
    const v = this.etat;
    const r = this.rng();
    if (v.camp === "pirate" || v.camp === "marine" || v.camp === "chasseur") return r < 0.6 ? "force" : r < 0.8 ? "haki" : "equipage";
    if (v.classe === "savant" || v.classe === "noble") return r < 0.6 ? "savoir" : "equipage";
    return r < 0.35 ? "equipage" : r < 0.6 ? "savoir" : r < 0.9 ? "force" : "haki";
  }

  private ligne(type: TypeLigne, texte: string, ton?: Ligne["ton"], projection?: boolean): void {
    const v = this.etat;
    const l: Ligne = { age: v.age, annee: v.annee, type, texte, ton, projection: projection || undefined };
    this.sortie.push(l);
    if (!this.jumelle) v.journal.push(l);
  }

  private fait(texte: string): void {
    const v = this.etat;
    v.faits.push({ age: v.age, annee: v.annee, type: "jumeau", texte });
    if (v.faits.length > 40) v.faits.shift();
  }

  /** Un texte du contenu rendu pour cette vie (pour l'interface). */
  rendre(t: Texte, ctx: ContexteTexte = {}): string {
    return rendre(choisirVariante(t, this.rng), this.etat, ctx);
  }
}

export function tirerMonde(graine: number): string {
  const rng = creerRng(hacher(`${graine}:monde`));
  return pondere(rng, Object.keys(MONDES), (m) => MONDES[m].poids) ?? "aube";
}

export function campTexte(camp: Camp, sexe: Sexe): string {
  const f = sexe === "f";
  switch (camp) {
    case "civil": return f ? "civile" : "civil";
    case "pirate": return "pirate";
    case "marine": return f ? "soldate de la Marine" : "soldat de la Marine";
    case "revolution": return f ? "révolutionnaire" : "révolutionnaire";
    case "cipher-pol": return "agent du Cipher Pol";
    case "chasseur": return f ? "chasseuse de primes" : "chasseur de primes";
    case "pegre": return "membre de la pègre";
    case "esclave": return "esclave";
    case "celeste": return "Dragon Céleste";
  }
}

export function zoneTexte(zone: import("./types.ts").Zone): string {
  const z = ZONES[zone].nom;
  if (zone === "wano") return "au pays de Wano";
  if (zone === "fond-marin") return "sur l'île des Hommes-Poissons";
  if (zone === "ciel") return "sur les îles célestes";
  if (zone === "elbaf") return "à Elbaf";
  if (zone === "red-line") return "à Marie-Joie";
  if (zone === "impel-down") return "à Impel Down";
  if (zone === "calm-belt") return "dans la Calm Belt";
  if (zone === "paradis") return "sur Grand Line";
  if (zone === "nouveau-monde") return "dans le Nouveau Monde";
  return `en ${z}`;
}
