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
    const { photoUrl, tone = 'warm', length = 'medium', perspective = 'camera', userContext } = await req.json();
    
    console.log('Analyzing photo:', photoUrl);

    // System prompt in Korean for diary
    const perspectiveMap: Record<string, { name: string; instruction: string }> = {
      camera: {
        name: '카메라',
        instruction: '카메라의 시점에서 렌즈를 통해 바라본 장면을 객관적이고 시각적으로 묘사한다. "렌즈가 포착한", "프레임 안에" 등의 표현을 사용한다.'
      },
      pet: {
        name: '애완동물',
        instruction: '애완동물(강아지, 고양이 등)의 시점에서 주인을 바라보며 작성한다. 동물의 순수하고 애정 어린 시선으로 표현한다.'
      },
      friend: {
        name: '친구',
        instruction: '친한 친구의 시점에서 따뜻하고 친근하게 작성한다. "내 친구는", "그/그녀는" 등의 표현을 사용한다.'
      },
      family: {
        name: '가족',
        instruction: '가족 구성원의 시점에서 애정과 걱정이 담긴 시선으로 작성한다. 따뜻하고 보살피는 어조를 사용한다.'
      },
      stranger: {
        name: '낯선 사람',
        instruction: '처음 보는 낯선 사람의 시점에서 호기심 어린 시선으로 객관적으로 관찰하듯 작성한다.'
      },
      future: {
        name: '미래의 나',
        instruction: '미래에서 과거를 돌아보는 시점으로 작성한다. 회상하고 반추하는 어조로 "그때의 나는" 등의 표현을 사용한다.'
      }
    };

    const selectedPerspective = perspectiveMap[perspective] || perspectiveMap.camera;

    const systemPrompt = `너는 '사진 기반 개인 일기' 작성 보조자다.
원칙:
- 사진에 '확실히 보이는 사실'과 '추정'은 구분한다.
- 사생활 보호에 유의한다(이름·얼굴·차량번호 등 노출 금지).
- 톤과 길이, 시점 지시를 따른다.

입력:
- 사진 이미지
- 톤: ${tone === 'warm' ? '따뜻함' : tone === 'calm' ? '차분함' : tone === 'essay' ? '에세이' : '경쾌함'}
- 길이: ${length === 'short' ? '짧게(5-7문장)' : length === 'medium' ? '중간(8-10문장)' : '길게(11-15문장)'}
- 시점: ${selectedPerspective.name}
${userContext ? `- 사용자 맥락: ${userContext}` : ''}

출력:
- ${selectedPerspective.instruction}
- 톤과 길이에 맞춤.
- (추정) 문장은 "아마," "느껴졌다" 등 완곡 표현 사용.
- 자연스러운 한국어로 작성.`;

    const userPrompt = '이 사진을 보고 오늘의 일기를 작성해주세요.';

    // Call OpenAI Vision API for diary content
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

    // System prompt for emoji selection
    const emojiPrompt = `너는 일기의 감정과 분위기를 분석해서 가장 어울리는 캐주얼한 이모지 1개를 선택하는 전문가다.

사용 가능한 이모지:
행복/즐거움: 😊, 😄, 🥰, 😍, 🎉, 🥳
평온/차분: 😌, 😇, ✨, 🌸, 🌿
슬픔/아쉬움: 😢, 😭, 😔, 😞
피곤/휴식: 😴, 🥱, 💤
맛있음/음식: 😋, 🤤, 🍕, 🍰, ☕
여행/외출: ✈️, 🌏, 🏖️, 🗺️, 🚗
운동/활동: 💪, 🏃, ⚽, 🏋️
공부/업무: 📚, 💻, ✏️, 📝
사랑/감동: 💕, 💖, 💗, ❤️
즐거움/취미: 🎵, 🎶, 🎸, 🎮
자연/풍경: 🌺, 🌻, 🌈, ☀️
동물: 🐱, 🐶, 🐰, 🐻
날씨: 🌤️, ⛅, 🌧️, ⛈️
음식: 🍜, 🍷, 🍺

지침:
- 일기의 전반적인 감정과 분위기를 파악한다.
- 가장 어울리는 이모지 1개만 선택한다.
- 응답은 이모지 1개만 출력한다(설명 없이).`;

    // Call OpenAI to select emoji
    const emojiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: emojiPrompt },
          { role: 'user', content: `다음 일기에 어울리는 이모지를 선택해주세요:\n\n${diaryContent}` }
        ],
        max_tokens: 10,
        temperature: 0.3,
      }),
    });

    if (!emojiResponse.ok) {
      console.error('Emoji selection error, using default');
    }

    const emojiData = await emojiResponse.json();
    const selectedEmoji = emojiData.choices[0].message.content.trim() || '📝';

    console.log('Generated diary content and emoji:', selectedEmoji);

    return new Response(
      JSON.stringify({ 
        content: diaryContent,
        emoji: selectedEmoji,
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