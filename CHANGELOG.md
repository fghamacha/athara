# Changelog

All notable changes to Athara are documented here.

## [Unreleased]

### Added
- README.md and CHANGELOG.md
- `.gitignore` for the monorepo
- `.dockerignore` for `services/api` and `services/web`

### Fixed
- **Classic tree — single-parent child invisible**: children with only one parent (e.g. Ali Mhemdi, child of Brahim GHAMACHA alone) were silently dropped when `substituteCouple` replaced their parent's person-node with the couple-node. Fix: single-parent fallback now uses the couple-node directly via `personToCouple` map.
- **Classic tree — in-law spouse disconnected from partner**: a spouse who has their own parent in the tree (e.g. Fatma under Hedi) was blocked from being placed adjacent to their partner (Fahmi). Fix: removed the `hasParent` guard from the extra-placement logic; added `movedParents` mechanism that repositions the in-law parent directly above the relocated spouse slot, connected by an elbow link.
- **Classic tree — dangling elbow lines**: children moved to the `extra` set were still included in their original parent's elbow link, drawing a line to empty space. Fix: elbow rendering now filters out `skipInTree` children before drawing.

---

## 2025-05 — Initial build

### Added
- Person CRUD (first name, last name, gender, profession, bio, birth/death dates, birth place, photo)
- Parent-child relationship management
- Marriage management (spouse, start/end date, end reason, notes)
- File attachment upload per person (stored in MinIO)
- Person detail page with parents, children, siblings, and marriages sections
- Person list page with search
- **Classic tree view** — D3 hierarchical tree with couple nodes, multi-generation chains, zoom/pan
- **Force-directed tree view** — D3 force simulation with drag, zoom/pan
- Dot-grid background on both tree views
- **Multi-generation fix**: couple nodes substitute person nodes in parent `_ch` arrays so grandparent → parent → child chains render correctly
- **Cycle detection**: `breakCycles()` DFS prevents d3.hierarchy from looping infinitely on bad data; rendering error shown in place of black screen
- **Year-only dates**: birth/death fields accept `YYYY` (stored as `YYYY-01-01`), displayed without month/day
- **Islamic culture**: death marker changed from ✝ to ◆; no cross symbol anywhere in the UI
- Edit form pre-fill: person data loads before the form renders, preventing blank fields on edit
- Docker Compose setup: PostgreSQL + FastAPI + React/Vite + MinIO with health checks
