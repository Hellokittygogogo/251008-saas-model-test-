import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { redirect } from "next/navigation";
import { SubscriptionStatusCard } from "@/components/dashboard/subscription-status-card";
import { CreditsBalanceCard } from "@/components/dashboard/credits-balance-card";
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card";
import { MyNamesCard } from "@/components/dashboard/my-names-card";
import { GenerationHistoryCard } from "@/components/dashboard/generation-history-card";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Get one subscription (if any) from the primary customer row
  const { data: customerData } = await supabase
    .from("customers")
    .select(
      `
      *,
      subscriptions (
        status,
        current_period_end,
        creem_product_id
      )
    `
    )
    .eq("user_id", user.id)
    .limit(1)
    .single();

  const subscription = customerData?.subscriptions?.[0];

  // Aggregate credits across ALL customer rows of this user to avoid mismatch
  const { data: history } = await supabase
    .from("credits_history")
    .select(`amount, type, created_at, customers!inner(user_id)`) // join for user filter
    .eq("customers.user_id", user.id)
    .order("created_at", { ascending: false });

  const creditsHistoryAll = history || [];
  const recentCreditsHistory = creditsHistoryAll.slice(0, 2);

  const computedCredits = creditsHistoryAll.reduce((sum: number, h: any) => {
    const n = Math.abs(Number(h.amount) || 0);
    return sum + (h.type === "add" ? n : -n);
  }, 0);

  // Best-effort: write back to all customer rows for this user to keep DB consistent
  try {
    const service = createServiceRoleClient();
    await service
      .from("customers")
      .update({ credits: computedCredits, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
  } catch {}

  const credits = computedCredits;

  return (
    <div className="flex-1 w-full flex flex-col gap-6 sm:gap-8 px-4 sm:px-8 container">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border rounded-lg p-6 sm:p-8 mt-6 sm:mt-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">
          Welcome back,{" "}
          <span className="block sm:inline mt-1 sm:mt-0">{user.email}</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your Chinese names, view your generation history, and track your usage.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <SubscriptionStatusCard subscription={subscription} />
        <CreditsBalanceCard
          credits={credits}
          recentHistory={recentCreditsHistory as any}
        />
        <QuickActionsCard />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MyNamesCard />
        <GenerationHistoryCard />
      </div>

      {/* Account Details Section */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 mb-6">
        <h2 className="font-bold text-lg sm:text-xl mb-4">Account Details</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium break-all">{user.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">User ID</p>
              <p className="font-medium break-all">{user.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
