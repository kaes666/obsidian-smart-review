// ─────────────────────────────────────────────────────────
// MAIN — Entry point du plugin Smart Review
// ─────────────────────────────────────────────────────────

import { Plugin, WorkspaceLeaf } from "obsidian";
import { SmartReviewSettings, DEFAULT_SETTINGS, SmartReviewSettingTab } from "./settings";
import { NoteScorer } from "./scorer";
import { ReviewStore } from "./store";
import { ReviewPanelView, REVIEW_VIEW_TYPE } from "./review-panel";

export default class SmartReviewPlugin extends Plugin {
  settings: SmartReviewSettings = null!;
  store: ReviewStore = null!;
  scorer: NoteScorer = null!;

  async onload() {
    // 1. Charger settings et store
    await this.loadSettings();
    this.store = new ReviewStore(this);
    await this.store.load();

    // 2. Initialiser le scorer avec les settings courants
    this.scorer = new NoteScorer(this.app, this.settings);

    // 3. Enregistrer la vue panneau latéral
    this.registerView(
      REVIEW_VIEW_TYPE,
      (leaf) => new ReviewPanelView(leaf, this)
    );

    // 4. Commande : ouvrir le panneau de révision
    this.addCommand({
      id: "open-review-panel",
      name: "Ouvrir le panneau Smart Review",
      callback: () => this.activateView(),
    });

    // 5. Icône dans la barre latérale
    this.addRibbonIcon("brain", "Smart Review", () => this.activateView());

    // 6. Onglet settings
    this.addSettingTab(new SmartReviewSettingTab(this.app, this));

    console.log("Smart Review chargé.");
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(REVIEW_VIEW_TYPE);
  }

  // ── Ouvrir / révéler le panneau latéral ─────────────────
  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const existing = workspace.getLeavesOfType(REVIEW_VIEW_TYPE);

    if (existing.length > 0) {
      leaf = existing[0] ?? null;
    } else {
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({ type: REVIEW_VIEW_TYPE, active: true });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  // ── Reload scorer quand les settings changent ────────────
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    // Re-instancier le scorer avec les nouveaux settings
    this.scorer = new NoteScorer(this.app, this.settings);
  }
}
