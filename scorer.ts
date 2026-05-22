import { App, TFile } from "obsidian";

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

export interface NoteScore {
  file: TFile;
  score: number;
  breakdown: {
    staleness: number;    // [0–35] ancienneté
    isolation: number;    // [0–35] peu de backlinks
    tagBoost: number;     // [0–15] tags prioritaires
    folderScore: number;  // [-20–15] bonus/malus selon dossier
  };
  daysSinceModified: number;
  backlinkCount: number;
}

export interface FolderRule {
  folder: string;  // nom du dossier (ex: "Archive")
  score: number;   // bonus (+) ou malus (-) entre -20 et +20
}

export interface ScorerSettings {
  excludedFolders: string[];
  priorityTags: string[];
  recentThresholdDays: number;
  weights: {
    staleness: number;
    isolation: number;
    tagBoost: number;
    folderScore: number;
  };
  folderRules: FolderRule[];
}

export const DEFAULT_SCORER_SETTINGS: ScorerSettings = {
  excludedFolders: ["Templates", "Attachments"],
  priorityTags: [],
  recentThresholdDays: 7,
  weights: {
    staleness: 35,
    isolation: 35,
    tagBoost: 15,
    folderScore: 15,
  },
  // Règles génériques — l'utilisateur les adapte à sa structure
  folderRules: [
    { folder: "Archive", score: -20 },
    { folder: "Daily",   score:  10 },
  ],
};

// ─────────────────────────────────────────────────────────
// SCORER PRINCIPAL
// ─────────────────────────────────────────────────────────

export class NoteScorer {
  private app: App;
  private settings: ScorerSettings;

  constructor(app: App, settings: ScorerSettings) {
    this.app = app;
    this.settings = settings;
  }

  async getTopNotes(n: number = 5): Promise<NoteScore[]> {
    const allFiles = this.app.vault.getMarkdownFiles();
    const eligibleFiles = this.filterEligible(allFiles);

    const scored = await Promise.all(
      eligibleFiles.map((file) => this.scoreNote(file))
    );

    return scored
      .filter((s) => s !== null && s.score > 0)
      .sort((a, b) => b!.score - a!.score)
      .slice(0, n) as NoteScore[];
  }

  async scoreNote(file: TFile): Promise<NoteScore | null> {
    const now = Date.now();
    const daysSinceModified = (now - file.stat.mtime) / (1000 * 60 * 60 * 24);

    if (daysSinceModified < this.settings.recentThresholdDays) return null;

    const backlinkCount = this.getBacklinkCount(file);
    const tags          = this.getFileTags(file);

    const staleness   = this.computeStaleness(daysSinceModified);
    const isolation   = this.computeIsolation(backlinkCount);
    const tagBoost    = this.computeTagBoost(tags);
    const folderScore = this.computeFolderScore(file);

    const score = staleness + isolation + tagBoost + folderScore;

    return {
      file,
      score: Math.round(score),
      breakdown: { staleness, isolation, tagBoost, folderScore },
      daysSinceModified: Math.round(daysSinceModified),
      backlinkCount,
    };
  }

  // ─────────────────────────────────────────────────────
  // CRITÈRE 1 : STALENESS → max 35 pts (courbe log)
  // ─────────────────────────────────────────────────────
  private computeStaleness(days: number): number {
    const { staleness: max } = this.settings.weights;
    const t = this.settings.recentThresholdDays;
    if (days <= t) return 0;
    const n = Math.log(days - t + 1) / Math.log(365 - t + 1);
    return Math.min(max, Math.round(n * max));
  }

  // ─────────────────────────────────────────────────────
  // CRITÈRE 2 : ISOLATION → max 35 pts (décroissance exp)
  // ─────────────────────────────────────────────────────
  private computeIsolation(backlinkCount: number): number {
    const { isolation: max } = this.settings.weights;
    return Math.round(Math.exp(-0.15 * backlinkCount) * max);
  }

  // ─────────────────────────────────────────────────────
  // CRITÈRE 3 : TAG BOOST → max 15 pts
  // ─────────────────────────────────────────────────────
  private computeTagBoost(tags: string[]): number {
    const { tagBoost: max } = this.settings.weights;
    if (!this.settings.priorityTags.length) return 0;
    const matches = tags.filter((t) => this.settings.priorityTags.includes(t)).length;
    if (!matches) return 0;
    return Math.round(Math.min(1, matches / 2) * max);
  }

  // ─────────────────────────────────────────────────────
  // CRITÈRE 4 : FOLDER SCORE → de -20 à +20 pts
  //
  // Matche le dossier le plus précis en premier (tri par longueur desc).
  // Si aucune règle ne matche → 0 (neutre).
  // ─────────────────────────────────────────────────────
  private computeFolderScore(file: TFile): number {
    const path = file.path.toLowerCase();
    const sorted = [...this.settings.folderRules].sort(
      (a, b) => b.folder.length - a.folder.length
    );
    for (const rule of sorted) {
      if (path.startsWith(rule.folder.toLowerCase() + "/")) {
        return rule.score;
      }
    }
    return 0;
  }

  // ─────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────

  private filterEligible(files: TFile[]): TFile[] {
    return files.filter((file) => {
      const path = file.path.toLowerCase();
      for (const folder of this.settings.excludedFolders) {
        if (path.startsWith(folder.toLowerCase() + "/")) return false;
      }
      if (file.name.startsWith("_")) return false;
      return true;
    });
  }

  private getBacklinkCount(file: TFile): number {
    const resolvedLinks = this.app.metadataCache.resolvedLinks;
    let count = 0;
    for (const sourcePath in resolvedLinks) {
      if (resolvedLinks[sourcePath]?.[file.path]) count++;
    }
    return count;
  }

  private getFileTags(file: TFile): string[] {
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return [];
    const tags: string[] = [];
    if (cache.frontmatter?.tags) {
      const ft = Array.isArray(cache.frontmatter.tags)
        ? cache.frontmatter.tags
        : [cache.frontmatter.tags];
      tags.push(...ft.map((t: string) => (t.startsWith("#") ? t : `#${t}`)));
    }
    if (cache.tags) tags.push(...cache.tags.map((t) => t.tag));
    return [...new Set(tags)];
  }
}