# storage/ — local-first storage abstraction

**Non-negotiable #1: local-first.** All edits are instant and local; the app is
fully usable offline.

This folder holds a single storage interface with two backends behind it:

- **IndexedDB** — used in the browser / PWA.
- **SQLite** — used in the Tauri desktop shell (added in a later phase).

Everything else in the app talks to the abstraction, never to a backend
directly. This is also where the local **change log** lives that the explicit
sync engine (Phase 5) reads from. Populated in **Phase 1**.
