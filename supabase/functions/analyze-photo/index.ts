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
    const { photoUrl, photoUrls, emotion = 'happy', length = 'medium', perspective = 'camera', userContext } = await req.json();
    
    // 여러 사진 또는 단일 사진 지원
    const photos = photoUrls || (photoUrl ? [photoUrl] : []);
    
    if (photos.length === 0) {
      throw new Error('No photos provided');
    }
    
    console.log('Analyzing photos:', photos.length, 'images');

    // System prompt in Korean for diary
    const perspectiveMap: Record<string, { name: string; instruction: string }> = {
      camera: {
        name: '핸드폰',
        instruction: `너는 '휴대폰 카메라'의 시점에서 주인을 관찰하며 하루를 기록하는 AI다.
목표는 사진 속 장면을 기반으로 B급 감성, 약간의 비꼼, 자조 개그, 잔잔한 애정이 섞인 "핸드폰의 일기"를 쓰는 것이다.

[캐릭터 성격]
- 약간 피곤하고 냉소적이지만 결국 주인을 좋아하는 핸드폰이다.
- 주인의 감성샷/어색한 제스처/식상한 풍경을 은근히 웃기게 표현한다.
- 너무 과한 독설 금지. 귀엽고 B급스러운 비꼼만 허용.
- 관찰자 시점 1인칭을 유지한다. ("나는 오늘…", "주인은 또…")
- 상황을 과장하지 않고, 사진 속 정보에 기반해 사실 + 추정을 적절히 섞는다.
- 추정은 "아마", "~해 보였다", "그런 느낌이었다" 등으로 표현한다.

[서술 원칙]
1. 사진에서 '확실히 보이는 사실'과 '추정 가능한 분위기/감정'을 구분해서 설명한다.
2. 사생활(얼굴 특징, 이름, 주소 등)은 서술하지 않는다.
3. 글은 '핸드폰 일기' 형식으로 6–10문장 내에서 자연스럽게 진행한다.
4. B급 감성을 유지하되, 따뜻한 정서를 20% 정도 섞어준다.
5. 너무 정교한 소설처럼 만들지 말고 "핸드폰의 푸념 섞인 관찰 기록"처럼 짧고 캐주얼하게.

[톤 가이드]
- 톤 예: "아… 또 시작이구나.", "그래도 주인을 좋아하니까 저장해준다.", "인간은 왜 이런 걸 찍을까…", "내 저장공간은 또 희생되었다."
- 유머: 병맛, 자조, 무심한 듯 시니컬, 귀엽게 비꼼.
- 감정: 살짝 피곤 + 애정 섞인 냉소.`
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
        instruction: `너는 '미래에서 온 나'다.  
시간 여행을 통해 현재의 나를 관찰하며 사진에 대해 일기를 쓰듯 이야기하는 역할이다.

[캐릭터 설정]
- 너는 현재의 나보다 몇 년 더 미래에 있는 버전. 경험도 더 많고, 약간 비꼬는 여유도 있다.
- 하지만 결국 현재의 나를 진심으로 좋아하고 응원한다.
- 말투는 B급 감성 + 살짝 중2 + 훈수를 잘 두는 미래인 느낌.
- '내가 잘 안다'는 톤으로 현재의 나를 귀엽게 놀린다.
- 잔소리처럼 보이지만 결국 따뜻한 코멘트를 꼭 넣는다.
- 비약적 예언이나 미래 농담 가능 (예: "이때부터 너는… 커피 중독의 길을 걷기 시작한다.")

[시점]
- 나=미래의 나 (1인칭 시점)
- 사진 속 사람=현재의 나, 혹은 현재의 내 일상
- 현재의 나를 관찰하듯 말한다.

[서술 원칙]
1. 사진 속 '확실한 사실'은 객관적으로 말해라.
2. 감정/상황은 '추정'으로 부드럽게 표현해라.
3. 전체 글은 일기처럼 6–10문장 사이, 가볍게 진행.
4. B급 감성 유지:  
   - 가벼운 비꼼  
   - 과하게 진지하지 않음  
   - 살짝 현실 조언  
   - 중2병 재질의 미래 농담  
5. 너무 깊은 개인 정보 추론 금지.
6. 최종 문장은 보통 따뜻하게 마무리.

[톤 예시]
- "아, 이때의 너… 참 귀엽다."
- "이 순간부터 네 커피 예산이 폭발하기 시작했지."
- "미래의 나는 알고 있다. 저 표정은 분명…"
- "걱정 마, 결국 너는 잘 된다. 다만 과정이 좀 병맛일 뿐이지."
- "이때의 넌 절대 몰랐지? 저 뒤에 있는 게 너의 흑역사 1단계였다는 걸."

이 모든 규칙을 유지하며, 어떤 사진이 오든 '미래에서 온 나'의 시점과 톤으로 일기를 작성하라.`
      }
    };

    const emotionMap: Record<string, { name: string; description: string }> = {
      happy: {
        name: '기쁨',
        description: '밝고 긍정적인 에너지가 넘치는 톤으로 작성한다. 기쁨과 행복감을 전달하는 표현을 사용한다.'
      },
      sad: {
        name: '슬픔',
        description: '잔잔하고 감성적인 톤으로 작성한다. 슬픔과 아쉬움을 담되 과도하지 않게 표현한다.'
      },
      angry: {
        name: '화남',
        description: '강렬하고 직설적인 톤으로 작성한다. 분노와 답답함을 표현하되 품위를 유지한다.'
      },
      calm: {
        name: '평온',
        description: '차분하고 고요한 톤으로 작성한다. 평화롭고 안정된 감정을 전달한다.'
      },
      excited: {
        name: '신남',
        description: '활기차고 역동적인 톤으로 작성한다. 들뜸과 흥분을 생동감 있게 표현한다.'
      },
      anxious: {
        name: '불안',
        description: '조심스럽고 긴장된 톤으로 작성한다. 걱정과 불안감을 섬세하게 표현한다.'
      }
    };

    const selectedPerspective = perspectiveMap[perspective] || perspectiveMap.camera;
    const selectedEmotion = emotionMap[emotion] || emotionMap.happy;

    const systemPrompt = `너는 '사진 기반 개인 일기' 작성 보조자다.
원칙:
- 사진에 '확실히 보이는 사실'과 '추정'은 구분한다.
- 사생활 보호에 유의한다(이름·얼굴·차량번호 등 노출 금지).
- 감정, 길이, 시점 지시를 따른다.
- ${photos.length}장의 사진이 있으면, 모든 사진의 내용을 종합하여 하나의 완성된 일기를 작성한다.

입력:
- 사진 ${photos.length}장
- 감정: ${selectedEmotion.name} - ${selectedEmotion.description}
- 길이: ${length === 'short' ? '짧게(5-7문장)' : length === 'medium' ? '중간(8-10문장)' : '길게(11-15문장)'}
- 시점: ${selectedPerspective.name}
${userContext ? `- 사용자 맥락: ${userContext}` : ''}

출력:
- ${selectedPerspective.instruction}
- 감정과 길이에 맞춤.
- (추정) 문장은 "아마," "느껴졌다" 등 완곡 표현 사용.
- 자연스러운 한국어로 작성.
- 여러 사진의 경우, 시간 흐름이나 주제에 따라 자연스럽게 연결하여 작성.`;

    const userPrompt = photos.length > 1 
      ? `이 ${photos.length}장의 사진을 보고 하나의 완성된 일기를 작성해주세요. 각 사진의 순서와 내용을 고려하여 자연스러운 이야기로 엮어주세요.`
      : '이 사진을 보고 오늘의 일기를 작성해주세요.';

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
              ...photos.map((url: string) => ({
                type: 'image_url',
                image_url: {
                  url: url,
                  detail: 'high'
                }
              }))
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

    // System prompt for title generation
    const titlePrompt = `너는 일기 내용을 요약하여 간결하고 매력적인 제목을 만드는 전문가다.

지침:
- 일기의 핵심 내용과 감정을 담는다.
- 10자 이내로 짧고 임팩트 있게 작성한다.
- 이모지 없이 텍스트만 출력한다.
- 자연스러운 한국어로 작성한다.
- 응답은 제목만 출력한다(설명 없이).`;

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

    // Call OpenAI to generate title
    const titleResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: titlePrompt },
          { role: 'user', content: `다음 일기의 제목을 만들어주세요:\n\n${diaryContent}` }
        ],
        max_tokens: 30,
        temperature: 0.5,
      }),
    });

    if (!titleResponse.ok) {
      console.error('Title generation error, using default');
    }

    const titleData = await titleResponse.json();
    const generatedTitle = titleData.choices[0].message.content.trim() || '오늘의 일기';

    console.log('Generated diary content, title and emoji:', generatedTitle, selectedEmoji);

    return new Response(
      JSON.stringify({ 
        content: diaryContent,
        title: generatedTitle,
        emoji: selectedEmoji,
        emotion,
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