// src/games/chateau/fly-controls.ts
// Caméra façon jeu de gestion (Zoo Tycoon et consorts) : ZQSD pour se déplacer, molette
// pour zoomer, ctrl + clic gauche maintenu + glisser pour regarder autour. Remplace
// l'orbite autour d'un point fixe (rejetée : impossible de se déplacer latéralement,
// sensation trop contrainte pour un bac à sable de construction).
import * as THREE from "three";

const MOVE_SPEED = 10; // unités monde par seconde
const ZOOM_SPEED = 0.02; // unités monde par unité de deltaY de la molette
const LOOK_SENSITIVITY = 0.0025; // radians par pixel de glissement souris
const MAX_PITCH = Math.PI / 2 - 0.01; // évite le retournement (gimbal flip) à la verticale stricte

// event.code identifie la touche physique, pas le caractère produit : sur un clavier
// AZERTY, la touche "Z" a le code "KeyW" (même position physique que le W d'un clavier
// QWERTY), "Q" a le code "KeyA", etc. Utiliser .code fait donc fonctionner ZQSD sur AZERTY
// et WASD sur QWERTY avec exactement le même code, sans détection de disposition.
const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);

/** Quaternion de visée pour un lacet/tangage donnés (ordre YXZ, convention FPS standard —
 * le même ordre que three.js utilise dans ses propres PointerLockControls). */
export function lookQuaternion(yaw: number, pitch: number): THREE.Quaternion {
  const euler = new THREE.Euler(pitch, yaw, 0, "YXZ");
  return new THREE.Quaternion().setFromEuler(euler);
}

export function clampPitch(pitch: number): number {
  return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch));
}

export interface FlyControls {
  update(deltaSeconds: number): void;
}

export function createFlyControls(camera: THREE.PerspectiveCamera, domElement: HTMLElement): FlyControls {
  const initialEuler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
  let yaw = initialEuler.y;
  let pitch = clampPitch(initialEuler.x);

  const pressed = new Set<string>();
  window.addEventListener("keydown", (event) => {
    if (MOVE_KEYS.has(event.code)) pressed.add(event.code);
  });
  window.addEventListener("keyup", (event) => {
    pressed.delete(event.code);
  });
  // Si la fenêtre perd le focus (alt-tab, etc.) en pleine avancée, la touche relâchée
  // ailleurs ne déclenche jamais "keyup" ici — sans ce filet, la caméra continuerait
  // de foncer indéfiniment.
  window.addEventListener("blur", () => pressed.clear());

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  // Ctrl + clic gauche démarre le regard caméra — le clic gauche seul est déjà pris par la
  // pose de pièce (main.ts) ; celui-ci vérifie lui-même event.ctrlKey pour ignorer le clic
  // tant que ctrl est enfoncé, donc les deux gestes ne se marchent jamais dessus.
  domElement.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !event.ctrlKey) return;
    event.preventDefault();
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
  });

  window.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    yaw -= dx * LOOK_SENSITIVITY;
    pitch = clampPitch(pitch - dy * LOOK_SENSITIVITY);
    camera.quaternion.copy(lookQuaternion(yaw, pitch));
  });

  window.addEventListener("pointerup", (event) => {
    if (event.button === 0) dragging = false;
  });

  // Molette = avancer/reculer le long de l'axe de visée, comme un zoom.
  domElement.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(forward, -event.deltaY * ZOOM_SPEED);
    },
    { passive: false },
  );

  function update(deltaSeconds: number): void {
    if (pressed.size === 0) return;
    // Lus directement depuis camera.quaternion (pas via getWorldDirection/matrixWorld,
    // qui ne se met à jour qu'au rendu) : la rotation appliquée pendant ce même repaint
    // par le glissement souris est donc immédiatement prise en compte pour le déplacement.
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    // Le déplacement latéral reste horizontal même en regardant vers le haut/bas — seule
    // l'avancée/le recul suit le tangage, ce qui permet de monter/descendre en avançant
    // tout en regardant vers le haut/bas, comme une caméra de survol classique.
    right.y = 0;
    if (right.lengthSq() > 0) right.normalize();

    move.set(0, 0, 0);
    if (pressed.has("KeyW")) move.add(forward);
    if (pressed.has("KeyS")) move.sub(forward);
    if (pressed.has("KeyD")) move.add(right);
    if (pressed.has("KeyA")) move.sub(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(MOVE_SPEED * deltaSeconds);
      camera.position.add(move);
    }
  }

  return { update };
}
