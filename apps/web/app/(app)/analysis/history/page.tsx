"use client";

import { analysis as analysisApi } from "@/lib/api-client";
import type { HealthAnalysis } from "@/lib/api-client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AnalysisHistoryPage() {
  const [history, setHistory] = useState<HealthAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analysisApi
      .history()
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function scoreColor(score: number): string {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-destructive";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/analysis" className="text-sm text-primary hover:underline">
          ← 戻る
        </Link>
        <h1 className="text-2xl font-bold">分析履歴</h1>
      </div>

      {loading ? (
        <div className="text-muted-foreground">読み込み中...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>分析履歴がありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item) => (
            <div
              key={item.pid}
              className="bg-card rounded-lg border border-border px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{item.analysis_date}</p>
                {item.status === "completed" && item.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                    {item.summary.slice(0, 60)}...
                  </p>
                )}
              </div>
              <div className="text-right">
                {item.status === "completed" && item.overall_score !== null ? (
                  <span className={`text-2xl font-bold ${scoreColor(item.overall_score)}`}>
                    {item.overall_score}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">{item.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
