'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DateNavProps {
  date: string
  onDateChange: (date: string) => void
}

function formatDateJa(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function DateNav({ date, onDateChange }: DateNavProps) {
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onDateChange(addDays(date, -1))}
        className="p-1 rounded hover:bg-accent transition-colors"
        aria-label="前の日"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="font-medium min-w-32 text-center">{formatDateJa(date)}</span>
      <button
        onClick={() => onDateChange(addDays(date, 1))}
        disabled={date >= today}
        className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors"
        aria-label="次の日"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
      {date !== today && (
        <button
          onClick={() => onDateChange(today)}
          className="text-xs text-primary hover:underline"
        >
          今日
        </button>
      )}
    </div>
  )
}
