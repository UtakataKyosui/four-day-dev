"use client";

import { FitbitConnectButton } from "@/components/sleep/FitbitConnectButton";
import { fitbit as fitbitApi } from "@/lib/api-client";
import type { FitbitStatus } from "@/lib/api-client";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SettingsContent() {
  const searchParams = useSearchParams();
  const [fitbitStatus, setFitbitStatus] = useState<FitbitStatus>({
    connected: false,
    last_synced_at: null,
  });
  const [loading, setLoading] = useState(true);
  const fitbitParam = searchParams.get("fitbit");

  useEffect(() => {
    fitbitApi
      .status()
      .then(setFitbitStatus)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">設定</h1>

      {fitbitParam === "connected" && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-300">
          Fitbitとの連携が完了しました！
        </div>
      )}

      <div className="bg-card rounded-lg border border-border p-4">
        <h2 className="font-semibold mb-3">Fitbit連携</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Fitbitと連携することで、睡眠データを自動的に同期できます。
        </p>
        {loading ? (
          <div className="text-muted-foreground text-sm">読み込み中...</div>
        ) : (
          <FitbitConnectButton status={fitbitStatus} onStatusChange={setFitbitStatus} />
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">読み込み中...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
