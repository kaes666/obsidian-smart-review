// ─────────────────────────────────────────────────────────
// SETTINGS — SettingTab Obsidian
// ─────────────────────────────────────────────────────────

import { App, PluginSettingTab, Setting } from "obsidian";
import type SmartReviewPlugin from "./main";
import { ScorerSettings, DEFAULT_SCORER_SETTINGS, FolderRule } from "./scorer";

export interface SmartReviewSettings extends ScorerSettings {
  notesPerSession: number;
  injectInDailyNote: boolean;
}

export const DEFAULT_SETTINGS: SmartReviewSettings = {
  ...DEFAULT_SCORER_SETTINGS,
  notesPerSession: 5,
  injectInDailyNote: false,
};

export class SmartReviewSettingTab extends PluginSettingTab {
  plugin: SmartReviewPlugin;

  constructor(app: App, plugin: SmartReviewPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Smart Review" });

    // ── Général ──────────────────────────────────────────
    containerEl.createEl("h3", { text: "Général" });

    new Setting(containerEl)
      .setName("Notes par session")
      .setDesc("Combien de notes à réviser par jour.")
      .addSlider((s) =>
        s.setLimits(1, 20, 1)
          .setValue(this.plugin.settings.notesPerSession)
          .setDynamicTooltip()
          .onChange(async (val) => {
            this.plugin.settings.notesPerSession = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Seuil de récence (jours)")
      .setDesc("Les notes modifiées dans ce délai sont ignorées.")
      .addSlider((s) =>
        s.setLimits(1, 30, 1)
          .setValue(this.plugin.settings.recentThresholdDays)
          .setDynamicTooltip()
          .onChange(async (val) => {
            this.plugin.settings.recentThresholdDays = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Injection Daily Note")
      .setDesc("Ajouter automatiquement un bloc de révision dans la note quotidienne.")
      .addToggle((t) =>
        t.setValue(this.plugin.settings.injectInDailyNote)
          .onChange(async (val) => {
            this.plugin.settings.injectInDailyNote = val;
            await this.plugin.saveSettings();
          })
      );

    // ── Exclusions ────────────────────────────────────────
    containerEl.createEl("h3", { text: "Exclusions" });

    new Setting(containerEl)
      .setName("Dossiers exclus")
      .setDesc("Un dossier par ligne. Ces dossiers sont complètement ignorés.")
      .addTextArea((t) =>
        t.setValue(this.plugin.settings.excludedFolders.join("\n"))
          .onChange(async (val) => {
            this.plugin.settings.excludedFolders = val.split("\n").map((s) => s.trim()).filter(Boolean);
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Tags prioritaires")
      .setDesc("Un tag par ligne (ex: #important). Ces notes remontent en priorité.")
      .addTextArea((t) =>
        t.setValue(this.plugin.settings.priorityTags.join("\n"))
          .onChange(async (val) => {
            this.plugin.settings.priorityTags = val.split("\n").map((s) => s.trim()).filter(Boolean);
            await this.plugin.saveSettings();
          })
      );

    // ── Règles par dossier ────────────────────────────────
    containerEl.createEl("h3", { text: "Règles par dossier" });
    containerEl.createEl("p", {
      text: "Attribue un bonus (+) ou un malus (-) à chaque dossier. Les notes archivées peuvent ainsi être déprioritisées, les notes actives remontées.",
      cls: "setting-item-description",
    });

    this.renderFolderRules(containerEl);

    // Bouton ajouter une règle
    new Setting(containerEl)
      .addButton((btn) =>
        btn
          .setButtonText("+ Ajouter une règle")
          .onClick(async () => {
            this.plugin.settings.folderRules.push({ folder: "", score: 0 });
            await this.plugin.saveSettings();
            this.display(); // re-render
          })
      );

    // ── Poids des critères ────────────────────────────────
    containerEl.createEl("h3", { text: "Poids des critères" });
    containerEl.createEl("p", {
      text: "Les quatre valeurs doivent totaliser 100.",
      cls: "setting-item-description",
    });

    const weightKeys = ["staleness", "isolation", "tagBoost", "folderScore"] as const;
    const weightLabels: Record<typeof weightKeys[number], string> = {
      staleness:   "Ancienneté",
      isolation:   "Isolation (manque de backlinks)",
      tagBoost:    "Boost par tag prioritaire",
      folderScore: "Score par dossier",
    };

    weightKeys.forEach((key) => {
      new Setting(containerEl)
        .setName(weightLabels[key])
        .addSlider((s) =>
          s.setLimits(0, 100, 5)
            .setValue(this.plugin.settings.weights[key])
            .setDynamicTooltip()
            .onChange(async (val) => {
              this.plugin.settings.weights[key] = val;
              await this.plugin.saveSettings();
            })
        );
    });
  }

  // ── Rendu des règles par dossier ─────────────────────────
  private renderFolderRules(containerEl: HTMLElement) {
    const rules = this.plugin.settings.folderRules;

    rules.forEach((rule, index) => {
      const setting = new Setting(containerEl)
        .addText((text) =>
          text
            .setPlaceholder("Nom du dossier (ex: Archive)")
            .setValue(rule.folder)
            .onChange(async (val) => {
              this.plugin.settings.folderRules[index]!.folder = val.trim();
              await this.plugin.saveSettings();
            })
        )
        .addSlider((slider) =>
          slider
            .setLimits(-20, 20, 5)
            .setValue(rule.score)
            .setDynamicTooltip()
            .onChange(async (val) => {
              this.plugin.settings.folderRules[index]!.score = val;
              await this.plugin.saveSettings();
            })
        )
        .addExtraButton((btn) =>
          btn
            .setIcon("trash")
            .setTooltip("Supprimer cette règle")
            .onClick(async () => {
              this.plugin.settings.folderRules.splice(index, 1);
              await this.plugin.saveSettings();
              this.display(); // re-render
            })
        );

      // Afficher le score actuel en clair à côté du slider
      const scoreLabel = rule.score > 0 ? `+${rule.score}` : `${rule.score}`;
      setting.setName(`Dossier · score ${scoreLabel}`);
    });
  }
}