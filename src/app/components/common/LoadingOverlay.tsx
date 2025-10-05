'use client'
import React from 'react'

type LoadingOverlayProps = {
  show: boolean
  title?: string
  message?: string
  logs?: string[]
}

export function LoadingOverlay({ show, title = 'Loading', message, logs = [] }: LoadingOverlayProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 text-white">
      <div className="w-[90vw] max-w-md rounded-lg border border-white/10 bg-zinc-900/60 p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-label="spinner" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {message && <p className="mb-3 text-sm text-zinc-200">{message}</p>}
        {logs.length > 0 && (
          <div className="max-h-40 overflow-auto rounded-md bg-black/30 p-2 text-xs font-mono text-zinc-300">
            {logs.slice(-10).map((l, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className="whitespace-pre-wrap leading-relaxed">
                {l}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default LoadingOverlay
