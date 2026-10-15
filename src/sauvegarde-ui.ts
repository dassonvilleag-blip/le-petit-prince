// Bouton « Mes parties » de l'accueil : export (fichier ou code), import, et
// rappel discret quand le dernier export date.

import {
  collecter,
  jeuxConcernes,
  lire,
  nomFichier,
  noterExport,
  rappelNecessaire,
  restaurer,
  versCode,
  CLE_DERNIER_EXPORT,
  type Sauvegarde,
} from "./sauvegarde.ts";

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// localStorage peut être bloqué (navigation privée stricte) : on n'affiche rien.
function stockage(): Storage | null {
  try {
    const st = window.localStorage;
    st.getItem(CLE_DERNIER_EXPORT);
    return st;
  } catch {
    return null;
  }
}

const st = stockage();

if (st) {
  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.className = "pp-sauvegarde-btn";
  bouton.innerHTML = `💾 <span>Mes parties</span>`;
  document.body.appendChild(bouton);

  const voile = document.createElement("div");
  voile.className = "pp-voile";
  voile.hidden = true;
  document.body.appendChild(voile);

  const majRappel = (): void => {
    bouton.classList.toggle("rappel", rappelNecessaire(st));
    bouton.title = rappelNecessaire(st) ? "Pense à sauvegarder tes parties" : "Sauvegarder / restaurer tes parties";
  };
  majRappel();

  const dernierExport = (): string => {
    const t = Number(st.getItem(CLE_DERNIER_EXPORT) ?? 0);
    if (!t) return "jamais";
    const j = Math.floor((Date.now() - t) / 86_400_000);
    return j === 0 ? "aujourd'hui" : j === 1 ? "hier" : `il y a ${j} jours`;
  };

  const fermer = (): void => {
    voile.hidden = true;
    voile.innerHTML = "";
    majRappel();
  };

  const ouvrir = (): void => {
    const s = collecter(st);
    const jeux = jeuxConcernes(s.donnees);
    voile.innerHTML = `
      <div class="pp-fenetre" role="dialog" aria-modal="true" aria-labelledby="pp-titre">
        <button type="button" class="pp-fermer" data-pp="fermer" aria-label="Fermer">✕</button>
        <h2 id="pp-titre">💾 Mes parties</h2>
        <p class="pp-doux">Tes parties vivent dans ce navigateur. Vider les cookies et données de site les efface : garde une copie.</p>

        <h3>Sauvegarder</h3>
        ${
          jeux.length
            ? `<p>${jeux.length} jeu${jeux.length > 1 ? "x" : ""} : ${jeux.map(esc).join(", ")}.</p>
               <div class="pp-actions">
                 <button type="button" class="pp-btn" data-pp="fichier">Télécharger le fichier</button>
                 <button type="button" class="pp-btn pp-btn-2" data-pp="copier">Copier le code</button>
               </div>`
            : `<p class="pp-doux">Aucune partie dans ce navigateur pour l'instant.</p>`
        }
        <p class="pp-doux">Dernière sauvegarde : ${dernierExport()}.</p>
        <p class="pp-message" id="pp-msg-export" aria-live="polite"></p>

        <h3>Restaurer</h3>
        <div class="pp-actions">
          <label class="pp-btn pp-btn-2">Choisir un fichier<input type="file" accept=".json,application/json" data-pp="choisir" hidden /></label>
        </div>
        <textarea id="pp-code" rows="3" placeholder="…ou colle ton code ici (PPSAVE1:…)"></textarea>
        <div class="pp-actions">
          <button type="button" class="pp-btn pp-btn-2" data-pp="coller">Restaurer ce code</button>
        </div>
        <p class="pp-message" id="pp-msg-import" aria-live="polite"></p>
      </div>`;
    voile.hidden = false;
  };

  const message = (id: string, texte: string, erreur = false): void => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = texte;
    el.classList.toggle("erreur", erreur);
  };

  // Demande confirmation en listant ce qui va être remplacé.
  const proposer = (s: Sauvegarde): void => {
    const jeux = jeuxConcernes(s.donnees);
    if (!jeux.length) return message("pp-msg-import", "Cette sauvegarde est vide.", true);
    const quand = new Date(s.date).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
    const zone = document.getElementById("pp-msg-import")!;
    zone.classList.remove("erreur");
    zone.innerHTML = `
      Sauvegarde du ${esc(quand)} : ${jeux.map(esc).join(", ")}.<br />
      Les parties actuelles de ces jeux seront <b>remplacées</b>. Ferme d'abord les onglets de jeux ouverts.
      <span class="pp-actions"><button type="button" class="pp-btn" data-pp="confirmer">Restaurer</button></span>`;
    enAttente = s;
  };

  let enAttente: Sauvegarde | null = null;

  bouton.addEventListener("click", ouvrir);
  voile.addEventListener("click", async (ev) => {
    if (ev.target === voile) return fermer();
    const el = (ev.target as Element).closest<HTMLElement>("[data-pp]");
    if (!el) return;
    switch (el.dataset.pp) {
      case "fermer":
        fermer();
        break;
      case "fichier": {
        const s = collecter(st);
        const blob = new Blob([JSON.stringify(s, null, 1)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = nomFichier();
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        noterExport(st);
        message("pp-msg-export", "Fichier téléchargé. Range-le hors du navigateur (Documents, cloud…).");
        break;
      }
      case "copier": {
        const code = versCode(collecter(st));
        try {
          await navigator.clipboard.writeText(code);
          noterExport(st);
          message("pp-msg-export", `Code copié (${Math.round(code.length / 1024)} Ko). Colle-le dans une note ou un mail à toi-même.`);
        } catch {
          const zone = document.getElementById("pp-code") as HTMLTextAreaElement;
          zone.value = code;
          zone.select();
          noterExport(st);
          message("pp-msg-export", "Copie automatique refusée : le code est sélectionné dans la zone ci-dessous, fais Ctrl+C.");
        }
        break;
      }
      case "coller": {
        const texte = (document.getElementById("pp-code") as HTMLTextAreaElement).value;
        try {
          proposer(lire(texte));
        } catch (e) {
          message("pp-msg-import", (e as Error).message, true);
        }
        break;
      }
      case "confirmer":
        if (!enAttente) break;
        restaurer(st, enAttente);
        enAttente = null;
        message("pp-msg-import", "Parties restaurées ✔ Tu peux relancer tes jeux.");
        break;
    }
  });

  voile.addEventListener("change", async (ev) => {
    const input = ev.target as HTMLInputElement;
    if (input.dataset.pp !== "choisir" || !input.files?.[0]) return;
    try {
      proposer(lire(await input.files[0].text()));
    } catch (e) {
      message("pp-msg-import", (e as Error).message, true);
    }
    input.value = "";
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !voile.hidden) fermer();
  });
}
