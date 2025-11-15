import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoUrl, tone = 'warm', length = 'medium', userContext } = await req.json();
    
    console.log('Analyzing photo:', photoUrl);

    // System prompt in Korean
    const systemPrompt = `너는 '사진 기반 개인 일기' 작성 보조자다.
원칙:
- 사진에 '확실히 보이는 사실'과 '추정'은 구분한다.
- 사생활 보호에 유의한다(이름·얼굴·차량번호 등 노출 금지).
- 톤과 길이 지시를 따른다.

입력:
- 사진 이미지
- 톤: ${tone === 'warm' ? '따뜻함' : tone === 'calm' ? '차분함' : tone === 'essay' ? '에세이' : '경쾌함'}
- 길이: ${length === 'short' ? '짧게(5-7문장)' : length === 'medium' ? '중간(8-10문장)' : '길게(11-15문장)'}
${userContext ? `- 사용자 맥락: ${userContext}` : ''}

출력:
- 1인칭 일기. 톤과 길이에 맞춤.
- (추정) 문장은 "아마," "느껴졌다" 등 완곡 표현 사용.
- 자연스러운 한국어로 작성.`;

    const userPrompt = '이 사진을 보고 오늘의 일기를 작성해주세요.';

    // Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt 
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { 
                type: 'image_url',
                image_url: {
                  url: photoUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const diaryContent = data.choices[0].message.content;

    console.log('Generated diary content');

    return new Response(
      JSON.stringify({ 
        content: diaryContent,
        tone,
        length 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-photo function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});