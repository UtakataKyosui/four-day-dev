import type { HealthAnalysis } from "@/lib/api-client";
import { RecommendationList } from "./RecommendationList";

interface AnalysisCardProps {
  analysis: HealthAnalysis;
}

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : "text-destructive";
  return (
    <div className="text-center">
      <p className={`text-3xl font-bold ${color}`}>{score}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  if (analysis.status !== "completed") {
    return (
      <div className="bg-card rounded-lg border border-border p-4 text-center">
        <p className="text-muted-foreground">
          {analysis.status === "pending" || analysis.status === "processing"
            ? "分析中..."
            : "分析に失敗しました"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-6">
      {/* Scores */}
      <div className="flex justify-around">
        {analysis.overall_score !== null && (
          <ScoreCircle score={analysis.overall_score} label="総合" />
        )}
        {analysis.meal_score !== null && <ScoreCircle score={analysis.meal_score} label="食事" />}
        {analysis.sleep_score !== null && <ScoreCircle score={analysis.sleep_score} label="睡眠" />}
      </div>

      {/* Summary */}
      {analysis.summary && (
        <div>
          <h3 className="font-semibold mb-2">分析サマリー</h3>
          <div className="text-sm prose dark:prose-invert max-w-none">
            {analysis.summary.split("\n").map((line, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: summary lines have no stable identity
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <RecommendationList recommendations={analysis.recommendations} />
      )}
    </div>
  );
}
