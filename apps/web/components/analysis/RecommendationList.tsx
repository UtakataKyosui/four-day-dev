import type { Recommendation } from '@/lib/api-client'

interface RecommendationListProps {
  recommendations: Recommendation[]
}

const priorityColors = {
  high: 'border-l-destructive bg-destructive/5',
  medium: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
  low: 'border-l-green-500 bg-green-50 dark:bg-green-950/20',
}

const priorityLabels = { high: '重要', medium: '推奨', low: '参考' }
const categoryLabels = { meal: '食事', sleep: '睡眠', lifestyle: '生活習慣' }

export function RecommendationList({ recommendations }: RecommendationListProps) {
  if (recommendations.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">アドバイス</h3>
      {recommendations.map((rec, i) => (
        <div
          key={i}
          className={`border-l-4 px-3 py-2 rounded-r-md text-sm ${priorityColors[rec.priority]}`}
        >
          <div className="flex gap-2 mb-1">
            <span className="text-xs font-medium opacity-70">{categoryLabels[rec.category]}</span>
            <span className="text-xs font-medium opacity-70">{priorityLabels[rec.priority]}</span>
          </div>
          <p>{rec.text}</p>
        </div>
      ))}
    </div>
  )
}
