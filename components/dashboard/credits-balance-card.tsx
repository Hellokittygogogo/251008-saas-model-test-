"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { CreditTransaction } from "@/types/creem";

type CreditsBalanceCardProps = {
  credits: number;
  recentHistory: CreditTransaction[];
};

export function CreditsBalanceCard({
  credits,
  recentHistory,
}: CreditsBalanceCardProps) {
  const [shownCredits, setShownCredits] = useState<number>(credits);
  const [reconciled, setReconciled] = useState<boolean>(false);

  // Best‑effort reconcile on mount to correct any stale stored balance
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/api/credits/reconcile", { method: "POST" });
        if (!resp.ok) return;
        const data = await resp.json().catch(() => ({}));
        if (!cancelled && typeof data?.computed === "number") {
          if (data.computed !== credits) {
            setShownCredits(data.computed);
            setReconciled(true);
          }
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [credits]);

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Coins className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Available Credits</p>
          <h3 className="text-2xl font-bold mt-1">{shownCredits}</h3>
          {reconciled && (
            <p className="text-xs text-muted-foreground mt-1">Synced from history</p>
          )}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-sm text-muted-foreground">Recent Activity</p>
        <div className="space-y-1">
          {recentHistory.map((history, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm"
            >
              <span
                className={
                  history.type === "add" ? "text-primary" : "text-destructive"
                }
              >
                {history.type === "add" ? "+" : "-"}
                {history.amount}
              </span>
              <span className="text-muted-foreground">
                {new Date(history.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
