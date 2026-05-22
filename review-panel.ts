// ─────────────────────────────────────────────────────────
// REVIEW PANEL — Panneau latéral (ItemView Obsidian)
// ─────────────────────────────────────────────────────────

import { ItemView, WorkspaceLeaf, TFile, setIcon } from "obsidian";
import type SmartReviewPlugin from "./main";
import { NoteScore } from "./scorer";
import { ReviewAction } from "./types";

export const REVIEW_VIEW_TYPE = "smart-review-panel";

export class ReviewPanelView extends ItemView {
  plugin: SmartReviewPlugin;
  private notes: NoteScore[] = [];

  constructor(leaf: WorkspaceLeaf, plugin: SmartReviewPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return REVIEW_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Smart Review";
  }

  getIcon(): string {
    return "brain";
  }

  async onOpen() {
    await this.refresh();
  }

  async onClose() {}

  // ── Chargement et rendu ──────────────────────────────────
  async refresh() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();

    // Header
    const header = container.createDiv({ cls: "sr-header" });
    header.createEl("h4", { text: "Smart Review" });
    const refreshBtn = header.createEl("button", { cls: "sr-refresh-btn" });
    setIcon(refreshBtn, "refresh-cw");
    refreshBtn.title = "Rafraîchir";
    refreshBtn.onclick = () => this.refresh();

    // Chargement des notes
    const loading = container.createDiv({ cls: "sr-loading", text: "Analyse du coffre…" });

    this.notes = await this.plugin.scorer.getTopNotes(
      this.plugin.settings.notesPerSession
    );

    loading.remove();

    if (this.notes.length === 0) {
      container.createDiv({
        cls: "sr-empty",
        text: "🎉 Rien à réviser ! Toutes tes notes sont récentes ou bien connectées.",
      });
      return;
    }

    // Liste des notes
    const list = container.createDiv({ cls: "sr-list" });

    for (const noteScore of this.notes) {
      // Vérifier si la note est snoozée
      if (this.plugin.store.isSnoozed(noteScore.file.path)) continue;

      this.renderNoteCard(list, noteScore);
    }
  }

  // ── Carte d'une note ─────────────────────────────────────
  private renderNoteCard(container: HTMLElement, ns: NoteScore) {
    const card = container.createDiv({ cls: "sr-card" });

    // Titre cliquable → ouvre la note
    const title = card.createEl("a", {
      cls: "sr-note-title",
      text: ns.file.basename,
    });
    title.onclick = () => {
      this.app.workspace.getLeaf(false).openFile(ns.file);
    };

    // Métadonnées
    const meta = card.createDiv({ cls: "sr-meta" });
    meta.createSpan({ text: `${ns.daysSinceModified}j · ${ns.backlinkCount} liens · score ${ns.score}` });

    // Barre de score visuelle
    const barWrap = card.createDiv({ cls: "sr-bar-wrap" });
    const bar = barWrap.createDiv({ cls: "sr-bar" });
    bar.style.width = `${ns.score}%`;
    // Couleur selon urgence
    bar.addClass(ns.score >= 70 ? "sr-bar-high" : ns.score >= 40 ? "sr-bar-mid" : "sr-bar-low");

    // Actions
    const actions = card.createDiv({ cls: "sr-actions" });
    this.addActionBtn(actions, "check", "Toujours valide", "valid", ns);
    this.addActionBtn(actions, "pencil", "À mettre à jour", "update", ns);
    this.addActionBtn(actions, "archive", "Archiver", "archive", ns);
    this.addActionBtn(actions, "skip-forward", "Passer", "skip", ns);
  }

  // ── Bouton d'action ──────────────────────────────────────
  private addActionBtn(
    container: HTMLElement,
    icon: string,
    tooltip: string,
    action: ReviewAction,
    ns: NoteScore
  ) {
    const btn = container.createEl("button", { cls: "sr-action-btn" });
    setIcon(btn, icon);
    btn.title = tooltip;
    btn.onclick = async () => {
      await this.plugin.store.recordAction(ns.file.path, action);
      // Retirer la carte avec animation
      const card = btn.closest(".sr-card") as HTMLElement;
      if (card) {
        card.addClass("sr-card-exit");
        setTimeout(() => {
          card.remove();
          // Si plus de cartes, afficher le message succès
          const remaining = this.containerEl.querySelectorAll(".sr-card");
          if (remaining.length === 0) {
            const list = this.containerEl.querySelector(".sr-list");
            list?.createDiv({
              cls: "sr-empty",
              text: "🎉 Session terminée !",
            });
          }
        }, 300);
      }
    };
  }
}
