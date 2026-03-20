'use client'

import { useEffect, useState, useCallback } from 'react'
import { sleep as sleepApi, fitbit as fitbitApi } from '@/lib/api-client'
import type { SleepRecord, FitbitStatus } from '@/lib/api-client'
import { SleepCard } from '@/components/sleep/SleepCard'
import { FitbitConnectButton } from '@/components/sleep/FitbitConnectButton'
import { SyncButton } from '@/components/sleep/SyncButton'
import { DateNav } from '@/components/shared/DateNav'

export default function SleepPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [records, setRecords] = useState<SleepRecord[]>([])
  const [fitbitStatus, setFitbitStatus] = useState<FitbitStatus>({ connected: false, last_synced_at: null })
  const [loading, setLoading] = useState(true)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualForm, setManualForm] = useState({ sleep_start: '', sleep_end: '', duration_minutes: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [sleepData, statusData] = await Promise.allSettled([
        sleepApi.list(date),
        fitbitApi.status(),
      ])
      if (sleepData.status === 'fulfilled') setRecords(sleepData.value)
      if (statusData.status === 'fulfilled') setFitbitStatus(statusData.value)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const record = await sleepApi.create({
        sleep_start: new Date(manualForm.sleep_start).toISOString(),
        sleep_end: new Date(manualForm.sleep_end).toISOString(),
        duration_minutes: parseInt(manualForm.duration_minutes) || 0,
      })
      setRecords((prev) => [...prev, record])
      setShowManualForm(false)
      setManualForm({ sleep_start: '', sleep_end: '', duration_minutes: '' })
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">睡眠記録</h1>
        <DateNav date={date} onDateChange={setDate} />
      </div>

      {/* Fitbit status + sync */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <FitbitConnectButton status={fitbitStatus} onStatusChange={setFitbitStatus} />
          {fitbitStatus.connected && (
            <SyncButton date={date} onSynced={fetchData} />
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground">読み込み中...</div>
      ) : (
        <>
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>この日の睡眠データはありません</p>
              <button
                onClick={() => setShowManualForm(true)}
                className="mt-2 text-sm text-primary hover:underline"
              >
                手動で追加する
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((r) => (
                <SleepCard
                  key={r.pid}
                  record={r}
                  onDeleted={(pid) => setRecords((prev) => prev.filter((r) => r.pid !== pid))}
                />
              ))}
              <button
                onClick={() => setShowManualForm(true)}
                className="text-sm text-primary hover:underline"
              >
                + 手動で追加
              </button>
            </div>
          )}

          {showManualForm && (
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="font-medium mb-3">手動で睡眠を記録</h3>
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">就寝時刻</label>
                    <input
                      type="datetime-local"
                      value={manualForm.sleep_start}
                      onChange={(e) => setManualForm((p) => ({ ...p, sleep_start: e.target.value }))}
                      required
                      className="w-full px-2 py-1.5 text-sm border border-input rounded bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">起床時刻</label>
                    <input
                      type="datetime-local"
                      value={manualForm.sleep_end}
                      onChange={(e) => setManualForm((p) => ({ ...p, sleep_end: e.target.value }))}
                      required
                      className="w-full px-2 py-1.5 text-sm border border-input rounded bg-background"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">睡眠時間（分）</label>
                  <input
                    type="number"
                    value={manualForm.duration_minutes}
                    onChange={(e) => setManualForm((p) => ({ ...p, duration_minutes: e.target.value }))}
                    required
                    min="0"
                    className="w-full px-2 py-1.5 text-sm border border-input rounded bg-background"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">
                    保存
                  </button>
                  <button type="button" onClick={() => setShowManualForm(false)} className="px-3 py-1.5 text-sm rounded hover:bg-accent">
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  )
}
