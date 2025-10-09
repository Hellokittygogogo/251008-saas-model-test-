import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// POST /api/creem/create-checkout
// body: { productType: 'credits'|'subscription'|'chinese-name-credits', productId?: string, credits?: number, userId?: string, discountCode?: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const productType: string = body.productType || 'credits';
    const overrideProductId: string | undefined = body.productId;
    const credits: number | undefined = body.credits;

    const CREEM_API_URL = process.env.CREEM_API_URL;
    const CREEM_API_KEY = process.env.CREEM_API_KEY;
    const SUCCESS_URL = process.env.CREEM_SUCCESS_URL;

    if (!CREEM_API_URL || !CREEM_API_KEY) {
      return NextResponse.json({ error: 'Creem is not configured' }, { status: 500 });
    }

    // Get user context (email) for a better checkout experience
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const product_id = overrideProductId || process.env.DEFAULT_CREEM_PRODUCT_ID || undefined;

    if (!product_id) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const reqBody: any = {
      product_id,
      customer: user?.email ? { email: user.email } : undefined,
      metadata: {
        user_id: user?.id || body.userId || 'guest',
        product_type: productType,
        credits: credits || 0,
      },
    };

    if (SUCCESS_URL) reqBody.success_url = SUCCESS_URL;
    if (body.discountCode) reqBody.discount_code = body.discountCode;

    const res = await fetch(`${CREEM_API_URL}/checkouts`, {
      method: 'POST',
      headers: {
        'x-api-key': CREEM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('Creem checkout error', res.status, txt);
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ checkoutUrl: data.checkout_url });
  } catch (e: any) {
    console.error('Create checkout exception', e);
    return NextResponse.json({ error: e?.message || 'server error' }, { status: 500 });
  }
}
