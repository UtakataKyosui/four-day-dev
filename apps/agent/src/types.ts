export interface MealData {
  meal_type: 'breakfast' | 'lunch' | 'dinner'
  eaten_at: string
  notes: string
}

export interface SleepData {
  duration_minutes: number
  efficiency: number | null
  stages_deep_minutes: number | null
  stages_light_minutes: number | null
  stages_rem_minutes: number | null
  stages_wake_minutes: number | null
}

export interface AnalyzeRequest {
  date: string
  meals: MealData[]
  sleep: SleepData | null
}

export interface Recommendation {
  category: 'meal' | 'sleep' | 'lifestyle'
  text: string
  priority: 'high' | 'medium' | 'low'
}

export interface AnalyzeResponse {
  meal_score: number
  sleep_score: number
  overall_score: number
  summary: string
  recommendations: Recommendation[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
  }
}
