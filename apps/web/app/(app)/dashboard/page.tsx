'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { meals as mealsApi, sleep as sleepApi, analysis as analysisApi } from '@/lib/api-client'
import type { Meal, SleepRecord, HealthAnalysis } from '@/lib/api-client'

export default function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [todayMeals, setTodayMeals] = useState<Meal[]>([])
  const [todaySleep, setTodaySleep] = useState<SleepRecord | null>(null)
  const [todayAnalysis, setTodayAnalysis] = useState<HealthAnalysis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [mealsData, sleepData, analysisData] = await Promise.allSettled([
          mealsApi.list(today),
          sleepApi.list(today),
          analysisApi.get(today),
        ])
        if (mealsData.status === 'fulfilled') setTodayMeals(mealsData.value)
        if (sleepData.status === 'fulfilled') {
          const records = sleepData.value
          setTodaySleep(records.find((r) => r.is_main_sleep) || records[0] || null)
        }
        if (analysisData.status === 'fulfilled') setTodayAnalysis(analysisData.value)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [today])

  function formatMinutes(min: number): string {
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${h}時間${m > 0 ? m + '分' : ''}`
  }

  const mealTypes = ['breakfast', 'lunch', 'dinner'] as const
  const mealLabels = { breakfast: '朝食', lunch: '昼食', dinner: '夕食' }

  if (loading) {
    return <div className="text-muted-foreground">読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>
      <p className="text-muted-foreground">
        {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Meals summary */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">🍽️ 今日の食事</h2>
            <Link href="/meals" className="text-xs text-primary hover:underline">詳細</Link>
          </div>
          <div className="space-y-2">
            {mealTypes.map((type) => {
              const meal = todayMeals.find((m) => m.meal_type === type)
              return (
                <div key={type} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground w-8 shrink-0">{mealLabels[type]}</span>
                  {meal ? (
                    <span className="line-clamp-1">{meal.notes}</span>
                  ) : (
                    <span className="text-muted-foreground italic">未記録</span>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{todayMeals.length}/3 記録済み</p>
        </div>

        {/* Sleep summary */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">😴 昨夜の睡眠</h2>
            <Link href="/sleep" className="text-xs text-primary hover:underline">詳細</Link>
          </div>
          {todaySleep ? (
            <div className="space-y-1 text-sm">
              <p className="text-2xl font-bold">{formatMinutes(todaySleep.duration_minutes)}</p>
              {todaySleep.efficiency && (
                <p className="text-muted-foreground">効率: {todaySleep.efficiency}%</p>
              )}
              <p className="text-xs text-muted-foreground">
                {new Date(todaySleep.sleep_start).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                {' '}〜{' '}
                {new Date(todaySleep.sleep_end).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">睡眠データなし</p>
          )}
        </div>

        {/* Analysis summary */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">📊 健康分析</h2>
            <Link href="/analysis" className="text-xs text-primary hover:underline">詳細</Link>
          </div>
          {todayAnalysis?.status === 'completed' ? (
            <div className="space-y-1">
              <p className="text-2xl font-bold text-primary">
                {todayAnalysis.overall_score}<span className="text-sm font-normal text-muted-foreground">/100</span>
              </p>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>食事: {todayAnalysis.meal_score}</span>
                <span>睡眠: {todayAnalysis.sleep_score}</span>
              </div>
            </div>
          ) : todayAnalysis?.status === 'pending' || todayAnalysis?.status === 'processing' ? (
            <p className="text-sm text-muted-foreground">分析中...</p>
          ) : (
            <Link href="/analysis" className="text-sm text-primary hover:underline">
              分析を実行する →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
