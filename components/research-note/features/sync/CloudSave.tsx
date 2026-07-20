'use client'

import { createContext, useContext } from 'react'

export type CloudSaveApi = {
  saveNow: () => Promise<void>
  saving: boolean
  statusLabel: string
  error: string | null
  lastSaved: string | null
}

const CloudSaveContext = createContext<CloudSaveApi | null>(null)

export function CloudSaveProvider({
  value,
  children,
}: {
  value: CloudSaveApi
  children: React.ReactNode
}) {
  return <CloudSaveContext.Provider value={value}>{children}</CloudSaveContext.Provider>
}

export function useCloudSave(): CloudSaveApi {
  const ctx = useContext(CloudSaveContext)
  if (!ctx) {
    return {
      saveNow: async () => {},
      saving: false,
      statusLabel: '',
      error: null,
      lastSaved: null,
    }
  }
  return ctx
}

/** Shared Save control for Data / Figures / Lab Log / draft tabs. */
export function WorkspaceSaveButton({
  label = 'Save',
  disabled,
  onBeforeSave,
  className,
}: {
  label?: string
  disabled?: boolean
  /** Flush local pending edits (datasets, drafts) before cloud push. */
  onBeforeSave?: () => void | Promise<void>
  className?: string
}) {
  const cloud = useCloudSave()
  const busy = cloud.saving || Boolean(disabled)

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        void (async () => {
          await onBeforeSave?.()
          await cloud.saveNow()
        })()
      }}
      title={cloud.error ?? cloud.statusLabel ?? 'Save to your account'}
      className={
        className ??
        'rounded-md border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-surface)] disabled:opacity-50'
      }
    >
      {cloud.saving ? 'Saving…' : label}
    </button>
  )
}
