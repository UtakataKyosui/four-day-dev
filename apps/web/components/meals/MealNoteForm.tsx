'use client'

import { useState } from 'react'
import { meals as mealsApi } from '@/lib/api-client'
import type { Meal } from '@/lib/api-client'

interface MealNoteFormProps {
  mealType: 'breakfast' | 'lunch' | 'dinner'
  date: string
  existing?: Meal
  onSaved: (meal: Meal) => void
  onCancel: () => void
}

export function MealNoteForm({ mealType, date, existing, onSaved, onCancel }: MealNoteFormProps) {
  const [notes, setNotes] = useState(existing?.notes || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const mealLabels = { breakfast: '朝食', lunch: '昼食', dinner: '夕食' }
  const defaultHours = { breakfast: 7, lunch: 12, dinner: 19 }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!notes.trim()) return
    setLoading(true)
    setError('')
    try {
      const eatenAt = new Date(date)
      eatenAt.setHours(defaultHours[mealType], 0, 0, 0)

      let savedMeal: Meal
      if (existing) {
        savedMeal = await mealsApi.update(existing.pid, { notes })
      } else {
        savedMeal = await mealsApi.create({
          meal_type: mealType,
          eaten_at: eatenAt.toISOString(),
          notes,
        })
      }
      onSaved(savedMeal)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm font-medium">
        {mealLabels[mealType]}の内容
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="例: ご飯、味噌汁、焼き魚、サラダ"
        rows={3}
        className="w-full px-3 py-2 border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring text-sm"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading || !notes.trim()}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}
