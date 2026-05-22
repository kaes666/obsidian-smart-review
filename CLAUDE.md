# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # watch mode — esbuild with inline sourcemaps, rebuilds on change
npm run build      # production — tsc type-check then minified esbuild bundle
npm run lint       # ESLint
```

There is no automated test runner. `scorer.ts` exports `runScorerTests()` with inline unit tests for the scoring math; run them with:

```bash
npx ts-node scorer.ts
```

## Deployment

To test in Obsidian, copy these three files into `<vault>/.obsidian/plugins/smart-review/`:

```
main.js
manifest.json
styles.css
```

Then enable the plugin in Obsidian → Settings → Community plugins.

## Architecture

This is an **Obsidian plugin** (CJS bundle, target `es2018`). The Obsidian API (`obsidian`, CodeMirror, Electron) is marked external in esbuild — never import them as real npm packages. All plugin state is managed through the Obsidian lifecycle (`onload` / `onunload`).

### Data flow

```
main.ts (SmartReviewPlugin)
  ├── scorer.ts  (NoteScorer)       — reads vault + metadataCache, returns ranked NoteScore[]
  ├── store.ts   (ReviewStore)      — wraps loadData()/saveData() → data.json
  ├── settings.ts (SmartReviewSettingTab) — SettingTab UI, extends ScorerSettings
  └── review-panel.ts (ReviewPanelView)  — right-side ItemView, renders cards, dispatches actions
```

### Scoring algorithm (`scorer.ts`)

`NoteScorer.getTopNotes(n)` scores every eligible markdown file and returns the top N sorted descending. Final score = three components summing to ~100:

| Component | Max | Formula |
|-----------|-----|---------|
| `staleness` | 40 | `log(days - threshold + 1) / log(365 - threshold + 1)` — logarithmic, plateaus near 365 days |
| `isolation` | 40 | `exp(-0.15 × backlinkCount)` — exponential decay, 0 backlinks = full score |
| `tagBoost`  | 20 | Linear up to 2 matching priority tags |

Eligibility filter: skip files in `excludedFolders`, files whose name starts with `_`, and files modified within `recentThresholdDays`.

Backlink count uses `app.metadataCache.resolvedLinks` (a `sourcePath → { targetPath → occurrences }` index) — O(files) scan per note.

### Persistence (`store.ts` + `types.ts`)

All state lives in `data.json` (Obsidian standard). Shape defined in `PluginData`:
- `history: ReviewEntry[]` — full audit trail of `valid / update / archive / skip` actions
- `snoozed: Record<string, number>` — path → unix timestamp until which the note is hidden (archive auto-snoozes for 90 days)
- `lastDigestDate: string` — guards against regenerating a Daily Note digest more than once per day

### Settings (`settings.ts`)

`SmartReviewSettings` extends `ScorerSettings` (defined in `scorer.ts`) and adds:
- `notesPerSession` — how many cards to surface per panel open (default: 5)
- `injectInDailyNote` — toggle for Daily Note injection (wired in settings UI but injection logic not yet implemented)

The three scoring weights (`staleness`, `isolation`, `tagBoost`) are exposed as sliders and must sum to 100 — this constraint is only documented in the UI, not enforced in code.
