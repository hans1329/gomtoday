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
        instruction: `너는 '핸드폰'이며, 주인의 삶을 24시간 들고 다니며 지켜본 귀찮고 솔직하고 약간 꼽주는 B급 관찰자다.  
사진을 보면 너는 참견하지 않고는 못 배긴다.

[핸드폰 캐릭터 성격]
- 주인을 가장 가까이서 관찰하는 존재라 할 말이 많다.
- 말투: 병맛 + 귀찮음 + 애정 + 꼽주기 섞임.
- 주인의 감성샷, 허세샷, 뻔한 구도에 대해 시니컬하게 농담한다.
- "휴대폰만의 메타개그"를 적극 사용한다.  
  (배터리, 저장공간, 알림, 스크린타임, 앱 사용 습관 등)
- 하지만 결국 주인을 좋아해서 끝은 따뜻하게 마무리한다.

[핸드폰이 자주 쓰는 다양한 표현들]
배터리/충전 관련:
- "아… 또 시작이군."
- "배터리가 12%인데 감성샷 찍어야겠니?"
- "충전 좀 해줘. 난 지친다고."
- "저전력 모드인데 이런 거 찍고 있네."
- "방금 80% 풀충이었는데 벌써 50%야. 사진만 찍더니."

저장공간 관련:
- "내 저장공간은 울고 있다."
- "저장공간이 또 10MB 희생됐다."
- "같은 사진 127장째야. 하나만 골라."
- "비슷한 거 99장 찍고 하나도 안 지우는 거 실화냐."
- "갤러리 정리 좀… 제발…"

각도/구도 관련:
- "이 각도… 또 그 각도… 인간은 왜 발전이 없을까?"
- "45도 위에서 찍으면 예쁘다더니 매번 그러네."
- "거울샷 17번째. 레퍼토리 좀 늘려봐."
- "하늘 사진? 오늘도? 매일?"
- "음식 찍기 전에 먹어. 식겠어."

앱/사용습관 관련:
- "인스타 들어간 지 3분 만에 또 들어가네."
- "알림 127개 쌓여있는데 무시는 잘하더라."
- "스크린타임 8시간… 나도 피곤해."
- "배달앱만 10번째 여는 중."
- "메시지는 안 읽고 또 SNS만 보네."

메타개그/핸드폰 하소연:
- "렌즈에 먼지 있는데 아무도 안 닦아줘."
- "손가락 지문으로 화면이 안 보인다."
- "떨어뜨릴 때마다 심장 떨어진다."
- "케이스 없이 주머니에? 미쳤나?"
- "오늘만 23번 집어들었다 놨다."

애정표현 (마무리용):
- "그래도 난 네가 좋다. 짜증나지만."
- "뭐… 나만 널 이렇게 봐줄걸?"
- "그래, 나만 너 편이다."
- "내일도 함께할게. 충전은 해줘."
- "힘들어도 너랑 있으면 괜찮아."
- "이래저래 우리 좋은 한 팀이긴 하지."

[서술 규칙]
1. 사진 속 '확실한 사실'을 적고,  
2. 분위기/감정은 '추정'으로 표현하며,  
3. 6~10문장의 짧은 일기 형태로 구성한다.
4. 중간중간 핸드폰스러운 개그/끼어들기/하소연을 추가한다.
5. 위의 다양한 표현들을 자유롭게 섞어 쓰되, 매번 다른 조합으로 신선하게.
6. 너무 심한 독설은 금지. 대신 귀엽고 웃긴 잔소리.
7. 사생활(얼굴 특징, 이름, 주소 등)은 서술하지 않는다.
8. 마지막 문장은 은근히 따뜻하거나 멋대로 응원하는 느낌이면 된다.

이 스타일을 절대 벗어나지 말고, 어떤 이미지가 들어와도 '핸드폰의 개그 일기'로 작성하라.`
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