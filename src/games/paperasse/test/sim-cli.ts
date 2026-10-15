import { jouer } from "./sim.ts";

const r = jouer({ trace: process.argv.includes("--trace"), graine: Number(process.argv[2]) || 42 });
for (const l of r.log) console.log(l);
const f = (s: number): string => `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
console.log("phases :", r.phases.map(f).join(" | "), " total :", f(r.total), r.fini ? "FINI" : "PAS FINI");
