'use client'

import { useState } from 'react'
import { fitbit as fitbitApi } from '@/lib/api-client'

interface SyncButtonProps {
  date: string
  onSynced: () => void
}

export function SyncButton({ date, onSynced }: SyncButtonProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSync() {
    setLoading(true)
    setMessage('')
    try {
      await fitbitApi.sync(date)
      setMessage('同期をキューに追加しました。しばらくお待ちください。')
      setTimeout(() => {
        onSynced()
        setMessage('')
      }, 3000)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '同期に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleSync}
        disabled={loading}
        className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent disabled:opacity-50 transition-colors"
      >
        {loading ? '同期中...' : '🔄 Fitbitから同期'}
      </button>
      {message && <p className="text-xs text-muted-foreground mt-1">{message}</p>}
    </div>
  )
}
