'use client'

import { useEffect, useState, useCallback } from 'react'
import { meals as mealsApi } from '@/lib/api-client'
import type { Meal } from '@/lib/api-client'
import { MealGrid } from '@/components/meals/MealGrid'
import { DateNav } from '@/components/shared/DateNav'

export default function MealsPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [mealList, setMealList] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMeals = useCallback(async () => {
    setLoading(true)
    try {
      const data = await mealsApi.list(date)
      setMealList(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchMeals()
  }, [fetchMeals])

  function handleMealUpdated(meal: Meal) {
    setMealList((prev) => {
      const idx = prev.findIndex((m) => m.pid === meal.pid)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = meal
        return next
      }
      return [...prev, meal]
    })
  }

  function handleMealDeleted(pid: string) {
    setMealList((prev) => prev.filter((m) => m.pid !== pid))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">食事記録</h1>
        <DateNav date={date} onDateChange={setDate} />
      </div>

      {loading ? (
        <div className="text-muted-foreground">読み込み中...</div>
      ) : (
        <MealGrid
          date={date}
          meals={mealList}
          onMealUpdated={handleMealUpdated}
          onMealDeleted={handleMealDeleted}
        />
      )}
    </div>
  )
}
