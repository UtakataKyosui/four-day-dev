"use client";

import { AnalysisCard } from "@/components/analysis/AnalysisCard";
import { AnalysisTriggerButton } from "@/components/analysis/AnalysisTriggerButton";
import { DateNav } from "@/components/shared/DateNav";
import { analysis as analysisApi } from "@/lib/api-client";
import type { HealthAnalysis } from "@/lib/api-client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function AnalysisPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [currentAnalysis, setCurrentAnalysis] = useState<HealthAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analysisApi.get(date);
      setCurrentAnalysis(data);
    } catch {
      setCurrentAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">健康分析</h1>
        <DateNav date={date} onDateChange={setDate} />
      </div>

      <div className="flex justify-between items-center">
        <AnalysisTriggerButton date={date} onCompleted={fetchAnalysis} />
        <Link href="/analysis/history" className="text-sm text-primary hover:underline">
          履歴を見る →
        </Link>
      </div>

      {loading ? (
        <div className="text-muted-foreground">読み込み中...</div>
      ) : currentAnalysis ? (
        <AnalysisCard analysis={currentAnalysis} />
      ) : (
        <div className="text-center py-8 text-muted-foreground bg-card rounded-lg border border-border">
          <p>この日の分析データがありません</p>
          <p className="text-sm mt-1">食事・睡眠を記録してから分析を実行してください</p>
        </div>
      )}
    </div>
  );
}
