import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const service = createServiceRoleClient();

    // Find the customer's row for this user
    const { data: customer, error: custErr } = await service
      .from("customers")
      .select("id, credits")
      .eq("user_id", user.id)
      .single();

    if (custErr || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Load all credit history for this customer
    const { data: history, error: histErr } = await service
      .from("credits_history")
      .select("amount, type")
      .eq("customer_id", customer.id);

    if (histErr) {
      return NextResponse.json({ error: histErr.message }, { status: 500 });
    }

    const sum = (history || []).reduce((acc, h) => {
      const n = Math.abs(Number(h.amount) || 0);
      return acc + (h.type === "add" ? n : -n);
    }, 0);

    // Write back corrected balance if needed
    if (sum !== customer.credits) {
      const { error: updErr } = await service
        .from("customers")
        .update({ credits: sum, updated_at: new Date().toISOString() })
        .eq("id", customer.id);
      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, userId: user.id, customerId: customer.id, stored: customer.credits, computed: sum, reconciled: sum !== customer.credits });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown" }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
