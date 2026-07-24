/**
 * Core local-first data model (spec §6, IA: Project → Section → Page).
 *
 * These types are storage-backend agnostic on purpose: the same shapes are
 * persisted to IndexedDB now and to SQLite (via Tauri) later. Nothing here
 * imports from the editor or UI layers.
 */

export type ID = string

/** ISO-8601 timestamp string, e.g. "2026-07-04T12:00:00.000Z". */
export type ISODateString = string

/**
 * TipTap/ProseMirror document JSON. Kept structurally loose so the storage
 * layer never depends on the editor package.
 */
export type RichTextDoc = {
  type: string
  content?: unknown[]
  [key: string]: unknown
}

export interface Project {
  id: ID
  title: string
  /** Short research focus / description shown on the dashboard card. */
  focus: string
  createdAt: ISODateString
  updatedAt: ISODateString
}

/** OneNote-style section (a tab within a project's notebook). */
export interface Section {
  id: ID
  projectId: ID
  title: string
  /** Sort order within the project (ascending). */
  position: number
  createdAt: ISODateString
  updatedAt: ISODateString
}

/** OneNote-style page (a rich-text note within a section). */
export interface Page {
  id: ID
  sectionId: ID
  /** Denormalised for cheap project-scoped queries and cascade cleanup. */
  projectId: ID
  title: string
  /** ProseMirror doc JSON; null until first edited. */
  content: RichTextDoc | null
  /** Set when the page was imported from a .docx, for round-trip export naming. */
  sourceFileName?: string
  position: number
  createdAt: ISODateString
  updatedAt: ISODateString
}

// ───────────────────────────── Datasets (spreadsheet) ─────────────────

export type ColumnType = 'number' | 'text'

export interface DatasetColumn {
  id: ID
  name: string
  type: ColumnType
}

export type CellValue = string | number | null

/** Row cells are keyed by columnId so inserting/reordering columns is safe. */
export interface DatasetRow {
  id: ID
  cells: Record<ID, CellValue>
}

export interface Dataset {
  id: ID
  projectId: ID
  name: string
  columns: DatasetColumn[]
  rows: DatasetRow[]
  /** Set when imported from a real file, for round-trip export naming. */
  sourceFileName?: string
  sourceSheetName?: string
  createdAt: ISODateString
  updatedAt: ISODateString
}

// ───────────────────────────── References ─────────────────────────────

export type ReferenceType = 'article' | 'book' | 'webpage' | 'other'
export type ReferenceSource = 'crossref' | 'manual' | 'url'

export interface Reference {
  id: ID
  projectId: ID
  type: ReferenceType
  title: string
  authors: string[]
  year: string | null
  /** Journal / book / website name. */
  containerTitle: string | null
  volume: string | null
  issue: string | null
  pages: string | null
  publisher: string | null
  doi: string | null
  url: string | null
  abstract: string | null
  source: ReferenceSource
  createdAt: ISODateString
  updatedAt: ISODateString
}

// ───────────────────────────── AI drafts ──────────────────────────────

/** The AI-drafted output document types (spec §6). */
export type OutputType =
  | 'thesis'
  | 'dissertation'
  | 'progressReports'
  | 'publication'

/**
 * An AI-generated draft. Publication drafts are per-section (`section` set);
 * the others have `section: null`. `humanEdited` protects a draft from being
 * overwritten by a later background regeneration (spec §7B).
 */
export interface Draft {
  id: ID
  projectId: ID
  outputType: OutputType
  /** Publication section name, or null for whole-document drafts. */
  section: string | null
  /** Draft body as Markdown. */
  content: string
  humanEdited: boolean
  /** Provenance of the last generation. */
  provider: string | null
  model: string | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

/** Device-local key/value settings (AI provider config + BYO keys). NOT synced. */
export interface AppSetting {
  key: string
  value: unknown
}

// ───────────────────────── Collaboration (Phase 6) ────────────────────

export type MemberRole = 'view' | 'edit'
export type MemberStatus = 'invited' | 'active'

/** A collaborator invited to a specific project (View-only or View+Edit). */
export interface Member {
  id: ID
  projectId: ID
  email: string
  role: MemberRole
  status: MemberStatus
  createdAt: ISODateString
}

export type CommentTargetKind = 'page' | 'draft'

/** A supervisor-style comment on a note page or an AI draft. */
export interface Comment {
  id: ID
  projectId: ID
  targetKind: CommentTargetKind
  /** Page id, or `${outputType}::${section ?? ''}` for a draft. */
  targetId: string
  author: string
  body: string
  resolved: boolean
  createdAt: ISODateString
  updatedAt: ISODateString
}

// ───────────────────── Electronic Lab Notebook (ELN) ──────────────────

/**
 * A timestamped, append-only experiment log entry (spec §8 ★). Crucial for
 * reproducibility and for auto-drafting Methods/Results. Entries are not edited
 * once written (append-only); they can be deleted only by the author/owner.
 */
export interface LabEntry {
  id: ID
  projectId: ID
  timestamp: ISODateString
  author: string
  text: string
  /** Ids of image assets pasted into this entry (bytes live in the assets store). */
  assetIds?: ID[]
}

// ───────────────────────────── User accounts ──────────────────────────

/**
 * A local-first user account. Passwords and recovery codes are stored only as
 * PBKDF2-SHA256 hashes (see features/auth/crypto.ts) — never in plaintext. This
 * is the offline / self-hosted authority; a wired Supabase project can take over
 * auth for cross-device sign-in + emailed recovery.
 */
export interface Account {
  id: ID
  name: string
  email: string // lowercased; unique
  password: HashedSecretRecord
  createdAt: ISODateString
}

/** Serialized PBKDF2 secret (salt + derived hash + iteration count). */
export interface HashedSecretRecord {
  salt: string
  hash: string
  iterations: number
}

// ───────────────────────── Upload-to-learn templates ──────────────────

export type TemplateKind = 'journal' | 'thesis' | 'other'

/**
 * A template the AI "learns" from — an uploaded thesis template or target-journal
 * paper. We store the extracted plain text; the TemplateContext feeds it to the
 * drafting/formatting prompts so outputs mimic its structure and style (spec §7A).
 */
export interface Template {
  id: ID
  projectId: ID
  name: string
  kind: TemplateKind
  content: string
  createdAt: ISODateString
}

// ───────────────────────────── Assets (images) ────────────────────────

export interface Asset {
  id: ID
  projectId: ID
  name: string
  mime: string
  blob: Blob
  createdAt: ISODateString
}

/** Asset metadata without the (potentially large) blob — used in the change log. */
export type AssetMeta = Omit<Asset, 'blob'>

// ───────────────────────────── Change log ─────────────────────────────

export type EntityType =
  | 'project'
  | 'section'
  | 'page'
  | 'dataset'
  | 'reference'
  | 'asset'
  | 'draft'
  | 'template'
  | 'member'
  | 'comment'
  | 'labentry'
export type ChangeOp = 'create' | 'update' | 'delete'

export type EntitySnapshot =
  | Project
  | Section
  | Page
  | Dataset
  | Reference
  | AssetMeta
  | Draft
  | Template
  | Member
  | Comment
  | LabEntry

/**
 * Append-only local change log. Every mutation records one entry in the same
 * transaction as the write. This is the backbone the explicit-sync engine
 * (Phase 5) will push from, and it also underpins time-travel history.
 *
 * Asset blobs are never snapshotted here (only their metadata), to keep the
 * log small.
 */
export interface ChangeLogEntry {
  id: ID
  entity: EntityType
  entityId: ID
  op: ChangeOp
  timestamp: ISODateString
  /** Entity snapshot after the change; null for deletes. */
  snapshot: EntitySnapshot | null
}
