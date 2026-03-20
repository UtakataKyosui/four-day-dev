'use client'

import { useState } from 'react'
import { fitbit as fitbitApi } from '@/lib/api-client'
import type { FitbitStatus } from '@/lib/api-client'

interface FitbitConnectButtonProps {
  status: FitbitStatus
  onStatusChange: (status: FitbitStatus) => void
}

export function FitbitConnectButton({ status, onStatusChange }: FitbitConnectButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    try {
      const { url } = await fitbitApi.authUrl()
      window.location.href = url
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Fitbit連携を解除しますか？')) return
    setLoading(true)
    try {
      await fitbitApi.disconnect()
      onStatusChange({ connected: false, last_synced_at: null })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (status.connected) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
          ✓ Fitbit連携中
        </span>
        {status.last_synced_at && (
          <span className="text-xs text-muted-foreground">
            最終同期: {new Date(status.last_synced_at).toLocaleDateString('ja-JP')}
          </span>
        )}
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="text-xs text-destructive hover:underline disabled:opacity-50"
        >
          連携解除
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="px-4 py-2 bg-[#00B0B9] text-white rounded-md hover:bg-[#00B0B9]/90 disabled:opacity-50 transition-colors text-sm"
    >
      {loading ? '接続中...' : 'Fitbitと連携する'}
    </button>
  )
}
