import { getDB, type CanvAtlasDB } from './db'
import { newId, nowISO } from './ids'
import type {
  Asset,
  ChangeLogEntry,
  ChangeOp,
  Dataset,
  DatasetColumn,
  DatasetRow,
  Draft,
  EntitySnapshot,
  EntityType,
  OutputType,
  Page,
  Project,
  Reference,
  RichTextDoc,
  Section,
  Template,
  TemplateKind,
  Member,
  MemberRole,
  Comment,
  CommentTargetKind,
  LabEntry,
  Account,
  HashedSecretRecord,
} from './types'
import type { IDBPTransaction } from 'idb'

/**
 * Repository layer — the ONLY storage API the rest of the app talks to.
 *
 * Every mutation records an append-only ChangeLogEntry in the same IndexedDB
 * transaction as the write, so state and log can never diverge. The explicit
 * sync engine (Phase 5) reads from `changelog`; time-travel history replays it.
 *
 * When the SQLite (Tauri) backend lands, only this file and db.ts change — the
 * function signatures below stay identical.
 */

type Stores =
  | 'projects'
  | 'sections'
  | 'pages'
  | 'changelog'
  | 'datasets'
  | 'references'
  | 'assets'
  | 'drafts'
  | 'templates'
  | 'members'
  | 'comments'
  | 'labentries'
type RWTx = IDBPTransaction<CanvAtlasDB, Stores[], 'readwrite'>

function makeChange(
  entity: EntityType,
  entityId: string,
  op: ChangeOp,
  snapshot: EntitySnapshot | null,
): ChangeLogEntry {
  return { id: newId(), entity, entityId, op, timestamp: nowISO(), snapshot }
}

async function logInTx(tx: RWTx, change: ChangeLogEntry): Promise<void> {
  await tx.objectStore('changelog').put(change)
}

// ────────────────────────────── Projects ──────────────────────────────

export async function listProjects(): Promise<Project[]> {
  const db = await getDB()
  const all = await db.getAll('projects')
  // Most-recently-updated first (dashboard ordering).
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getProject(id: string): Promise<Project | undefined> {
  return (await getDB()).get('projects', id)
}

export async function createProject(input: {
  title: string
  focus?: string
}): Promise<Project> {
  const db = await getDB()
  const now = nowISO()
  const project: Project = {
    id: newId(),
    title: input.title.trim() || 'Untitled project',
    focus: (input.focus ?? '').trim(),
    createdAt: now,
    updatedAt: now,
  }
  const tx = db.transaction(['projects', 'changelog'], 'readwrite')
  await tx.objectStore('projects').put(project)
  await logInTx(tx, makeChange('project', project.id, 'create', project))
  await tx.done
  return project
}

/** Upsert a project row with a fixed id (e.g. Mongo ObjectId). */
export async function upsertProject(project: Project): Promise<Project> {
  const db = await getDB()
  const tx = db.transaction(['projects', 'changelog'], 'readwrite')
  const existing = await tx.objectStore('projects').get(project.id)
  await tx.objectStore('projects').put(project)
  await logInTx(
    tx,
    makeChange('project', project.id, existing ? 'update' : 'create', project),
  )
  await tx.done
  return project
}

export async function updateProject(
  id: string,
  patch: Partial<Pick<Project, 'title' | 'focus'>>,
): Promise<Project> {
  const db = await getDB()
  const tx = db.transaction(['projects', 'changelog'], 'readwrite')
  const store = tx.objectStore('projects')
  const existing = await store.get(id)
  if (!existing) throw new Error(`Project ${id} not found`)
  const updated: Project = { ...existing, ...patch, updatedAt: nowISO() }
  await store.put(updated)
  await logInTx(tx, makeChange('project', id, 'update', updated))
  await tx.done
  return updated
}

/** Deletes a project and cascades to all its sections, pages, datasets,
 * references and image assets. */
export async function deleteProject(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(
    ['projects', 'sections', 'pages', 'datasets', 'references', 'assets', 'drafts', 'templates', 'members', 'comments', 'labentries', 'changelog'],
    'readwrite',
  )
  const cascade = async (
    store:
      | 'pages'
      | 'sections'
      | 'datasets'
      | 'references'
      | 'assets'
      | 'drafts'
      | 'templates'
      | 'members'
      | 'comments'
      | 'labentries',
    entity: EntityType,
  ) => {
    const keys = await tx.objectStore(store).index('byProject').getAllKeys(id)
    for (const key of keys) {
      await tx.objectStore(store).delete(key)
      await logInTx(tx, makeChange(entity, key, 'delete', null))
    }
  }
  await cascade('pages', 'page')
  await cascade('sections', 'section')
  await cascade('datasets', 'dataset')
  await cascade('references', 'reference')
  await cascade('assets', 'asset')
  await cascade('drafts', 'draft')
  await cascade('templates', 'template')
  await cascade('members', 'member')
  await cascade('comments', 'comment')
  await cascade('labentries', 'labentry')
  await tx.objectStore('projects').delete(id)
  await logInTx(tx, makeChange('project', id, 'delete', null))
  await tx.done
}

// ────────────────────────────── Sections ──────────────────────────────

export async function listSections(projectId: string): Promise<Section[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('sections', 'byProject', projectId)
  return all.sort((a, b) => a.position - b.position)
}

export async function createSection(input: {
  projectId: string
  title: string
  position?: number
}): Promise<Section> {
  const db = await getDB()
  const now = nowISO()
  const position = input.position ?? (await nextSectionPosition(input.projectId))
  const section: Section = {
    id: newId(),
    projectId: input.projectId,
    title: input.title.trim() || 'Untitled section',
    position,
    createdAt: now,
    updatedAt: now,
  }
  const tx = db.transaction(['sections', 'changelog'], 'readwrite')
  await tx.objectStore('sections').put(section)
  await logInTx(tx, makeChange('section', section.id, 'create', section))
  await tx.done
  return section
}

export async function updateSection(
  id: string,
  patch: Partial<Pick<Section, 'title' | 'position'>>,
): Promise<Section> {
  const db = await getDB()
  const tx = db.transaction(['sections', 'changelog'], 'readwrite')
  const store = tx.objectStore('sections')
  const existing = await store.get(id)
  if (!existing) throw new Error(`Section ${id} not found`)
  const updated: Section = { ...existing, ...patch, updatedAt: nowISO() }
  await store.put(updated)
  await logInTx(tx, makeChange('section', id, 'update', updated))
  await tx.done
  return updated
}

/** Deletes a section and cascades to its pages. */
export async function deleteSection(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['sections', 'pages', 'changelog'], 'readwrite')
  const pageIds = await tx.objectStore('pages').index('bySection').getAllKeys(id)
  for (const pageId of pageIds) {
    await tx.objectStore('pages').delete(pageId)
    await logInTx(tx, makeChange('page', pageId, 'delete', null))
  }
  await tx.objectStore('sections').delete(id)
  await logInTx(tx, makeChange('section', id, 'delete', null))
  await tx.done
}

// ──────────────────────────────── Pages ───────────────────────────────

export async function listPages(projectId: string): Promise<Page[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('pages', 'byProject', projectId)
  return all.sort((a, b) => a.position - b.position)
}

export async function getPage(id: string): Promise<Page | undefined> {
  return (await getDB()).get('pages', id)
}

export async function createPage(input: {
  sectionId: string
  projectId: string
  title: string
  position?: number
}): Promise<Page> {
  const db = await getDB()
  const now = nowISO()
  const position = input.position ?? (await nextPagePosition(input.sectionId))
  const page: Page = {
    id: newId(),
    sectionId: input.sectionId,
    projectId: input.projectId,
    title: input.title.trim() || 'Untitled page',
    content: null,
    position,
    createdAt: now,
    updatedAt: now,
  }
  const tx = db.transaction(['pages', 'changelog'], 'readwrite')
  await tx.objectStore('pages').put(page)
  await logInTx(tx, makeChange('page', page.id, 'create', page))
  await tx.done
  return page
}

export async function updatePage(
  id: string,
  patch: Partial<Pick<Page, 'title' | 'position' | 'sectionId'>> & {
    content?: RichTextDoc | null
  },
): Promise<Page> {
  const db = await getDB()
  const tx = db.transaction(['pages', 'changelog'], 'readwrite')
  const store = tx.objectStore('pages')
  const existing = await store.get(id)
  if (!existing) throw new Error(`Page ${id} not found`)
  const updated: Page = { ...existing, ...patch, updatedAt: nowISO() }
  await store.put(updated)
  await logInTx(tx, makeChange('page', id, 'update', updated))
  await tx.done
  return updated
}

export async function deletePage(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['pages', 'changelog'], 'readwrite')
  await tx.objectStore('pages').delete(id)
  await logInTx(tx, makeChange('page', id, 'delete', null))
  await tx.done
}

// ─────────────────────────────── Datasets ─────────────────────────────

export async function listDatasets(projectId: string): Promise<Dataset[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('datasets', 'byProject', projectId)
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function createDataset(input: {
  projectId: string
  name: string
  columns?: DatasetColumn[]
  rows?: DatasetRow[]
  sourceFileName?: string
  sourceSheetName?: string
}): Promise<Dataset> {
  const db = await getDB()
  const now = nowISO()
  const dataset: Dataset = {
    id: newId(),
    projectId: input.projectId,
    name: input.name.trim() || 'Untitled dataset',
    columns: input.columns ?? [],
    rows: input.rows ?? [],
    ...(input.sourceFileName ? { sourceFileName: input.sourceFileName } : {}),
    ...(input.sourceSheetName ? { sourceSheetName: input.sourceSheetName } : {}),
    createdAt: now,
    updatedAt: now,
  }
  const tx = db.transaction(['datasets', 'changelog'], 'readwrite')
  await tx.objectStore('datasets').put(dataset)
  await logInTx(tx, makeChange('dataset', dataset.id, 'create', dataset))
  await tx.done
  return dataset
}

export async function updateDataset(
  id: string,
  patch: Partial<Pick<Dataset, 'name' | 'columns' | 'rows'>>,
): Promise<Dataset> {
  const db = await getDB()
  const tx = db.transaction(['datasets', 'changelog'], 'readwrite')
  const store = tx.objectStore('datasets')
  const existing = await store.get(id)
  if (!existing) throw new Error(`Dataset ${id} not found`)
  const updated: Dataset = { ...existing, ...patch, updatedAt: nowISO() }
  await store.put(updated)
  await logInTx(tx, makeChange('dataset', id, 'update', updated))
  await tx.done
  return updated
}

export async function deleteDataset(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['datasets', 'changelog'], 'readwrite')
  await tx.objectStore('datasets').delete(id)
  await logInTx(tx, makeChange('dataset', id, 'delete', null))
  await tx.done
}

// ─────────────────────────────── References ───────────────────────────

export async function listReferences(projectId: string): Promise<Reference[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('references', 'byProject', projectId)
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function createReference(
  input: Omit<Reference, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Reference> {
  const db = await getDB()
  const now = nowISO()
  const reference: Reference = { ...input, id: newId(), createdAt: now, updatedAt: now }
  const tx = db.transaction(['references', 'changelog'], 'readwrite')
  await tx.objectStore('references').put(reference)
  await logInTx(tx, makeChange('reference', reference.id, 'create', reference))
  await tx.done
  return reference
}

export async function updateReference(
  id: string,
  patch: Partial<Omit<Reference, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>,
): Promise<Reference> {
  const db = await getDB()
  const tx = db.transaction(['references', 'changelog'], 'readwrite')
  const store = tx.objectStore('references')
  const existing = await store.get(id)
  if (!existing) throw new Error(`Reference ${id} not found`)
  const updated: Reference = { ...existing, ...patch, updatedAt: nowISO() }
  await store.put(updated)
  await logInTx(tx, makeChange('reference', id, 'update', updated))
  await tx.done
  return updated
}

export async function deleteReference(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['references', 'changelog'], 'readwrite')
  await tx.objectStore('references').delete(id)
  await logInTx(tx, makeChange('reference', id, 'delete', null))
  await tx.done
}

// ───────────────────────────────── Assets ─────────────────────────────

/** Metadata-only view (drops the blob) for change-log snapshots. */
function assetMeta(asset: Asset) {
  const { blob: _blob, ...meta } = asset
  return meta
}

export async function listAssets(projectId: string): Promise<Asset[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('assets', 'byProject', projectId)
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getAsset(id: string): Promise<Asset | undefined> {
  return (await getDB()).get('assets', id)
}

export async function createAsset(input: {
  projectId: string
  name: string
  mime: string
  blob: Blob
}): Promise<Asset> {
  const db = await getDB()
  const asset: Asset = {
    id: newId(),
    projectId: input.projectId,
    name: input.name,
    mime: input.mime,
    blob: input.blob,
    createdAt: nowISO(),
  }
  const tx = db.transaction(['assets', 'changelog'], 'readwrite')
  await tx.objectStore('assets').put(asset)
  await logInTx(tx, makeChange('asset', asset.id, 'create', assetMeta(asset)))
  await tx.done
  return asset
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['assets', 'changelog'], 'readwrite')
  await tx.objectStore('assets').delete(id)
  await logInTx(tx, makeChange('asset', id, 'delete', null))
  await tx.done
}

// ───────────────────────────────── Drafts ─────────────────────────────

export async function listDrafts(projectId: string): Promise<Draft[]> {
  const db = await getDB()
  return db.getAllFromIndex('drafts', 'byProject', projectId)
}

export async function getDraftFor(
  projectId: string,
  outputType: OutputType,
  section: string | null,
): Promise<Draft | undefined> {
  const drafts = await listDrafts(projectId)
  return drafts.find((d) => d.outputType === outputType && d.section === section)
}

/** Create or update the draft for a (project, outputType, section) slot. */
export async function saveDraft(
  projectId: string,
  outputType: OutputType,
  section: string | null,
  patch: Partial<Pick<Draft, 'content' | 'humanEdited' | 'provider' | 'model'>>,
): Promise<Draft> {
  const db = await getDB()
  const existing = await getDraftFor(projectId, outputType, section)
  const now = nowISO()
  const draft: Draft = existing
    ? { ...existing, ...patch, updatedAt: now }
    : {
        id: newId(),
        projectId,
        outputType,
        section,
        content: patch.content ?? '',
        humanEdited: patch.humanEdited ?? false,
        provider: patch.provider ?? null,
        model: patch.model ?? null,
        createdAt: now,
        updatedAt: now,
      }
  const tx = db.transaction(['drafts', 'changelog'], 'readwrite')
  await tx.objectStore('drafts').put(draft)
  await logInTx(tx, makeChange('draft', draft.id, existing ? 'update' : 'create', draft))
  await tx.done
  return draft
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['drafts', 'changelog'], 'readwrite')
  await tx.objectStore('drafts').delete(id)
  await logInTx(tx, makeChange('draft', id, 'delete', null))
  await tx.done
}

// ─────────────────────────────── Templates ────────────────────────────

export async function listTemplates(projectId: string): Promise<Template[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('templates', 'byProject', projectId)
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function createTemplate(input: {
  projectId: string
  name: string
  kind: TemplateKind
  content: string
}): Promise<Template> {
  const db = await getDB()
  const template: Template = {
    id: newId(),
    projectId: input.projectId,
    name: input.name,
    kind: input.kind,
    content: input.content,
    createdAt: nowISO(),
  }
  const tx = db.transaction(['templates', 'changelog'], 'readwrite')
  await tx.objectStore('templates').put(template)
  await logInTx(tx, makeChange('template', template.id, 'create', template))
  await tx.done
  return template
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['templates', 'changelog'], 'readwrite')
  await tx.objectStore('templates').delete(id)
  await logInTx(tx, makeChange('template', id, 'delete', null))
  await tx.done
}

// ─────────────────────────── Collaboration ────────────────────────────

export async function listMembers(projectId: string): Promise<Member[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('members', 'byProject', projectId)
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function inviteMember(input: {
  projectId: string
  email: string
  role: MemberRole
}): Promise<Member> {
  const db = await getDB()
  const member: Member = {
    id: newId(),
    projectId: input.projectId,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    status: 'invited',
    createdAt: nowISO(),
  }
  const tx = db.transaction(['members', 'changelog'], 'readwrite')
  await tx.objectStore('members').put(member)
  await logInTx(tx, makeChange('member', member.id, 'create', member))
  await tx.done
  return member
}

export async function updateMemberRole(id: string, role: MemberRole): Promise<Member> {
  const db = await getDB()
  const tx = db.transaction(['members', 'changelog'], 'readwrite')
  const store = tx.objectStore('members')
  const existing = await store.get(id)
  if (!existing) throw new Error(`Member ${id} not found`)
  const updated: Member = { ...existing, role }
  await store.put(updated)
  await logInTx(tx, makeChange('member', id, 'update', updated))
  await tx.done
  return updated
}

export async function removeMember(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['members', 'changelog'], 'readwrite')
  await tx.objectStore('members').delete(id)
  await logInTx(tx, makeChange('member', id, 'delete', null))
  await tx.done
}

export async function listComments(
  projectId: string,
  targetKind: CommentTargetKind,
  targetId: string,
): Promise<Comment[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('comments', 'byProject', projectId)
  return all
    .filter((c) => c.targetKind === targetKind && c.targetId === targetId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function addComment(input: {
  projectId: string
  targetKind: CommentTargetKind
  targetId: string
  author: string
  body: string
}): Promise<Comment> {
  const db = await getDB()
  const now = nowISO()
  const comment: Comment = {
    id: newId(),
    projectId: input.projectId,
    targetKind: input.targetKind,
    targetId: input.targetId,
    author: input.author.trim() || 'Anonymous',
    body: input.body.trim(),
    resolved: false,
    createdAt: now,
    updatedAt: now,
  }
  const tx = db.transaction(['comments', 'changelog'], 'readwrite')
  await tx.objectStore('comments').put(comment)
  await logInTx(tx, makeChange('comment', comment.id, 'create', comment))
  await tx.done
  return comment
}

export async function setCommentResolved(id: string, resolved: boolean): Promise<Comment> {
  const db = await getDB()
  const tx = db.transaction(['comments', 'changelog'], 'readwrite')
  const store = tx.objectStore('comments')
  const existing = await store.get(id)
  if (!existing) throw new Error(`Comment ${id} not found`)
  const updated: Comment = { ...existing, resolved, updatedAt: nowISO() }
  await store.put(updated)
  await logInTx(tx, makeChange('comment', id, 'update', updated))
  await tx.done
  return updated
}

export async function deleteComment(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['comments', 'changelog'], 'readwrite')
  await tx.objectStore('comments').delete(id)
  await logInTx(tx, makeChange('comment', id, 'delete', null))
  await tx.done
}

// ──────────────────── Electronic Lab Notebook (ELN) ───────────────────

export async function listLabEntries(projectId: string): Promise<LabEntry[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('labentries', 'byProject', projectId)
  return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)) // newest first
}

export async function addLabEntry(input: {
  projectId: string
  author: string
  text: string
  assetIds?: string[]
}): Promise<LabEntry> {
  const db = await getDB()
  const entry: LabEntry = {
    id: newId(),
    projectId: input.projectId,
    timestamp: nowISO(),
    author: input.author.trim() || 'You',
    text: input.text.trim(),
    ...(input.assetIds?.length ? { assetIds: input.assetIds } : {}),
  }
  const tx = db.transaction(['labentries', 'changelog'], 'readwrite')
  await tx.objectStore('labentries').put(entry)
  await logInTx(tx, makeChange('labentry', entry.id, 'create', entry))
  await tx.done
  return entry
}

export async function deleteLabEntry(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['labentries', 'changelog'], 'readwrite')
  await tx.objectStore('labentries').delete(id)
  await logInTx(tx, makeChange('labentry', id, 'delete', null))
  await tx.done
}

// ─────────────────────────── User accounts (auth) ─────────────────────
// Accounts are device-local and are intentionally NOT part of the sync change
// log — credentials never leave the device from here (see features/auth).

export async function getAccountByEmail(email: string): Promise<Account | undefined> {
  const db = await getDB()
  return db.getFromIndex('accounts', 'byEmail', email.trim().toLowerCase())
}

export async function createAccount(input: {
  name: string
  email: string
  password: HashedSecretRecord
}): Promise<Account> {
  const email = input.email.trim().toLowerCase()
  const existing = await getAccountByEmail(email)
  if (existing) throw new Error('An account with this email already exists.')
  const account: Account = {
    id: newId(),
    name: input.name.trim() || 'Researcher',
    email,
    password: input.password,
    createdAt: nowISO(),
  }
  const db = await getDB()
  await db.put('accounts', account)
  return account
}

/** Replace an account's password hash (used by the recovery/reset flow). */
export async function setAccountPassword(
  accountId: string,
  password: HashedSecretRecord,
): Promise<void> {
  const db = await getDB()
  const account = await db.get('accounts', accountId)
  if (!account) throw new Error('Account not found.')
  await db.put('accounts', { ...account, password })
}

// ────────────────────────── Global search ─────────────────────────────

export type SearchKind = 'page' | 'reference' | 'dataset' | 'draft' | 'labentry'

export interface SearchHit {
  kind: SearchKind
  projectId: string
  projectTitle: string
  title: string
  snippet: string
}

/** Search notes, references, datasets, drafts and lab entries across all projects. */
export async function searchAll(query: string): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const db = await getDB()
  const projects = await db.getAll('projects')
  const titleById = new Map(projects.map((p) => [p.id, p.title]))
  const hits: SearchHit[] = []

  const snippet = (text: string): string => {
    const i = text.toLowerCase().indexOf(q)
    if (i < 0) return text.slice(0, 100)
    const start = Math.max(0, i - 40)
    return (start > 0 ? '…' : '') + text.slice(start, i + q.length + 60).trim() + '…'
  }
  const pt = (pid: string) => titleById.get(pid) ?? 'Project'

  for (const page of await db.getAll('pages')) {
    const body = docToPlainTextLocal(page.content)
    if (page.title.toLowerCase().includes(q) || body.toLowerCase().includes(q)) {
      hits.push({ kind: 'page', projectId: page.projectId, projectTitle: pt(page.projectId), title: page.title || 'Untitled page', snippet: snippet(body || page.title) })
    }
  }
  for (const ref of await db.getAll('references')) {
    const hay = `${ref.title} ${ref.authors.join(' ')} ${ref.containerTitle ?? ''}`
    if (hay.toLowerCase().includes(q)) {
      hits.push({ kind: 'reference', projectId: ref.projectId, projectTitle: pt(ref.projectId), title: ref.title, snippet: ref.authors.join(', ') || ref.containerTitle || '' })
    }
  }
  for (const ds of await db.getAll('datasets')) {
    if (ds.name.toLowerCase().includes(q)) {
      hits.push({ kind: 'dataset', projectId: ds.projectId, projectTitle: pt(ds.projectId), title: ds.name, snippet: `${ds.rows.length} rows × ${ds.columns.length} cols` })
    }
  }
  for (const draft of await db.getAll('drafts')) {
    if (draft.content.toLowerCase().includes(q)) {
      hits.push({ kind: 'draft', projectId: draft.projectId, projectTitle: pt(draft.projectId), title: `${draft.outputType}${draft.section ? ' · ' + draft.section : ''}`, snippet: snippet(draft.content) })
    }
  }
  for (const e of await db.getAll('labentries')) {
    if (e.text.toLowerCase().includes(q)) {
      hits.push({ kind: 'labentry', projectId: e.projectId, projectTitle: pt(e.projectId), title: 'Lab log', snippet: snippet(e.text) })
    }
  }
  return hits.slice(0, 50)
}

/** Local plain-text flatten for search (avoids importing the UI extractor here). */
function docToPlainTextLocal(doc: unknown): string {
  const parts: string[] = []
  const walk = (n: { text?: string; content?: unknown[] }) => {
    if (n.text) parts.push(n.text)
    if (Array.isArray(n.content)) n.content.forEach((c) => walk(c as { text?: string; content?: unknown[] }))
  }
  if (doc) walk(doc as { text?: string; content?: unknown[] })
  return parts.join(' ')
}

// ─────────────────────── Project state (snapshots) ────────────────────

/** A full, serialisable snapshot of a project's syncable entities. */
export interface ProjectState {
  version: 1
  project: Project | null
  sections: Section[]
  pages: Page[]
  datasets: Dataset[]
  references: Reference[]
  drafts: Draft[]
  templates: Template[]
  /** Lab log entries (optional for older snapshots). */
  labEntries?: LabEntry[]
  /** Figures as data-URLs (optional; older snapshots omit blobs). */
  assets?: SerializedAsset[]
}

/** Asset row that can travel through JSON (blob → data URL). */
export interface SerializedAsset {
  id: string
  projectId: string
  name: string
  mime: string
  createdAt: string
  dataUrl: string
}

type ProjEntityStore =
  | 'sections'
  | 'pages'
  | 'datasets'
  | 'references'
  | 'drafts'
  | 'templates'
  | 'labentries'

const STORE_ENTITY: Record<ProjEntityStore, EntityType> = {
  sections: 'section',
  pages: 'page',
  datasets: 'dataset',
  references: 'reference',
  drafts: 'draft',
  templates: 'template',
  labentries: 'labentry',
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read blob'))
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string, mimeFallback: string): Blob {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl)
  if (!match) return new Blob([], { type: mimeFallback })
  const mime = match[1] || mimeFallback
  const binary = atob(match[2]!)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/** Serialise a project's current state (includes lab log + figures as data URLs). */
export async function getProjectState(projectId: string): Promise<ProjectState> {
  const db = await getDB()
  const [project, sections, pages, datasets, references, drafts, templates, labEntries, assets] =
    await Promise.all([
      db.get('projects', projectId),
      db.getAllFromIndex('sections', 'byProject', projectId),
      db.getAllFromIndex('pages', 'byProject', projectId),
      db.getAllFromIndex('datasets', 'byProject', projectId),
      db.getAllFromIndex('references', 'byProject', projectId),
      db.getAllFromIndex('drafts', 'byProject', projectId),
      db.getAllFromIndex('templates', 'byProject', projectId),
      db.getAllFromIndex('labentries', 'byProject', projectId),
      db.getAllFromIndex('assets', 'byProject', projectId),
    ])

  const serializedAssets: SerializedAsset[] = []
  for (const asset of assets) {
    // Skip oversized figures so notebook JSON stays within Mongo limits.
    if (asset.blob.size > 4_000_000) continue
    try {
      serializedAssets.push({
        id: asset.id,
        projectId: asset.projectId,
        name: asset.name,
        mime: asset.mime,
        createdAt: asset.createdAt,
        dataUrl: await blobToDataUrl(asset.blob),
      })
    } catch {
      /* skip unreadable blob */
    }
  }

  return {
    version: 1,
    project: project ?? null,
    sections,
    pages,
    datasets,
    references,
    drafts,
    templates,
    labEntries,
    assets: serializedAssets,
  }
}

/**
 * Overwrite a project's state with a snapshot — NON-DESTRUCTIVELY: every change
 * is recorded in the append-only change log, so the pre-restore state remains
 * recoverable from its own earlier snapshot (non-negotiable #3).
 */
export async function applyProjectState(
  projectId: string,
  state: ProjectState,
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(
    [
      'projects',
      'sections',
      'pages',
      'datasets',
      'references',
      'drafts',
      'templates',
      'labentries',
      'assets',
      'changelog',
    ],
    'readwrite',
  )

  if (state.project) {
    await tx.objectStore('projects').put(state.project)
    await logInTx(tx, makeChange('project', state.project.id, 'update', state.project))
  }

  const applyStore = async (store: ProjEntityStore, items: { id: string }[]) => {
    const os = tx.objectStore(store) as unknown as {
      index(name: 'byProject'): { getAllKeys(key: string): Promise<IDBValidKey[]> }
      delete(key: IDBValidKey): Promise<void>
      put(value: unknown): Promise<IDBValidKey>
    }
    const currentKeys = await os.index('byProject').getAllKeys(projectId)
    const keep = new Set(items.map((i) => i.id))
    for (const key of currentKeys) {
      if (!keep.has(key as string)) {
        await os.delete(key)
        await logInTx(tx, makeChange(STORE_ENTITY[store], key as string, 'delete', null))
      }
    }
    for (const item of items) {
      await os.put(item)
      await logInTx(tx, makeChange(STORE_ENTITY[store], item.id, 'update', item as EntitySnapshot))
    }
  }

  await applyStore('sections', state.sections)
  await applyStore('pages', state.pages)
  await applyStore('datasets', state.datasets)
  await applyStore('references', state.references)
  await applyStore('drafts', state.drafts)
  await applyStore('templates', state.templates)
  await applyStore('labentries', state.labEntries ?? [])

  if (state.assets) {
    const assetStore = tx.objectStore('assets')
    const currentKeys = await assetStore.index('byProject').getAllKeys(projectId)
    const keep = new Set(state.assets.map((a) => a.id))
    for (const key of currentKeys) {
      if (!keep.has(key as string)) {
        await assetStore.delete(key)
        await logInTx(tx, makeChange('asset', key as string, 'delete', null))
      }
    }
    for (const row of state.assets) {
      const asset: Asset = {
        id: row.id,
        projectId: row.projectId,
        name: row.name,
        mime: row.mime,
        createdAt: row.createdAt,
        blob: dataUrlToBlob(row.dataUrl, row.mime),
      }
      await assetStore.put(asset)
      await logInTx(tx, makeChange('asset', asset.id, 'update', assetMeta(asset)))
    }
  }

  await tx.done
}

/** Changes recorded at or after `since` (ISO timestamp), oldest first. */
export async function changesSince(since: string): Promise<ChangeLogEntry[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('changelog', 'byTimestamp')
  return all.filter((c) => c.timestamp > since)
}

// ──────────────────────────────── Settings ────────────────────────────
// Device-local key/value settings (AI provider config + BYO keys). NOT logged
// to the change log and never synced to the cloud.

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const rec = await (await getDB()).get('settings', key)
  return rec?.value as T | undefined
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await (await getDB()).put('settings', { key, value })
}

// ──────────────────────────────── Helpers ─────────────────────────────

/** Next `position` for a project's sections = (max existing) + 1 (append to end). */
async function nextSectionPosition(projectId: string): Promise<number> {
  const items = await (await getDB()).getAllFromIndex(
    'sections',
    'byProject',
    projectId,
  )
  return items.reduce((max, it) => Math.max(max, it.position), -1) + 1
}

/** Next `position` for a section's pages = (max existing) + 1 (append to end). */
async function nextPagePosition(sectionId: string): Promise<number> {
  const items = await (await getDB()).getAllFromIndex(
    'pages',
    'bySection',
    sectionId,
  )
  return items.reduce((max, it) => Math.max(max, it.position), -1) + 1
}
