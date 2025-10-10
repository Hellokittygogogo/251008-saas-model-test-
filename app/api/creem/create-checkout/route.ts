import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    const productIdFromBody: string | undefined = body.productId;
    const creditsFromBody: number | undefined = body.credits_amount;

    const productId =
      productIdFromBody ||
      process.env.CREEM_PRODUCT_ID_CREDITS ||
      "prod_4MhfU5B9cKpRbhEDJnRghI"; // fallback for quick testing

    const credits = typeof creditsFromBody === "number" && creditsFromBody > 0 ? creditsFromBody : 3;

    const payload: any = {
      product_id: productId,
      customer: {
        email: user.email!,
      },
      metadata: {
        user_id: user.id,
        product_type: "credits",
        credits,
      },
    };

    if (process.env.CREEM_SUCCESS_URL) {
      payload.success_url = process.env.CREEM_SUCCESS_URL;
    }

    const apiUrl = (process.env.CREEM_API_URL || "https://test-api.creem.io/v1").replace(/\/$/, "");

    const resp = await fetch(`${apiUrl}/checkouts`, {
      method: "POST",
      headers: {
        "x-api-key": process.env.CREEM_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Creem create checkout failed:", resp.status, text);
      return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
    }

    const data = await resp.json();
    const checkoutUrl = data.checkout_url || data.url || data.checkoutUrl;
    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("create-checkout error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
