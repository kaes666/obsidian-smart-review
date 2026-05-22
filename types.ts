// ─────────────────────────────────────────────────────────
// TYPES PARTAGÉS — smart-review plugin
// ─────────────────────────────────────────────────────────

import { TFile } from "obsidian";

/** Action prise par l'utilisateur sur une note lors de la révision */
export type ReviewAction = "valid" | "update" | "archive" | "skip";

/** Historique d'une révision */
export interface ReviewEntry {
  path: string;          // Chemin de la note
  reviewedAt: number;    // Timestamp UNIX (ms)
  action: ReviewAction;
}

/** Données persistées dans data.json */
export interface PluginData {
  history: ReviewEntry[];          // Toutes les révisions passées
  snoozed: Record<string, number>; // path → timestamp de dé-snooze
  lastDigestDate: string;          // "YYYY-MM-DD" — pour ne générer le digest qu'une fois par jour
}

export const DEFAULT_PLUGIN_DATA: PluginData = {
  history: [],
  snoozed: {},
  lastDigestDate: "",
};
