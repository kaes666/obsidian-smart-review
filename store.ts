// ─────────────────────────────────────────────────────────
// STORE — Persistance via data.json (API Obsidian standard)
// ─────────────────────────────────────────────────────────

import { Plugin } from "obsidian";
import { PluginData, ReviewEntry, ReviewAction, DEFAULT_PLUGIN_DATA } from "./types";

export class ReviewStore {
  private plugin: Plugin;
  private data: PluginData;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
    this.data = { ...DEFAULT_PLUGIN_DATA };
  }

  async load() {
    const saved = await this.plugin.loadData();
    this.data = Object.assign({ ...DEFAULT_PLUGIN_DATA }, saved ?? {});
  }

  async save() {
    await this.plugin.saveData(this.data);
  }

  async recordAction(path: string, action: ReviewAction) {
    const entry: ReviewEntry = {
      path,
      reviewedAt: Date.now(),
      action,
    };
    this.data.history.push(entry);

    // Si l'utilisateur archive, on ne re-propose pas avant 90 jours
    if (action === "archive") {
      this.snooze(path, 90);
    }

    await this.save();
  }

  snooze(path: string, days: number) {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    this.data.snoozed[path] = until;
  }

  isSnoozed(path: string): boolean {
    const until = this.data.snoozed[path];
    if (!until) return false;
    if (Date.now() > until) {
      delete this.data.snoozed[path]; // snooze expiré
      return false;
    }
    return true;
  }

  getLastDigestDate(): string {
    return this.data.lastDigestDate;
  }

  async setLastDigestDate(date: string) {
    this.data.lastDigestDate = date;
    await this.save();
  }

  getHistory(): ReviewEntry[] {
    return this.data.history;
  }
}
