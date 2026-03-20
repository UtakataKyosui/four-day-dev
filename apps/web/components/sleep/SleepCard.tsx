'use client'

import { sleep as sleepApi } from '@/lib/api-client'
import type { SleepRecord } from '@/lib/api-client'

interface SleepCardProps {
  record: SleepRecord
  onDeleted: (pid: string) => void
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}時間${m > 0 ? m + '分' : ''}`
}

export function SleepCard({ record, onDeleted }: SleepCardProps) {
  async function handleDelete() {
    if (!confirm('この睡眠記録を削除しますか？')) return
    await sleepApi.delete(record.pid)
    onDeleted(record.pid)
  }

  const totalStages =
    (record.stages_deep_minutes || 0) +
    (record.stages_light_minutes || 0) +
    (record.stages_rem_minutes || 0) +
    (record.stages_wake_minutes || 0)

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-2xl font-bold">{formatMinutes(record.duration_minutes)}</p>
          <p className="text-sm text-muted-foreground">
            {formatTime(record.sleep_start)} 〜 {formatTime(record.sleep_end)}
          </p>
        </div>
        <div className="text-right">
          {record.efficiency && (
            <p className="text-sm font-medium">効率 {record.efficiency}%</p>
          )}
          <p className="text-xs text-muted-foreground">{record.source}</p>
          {record.source === 'manual' && (
            <button
              onClick={handleDelete}
              className="text-xs text-destructive hover:underline mt-1"
            >
              削除
            </button>
          )}
        </div>
      </div>

      {totalStages > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-1">睡眠ステージ</p>
          <div className="flex gap-3 text-xs">
            {record.stages_deep_minutes !== null && (
              <span className="text-blue-600 dark:text-blue-400">深い睡眠 {record.stages_deep_minutes}分</span>
            )}
            {record.stages_light_minutes !== null && (
              <span className="text-sky-500">浅い睡眠 {record.stages_light_minutes}分</span>
            )}
            {record.stages_rem_minutes !== null && (
              <span className="text-purple-500">REM {record.stages_rem_minutes}分</span>
            )}
            {record.stages_wake_minutes !== null && (
              <span className="text-orange-400">覚醒 {record.stages_wake_minutes}分</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
