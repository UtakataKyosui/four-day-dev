"use client";

import type { Meal } from "@/lib/api-client";
import { MealCard } from "./MealCard";

interface MealGridProps {
  date: string;
  meals: Meal[];
  onMealUpdated: (meal: Meal) => void;
  onMealDeleted: (pid: string) => void;
}

export function MealGrid({ date, meals, onMealUpdated, onMealDeleted }: MealGridProps) {
  const mealTypes = ["breakfast", "lunch", "dinner"] as const;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {mealTypes.map((type) => (
        <MealCard
          key={type}
          mealType={type}
          date={date}
          meal={meals.find((m) => m.meal_type === type)}
          onUpdated={onMealUpdated}
          onDeleted={onMealDeleted}
        />
      ))}
    </div>
  );
}
