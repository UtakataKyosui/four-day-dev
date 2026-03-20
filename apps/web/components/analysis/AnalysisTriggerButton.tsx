'use client'

import { useState, useEffect, useRef } from 'react'
import { analysis as analysisApi } from '@/lib/api-client'

interface AnalysisTriggerButtonProps {
  date: string
  onCompleted: () => void
}

export function AnalysisTriggerButton({ date, onCompleted }: AnalysisTriggerButtonProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  async function handleTrigger() {
    setLoading(true)
    setError('')
    setStatus('分析を開始しています...')
    try {
      const { job_id } = await analysisApi.trigger(date)
      setStatus('分析中...')

      pollRef.current = setInterval(async () => {
        const result = await analysisApi.status(job_id)
        if (result.status === 'completed') {
          clearInterval(pollRef.current!)
          setLoading(false)
          setStatus('完了')
          onCompleted()
        } else if (result.status === 'failed') {
          clearInterval(pollRef.current!)
          setLoading(false)
          setError('分析に失敗しました')
          setStatus('')
        }
      }, 3000)
    } catch (e) {
      setLoading(false)
      setError(e instanceof Error ? e.message : '分析の開始に失敗しました')
      setStatus('')
    }
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleTrigger}
        disabled={loading}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? '🤖 分析中...' : '🤖 AIで健康分析する'}
      </button>
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
