import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import puppeteer from 'puppeteer';
import { generateCertificateHTML } from '@/utils/pdf-templates/name-certificate';

interface NameData {
  chinese: string;
  pinyin: string;
  characters: Array<{
    character: string;
    pinyin: string;
    meaning: string;
    explanation: string;
  }>;
  meaning: string;
  culturalNotes: string;
  personalityMatch: string;
  style: string;
}

interface RequestBody {
  nameData: NameData;
  userData: {
    englishName: string;
    gender: string;
  };
}

export async function POST(request: Request) {
  console.log('=== PDF Generation API Called ===');
  
  try {
    const supabase = await createClient();
    
    // Check user auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required for PDF generation' },
        { status: 401 }
      );
    }

    const body: RequestBody = await request.json();
    const { nameData, userData } = body;

    if (!nameData || !userData) {
      return NextResponse.json(
        { error: 'Missing required data: nameData and userData' },
        { status: 400 }
      );
    }

    console.log('PDF generation request:', {
      user: user.id,
      chineseName: nameData.chinese,
      englishName: userData.englishName
    });

    // Check user credits
      const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching customer:', fetchError);
      return NextResponse.json(
        { error: 'Unable to verify user credits' },
        { status: 500 }
      );
    }

    if (!customer || customer.credits < 1) {
      console.log('Insufficient credits:', {
        hasCustomer: !!customer,
        credits: customer?.credits
      });
      return NextResponse.json(
        { 
          error: 'Insufficient credits. PDF generation requires 1 credit.',
          creditsRequired: 1,
          currentCredits: customer?.credits || 0
        },
        { status: 403 }
      );
    }

    // 鐢熸垚HTML鍐呭
    const htmlContent = generateCertificateHTML(nameData, userData);
    
    // 浣跨敤Puppeteer鐢熸垚PDF
    let browser;
    try {
      console.log('Launching Puppeteer...');
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // This can be risky but helps with Docker
          '--disable-gpu'
        ],
      });

      const page = await browser.newPage();
      
      // 璁剧疆椤甸潰鍐呭
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // 鐢熸垚PDF
      console.log('Generating PDF...');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5cm',
          right: '0.5cm',
          bottom: '0.5cm',
          left: '0.5cm'
        }
      });

      await browser.close();
      console.log('PDF generated successfully');

      // 鎵ｉ櫎绉垎
      const newCredits = customer.credits - 1;
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          credits: newCredits,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to deduct credits:', updateError);
        // 娉ㄦ剰锛歅DF宸茬敓鎴愶紝浣嗙Н鍒嗘墸闄ゅけ璐?        // 鍦ㄧ敓浜х幆澧冧腑鍙兘闇€瑕佸洖婊氭垨璁板綍杩欑鎯呭喌
      } else {
        // 璁板綍绉垎娑堣垂鍘嗗彶
        await supabase
          .from('credits_history')
          .insert({
            customer_id: customer.id,
            amount: 1,
            type: 'subtract',
            description: 'pdf_generation',
            metadata: {
              operation: 'pdf_generation',
              chinese_name: nameData.chinese,
              english_name: userData.englishName,
              credits_before: customer.credits,
              credits_after: newCredits,
              generated_at: new Date().toISOString()
            }
          });
        
        console.log('Credits deducted successfully:', {
          userId: user.id,
          creditsBefore: customer.credits,
          creditsAfter: newCredits
        });
      }

      // 璁剧疆鍝嶅簲澶村苟杩斿洖PDF
      const fileName = `${nameData.chinese}_certificate.pdf`;
      
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
          'Content-Length': pdfBuffer.length.toString(),
        },
      });

    } catch (puppeteerError) {
      console.error('Puppeteer error:', puppeteerError);
      if (browser) {
        await browser.close();
      }
      throw puppeteerError;
    }

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}




