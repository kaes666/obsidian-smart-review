# Smart Review — Obsidian Plugin

> Intelligent spaced review for your Obsidian vault. Surface forgotten notes before they become dead knowledge.

---

## The problem

You take notes. Lots of them. But most of them are never read again.

Smart Review fixes that by automatically surfacing notes that deserve your attention — based on how long they've been forgotten, how isolated they are in your vault, and which folders they live in.

---

## Features

- **Automatic scoring** — every note gets a priority score based on 4 criteria
- **Daily review panel** — a sidebar with your top notes to revisit each day
- **Quick actions** — mark notes as valid, to update, to archive, or skip
- **Folder rules** — boost or penalize notes based on their folder (e.g. Archive = low priority)
- **Priority tags** — tag notes with `#important` to push them to the top
- **Fully configurable** — adjust every weight and rule to match your workflow

---

## How scoring works

Each note receives a score from 0 to 100 based on:

| Criterion | Max points | Logic |
|-----------|-----------|-------|
| Staleness | 35 | Logarithmic curve — notes forgotten for months score higher |
| Isolation | 35 | Exponential decay — notes with 0 backlinks score highest |
| Tag boost | 15 | Bonus if the note has a priority tag you configured |
| Folder score | 15 | Bonus or penalty based on folder rules you define |

Notes modified within your recency threshold (default: 7 days) are never shown.

---

## Installation

### From the Obsidian community plugin store (recommended)

1. Open Obsidian → **Settings** → **Community plugins**
2. Disable safe mode if prompted
3. Click **Browse** and search for **Smart Review**
4. Click **Install**, then **Enable**

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/kaes666/obsidian-smart-review/releases/latest)
2. Create a folder at `<your-vault>/.obsidian/plugins/smart-review/`
3. Copy the 3 files into that folder
4. Open Obsidian → **Settings** → **Community plugins** → enable **Smart Review**

---

## Usage

1. Click the **brain icon** in the left sidebar to open the review panel
2. Your top notes appear as cards with their score and metadata
3. For each note, choose an action:
   - **✓ Still valid** — note is up to date, snooze for 30 days
   - **✎ Needs update** — flag it for editing
   - **Archive** — snooze for 90 days
   - **Skip** — come back to it tomorrow

---

## Configuration

Go to **Settings** → **Community plugins** → **Smart Review** to configure:

### General
- **Notes per session** — how many notes to show per day (default: 5)
- **Recency threshold** — notes modified within this many days are ignored (default: 7)
- **Daily note injection** — automatically add a review block to your daily note

### Exclusions
- **Excluded folders** — folders to completely ignore (one per line)
- **Priority tags** — tags that boost a note's score (e.g. `#important`)

### Folder rules
Add custom rules to boost or penalize notes based on their folder:

| Folder | Score | Effect |
|--------|-------|--------|
| Archive | -20 | Almost never shown |
| Projects | +5 | Shown occasionally |
| Daily | +10 | Shown more often |

### Criteria weights
Adjust the weight of each scoring criterion. The four values should total 100.

---

## Compatibility

- Obsidian 1.4.0+
- Desktop and mobile
- Works with any vault structure

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

---

## Support

If Smart Review saves you time, consider [buying me a coffee ☕](https://buymeacoffee.com/)

---

## License

[MIT](LICENSE)
