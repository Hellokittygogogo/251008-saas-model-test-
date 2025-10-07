import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET - 鑾峰彇鐢ㄦ埛绉垎锛堜娇鐢ㄧ粺涓€鐨刢ustomers琛級
export async function GET() {
  try {
    const supabase = await createClient();
    
    // 鑾峰彇褰撳墠鐢ㄦ埛
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 鏌ヨ鐢ㄦ埛鐨刢ustomer璁板綍
    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        *,
        credits_history (
          amount,
          type,
          created_at,
          description
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching customer data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch customer data' },
        { status: 500 }
      );
    }

    // note: comment removed for build safety`r`n
    if(!customer) {
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          user_id: user.id,
          email: user.email || 'unknown@example.com',
          credits: 3, // 鏂扮敤鎴疯禒閫?绉垎
          creem_customer_id: `new_user_${user.id}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            source: 'chinese_name_generator',
            initial_credits: 3
          }
        })
        .select(`
          *,
          credits_history (
            amount,
            type,
            created_at,
            description
          )
        `)
        .single();

      if (createError) {
        console.error('Error creating customer record:', createError);
        return NextResponse.json(
          { error: 'Failed to create customer record' },
          { status: 500 }
        );
      }

      // Record initial credits
        await supabase
        .from('credits_history')
        .insert({
          customer_id: newCustomer.id,
          amount: 3,
          type: 'add',
          description: 'Welcome bonus for new user',
          metadata: { source: 'welcome_bonus' }
        });

      return NextResponse.json({ 
        credits: {
          id: newCustomer.id,
          user_id: newCustomer.user_id,
          total_credits: newCustomer.credits,
          remaining_credits: newCustomer.credits,
          created_at: newCustomer.created_at,
          updated_at: newCustomer.updated_at
        }
      });
    }

    // note: comment removed for build safety`r`n
    return NextResponse.json({ 
      credits: {
        id: customer.id,
        user_id: customer.user_id,
        total_credits: customer.credits, // 浣跨敤褰撳墠绉垎浣滀负鎬荤Н鍒?        remaining_credits: customer.credits,
        created_at: customer.created_at,
        updated_at: customer.updated_at
      }
    });
  } catch (error) {
    console.error('Credits API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - 娑堣垂绉垎锛堜娇鐢ㄧ粺涓€鐨刢ustomers琛級
export async function POST(request: Request) {
  try {
    const { amount, operation } = await request.json();
    
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid credit amount' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // 鑾峰彇褰撳墠鐢ㄦ埛
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 鑾峰彇褰撳墠customer璁板綍
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching customer:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch customer data' },
        { status: 500 }
      );
    }

    // note: comment removed for build safety`r`n
    return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 400 }
      );
    }

    // 鏇存柊绉垎
    const newCredits = customer.credits - amount;
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({
        credits: newCredits,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating credits:', updateError);
      return NextResponse.json(
        { error: 'Failed to update credits' },
        { status: 500 }
      );
    }

    // 璁板綍绉垎娑堣垂鍘嗗彶
    const { error: historyError } = await supabase
      .from('credits_history')
      .insert({
        customer_id: customer.id,
        amount: amount,
        type: 'subtract',
        description: operation || 'name_generation',
        metadata: {
          operation: operation,
          credits_before: customer.credits,
          credits_after: newCredits
        }
      });

    if (historyError) {
      console.error('Error recording credit transaction:', historyError);
      // 涓嶅奖鍝嶄富瑕佹祦绋嬶紝鍙褰曢敊璇?    }

    // note: comment removed for build safety`r`n
    return NextResponse.json({ 
      credits: {
        id: updatedCustomer.id,
        user_id: updatedCustomer.user_id,
        total_credits: updatedCustomer.credits,
        remaining_credits: updatedCustomer.credits,
        created_at: updatedCustomer.created_at,
        updated_at: updatedCustomer.updated_at
      },
      success: true 
    });
  } catch (error) {
    console.error('Credits spend API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





