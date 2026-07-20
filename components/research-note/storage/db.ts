import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  Project,
  Section,
  Page,
  ChangeLogEntry,
  Dataset,
  Reference,
  Asset,
  Draft,
  AppSetting,
  Template,
  Member,
  Comment,
  LabEntry,
  Account,
} from './types'

/**
 * IndexedDB is the browser/PWA local-first backend. The Tauri desktop shell
 * will add a SQLite backend behind the same repository API (see repositories.ts)
 * without touching callers.
 */
interface CanvAtlasDB extends DBSchema {
  projects: {
    key: string
    value: Project
  }
  sections: {
    key: string
    value: Section
    indexes: { byProject: string }
  }
  pages: {
    key: string
    value: Page
    indexes: { bySection: string; byProject: string }
  }
  changelog: {
    key: string
    value: ChangeLogEntry
    indexes: { byTimestamp: string; byEntity: string }
  }
  datasets: {
    key: string
    value: Dataset
    indexes: { byProject: string }
  }
  references: {
    key: string
    value: Reference
    indexes: { byProject: string }
  }
  assets: {
    key: string
    value: Asset
    indexes: { byProject: string }
  }
  drafts: {
    key: string
    value: Draft
    indexes: { byProject: string }
  }
  settings: {
    key: string
    value: AppSetting
  }
  templates: {
    key: string
    value: Template
    indexes: { byProject: string }
  }
  members: {
    key: string
    value: Member
    indexes: { byProject: string }
  }
  comments: {
    key: string
    value: Comment
    indexes: { byProject: string; byTarget: string }
  }
  labentries: {
    key: string
    value: LabEntry
    indexes: { byProject: string }
  }
  accounts: {
    key: string
    value: Account
    indexes: { byEmail: string }
  }
}

const DB_NAME = 'gahi-research-note'
const DB_VERSION = 7

let dbPromise: Promise<IDBPDatabase<CanvAtlasDB>> | null = null

export function getDB(): Promise<IDBPDatabase<CanvAtlasDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CanvAtlasDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1 — local-first core (projects/sections/pages + change log).
        if (oldVersion < 1) {
          db.createObjectStore('projects', { keyPath: 'id' })

          const sections = db.createObjectStore('sections', { keyPath: 'id' })
          sections.createIndex('byProject', 'projectId')

          const pages = db.createObjectStore('pages', { keyPath: 'id' })
          pages.createIndex('bySection', 'sectionId')
          pages.createIndex('byProject', 'projectId')

          const changelog = db.createObjectStore('changelog', { keyPath: 'id' })
          changelog.createIndex('byTimestamp', 'timestamp')
          changelog.createIndex('byEntity', 'entity')
        }

        // v2 — embedded tools (datasets, references, image assets).
        if (oldVersion < 2) {
          const datasets = db.createObjectStore('datasets', { keyPath: 'id' })
          datasets.createIndex('byProject', 'projectId')

          const references = db.createObjectStore('references', { keyPath: 'id' })
          references.createIndex('byProject', 'projectId')

          const assets = db.createObjectStore('assets', { keyPath: 'id' })
          assets.createIndex('byProject', 'projectId')
        }

        // v3 — AI output drafts + device-local settings.
        if (oldVersion < 3) {
          const drafts = db.createObjectStore('drafts', { keyPath: 'id' })
          drafts.createIndex('byProject', 'projectId')

          db.createObjectStore('settings', { keyPath: 'key' })
        }

        // v4 — upload-to-learn templates.
        if (oldVersion < 4) {
          const templates = db.createObjectStore('templates', { keyPath: 'id' })
          templates.createIndex('byProject', 'projectId')
        }

        // v5 — collaboration (members + comments).
        if (oldVersion < 5) {
          const members = db.createObjectStore('members', { keyPath: 'id' })
          members.createIndex('byProject', 'projectId')

          const comments = db.createObjectStore('comments', { keyPath: 'id' })
          comments.createIndex('byProject', 'projectId')
          comments.createIndex('byTarget', 'targetId')
        }

        // v6 — Electronic Lab Notebook entries.
        if (oldVersion < 6) {
          const eln = db.createObjectStore('labentries', { keyPath: 'id' })
          eln.createIndex('byProject', 'projectId')
        }

        // v7 — local-first user accounts (sign-up / sign-in, hashed passwords).
        if (oldVersion < 7) {
          const accounts = db.createObjectStore('accounts', { keyPath: 'id' })
          accounts.createIndex('byEmail', 'email', { unique: true })
        }
      },
    })
  }
  return dbPromise
}

export type { CanvAtlasDB }
