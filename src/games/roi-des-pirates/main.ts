import { startEngine } from "./engine";
import { STORY } from "./story";

// L'écran d'accueil propose les deux modes ; l'Aventure démarre sur place.
const choix = document.getElementById("mode-choix");
const scene = document.getElementById("scene");
const jauges = document.querySelector<HTMLElement>(".stats-bar");
if (jauges) jauges.style.visibility = "hidden";
document.getElementById("mode-aventure")?.addEventListener("click", () => {
  if (choix) choix.hidden = true;
  if (scene) scene.hidden = false;
  if (jauges) jauges.style.visibility = "";
  startEngine(STORY);
});
