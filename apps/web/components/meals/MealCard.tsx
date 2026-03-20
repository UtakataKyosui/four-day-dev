'use client'

import { useState } from 'react'
import { meals as mealsApi } from '@/lib/api-client'
import type { Meal } from '@/lib/api-client'
import { MealNoteForm } from './MealNoteForm'

interface MealCardProps {
  mealType: 'breakfast' | 'lunch' | 'dinner'
  date: string
  meal?: Meal
  onUpdated: (meal: Meal) => void
  onDeleted: (pid: string) => void
}

const mealLabels = { breakfast: '朝食', lunch: '昼食', dinner: '夕食' }
const mealIcons = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' }

export function MealCard({ mealType, date, meal, onUpdated, onDeleted }: MealCardProps) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!meal) return
    if (!confirm('この食事記録を削除しますか？')) return
    setDeleting(true)
    try {
      await mealsApi.delete(meal.pid)
      onDeleted(meal.pid)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium flex items-center gap-2">
          <span>{mealIcons[mealType]}</span>
          {mealLabels[mealType]}
        </h3>
        {meal && !editing && (
          <div className="flex gap-1">
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-2 py-1 rounded hover:bg-accent transition-colors"
            >
              編集
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs px-2 py-1 rounded text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              削除
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <MealNoteForm
          mealType={mealType}
          date={date}
          existing={meal}
          onSaved={(saved) => {
            onUpdated(saved)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : meal ? (
        <p className="text-sm whitespace-pre-wrap">{meal.notes}</p>
      ) : (
        <MealNoteForm
          mealType={mealType}
          date={date}
          onSaved={onUpdated}
          onCancel={() => {}}
        />
      )}
    </div>
  )
}
