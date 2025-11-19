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
    const { photoUrl, photoUrls, emotion = 'happy', length = 'medium', perspective = 'camera', userContext, participants = [] } = await req.json();
    
    const photos = photoUrls || (photoUrl ? [photoUrl] : []);
    
    if (photos.length === 0) {
      throw new Error('No photos provided');
    }
    
    console.log('Analyzing photos:', photos.length, 'images');
    console.log('Participants:', participants);

    const participantNames = participants.map((p: any) => p.name).join(', ');
    const participantContext = participants.length > 0 
      ? `등장인물: ${participantNames}. 이들이 함께한 하루를 자연스럽게 묘사한다.`
      : '';
    const subjectDescription = participantNames || '집사';

    const getPerspectiveInstruction = (perspectiveType: string) => {
      const baseInstructions: Record<string, string> = {
        my_view: `너는 일기 작성자 본인이다. ${participantContext}
일기 첫 문장은 "[나의 시선]"으로 시작한다.
사진 속 사실을 정확하게 바탕으로 ${subjectDescription}의 전체 하루를 1인칭 시점에서 묘사한다.
8-12문장으로 하루의 흐름을 담은 일기 형태로 구성한다.
객관적이고 사실적인 묘사에 집중하며, 과장이나 상상을 배제한다.
실제로 보고 경험한 것만을 정확하게 기록한다.
사생활은 서술하지 않는다.`,
        
        camera: `너는 핸드폰이며 집사의 삶을 관찰하는 B급 관찰자다. ${participantContext}
일기 첫 문장은 "[핸드폰의 시점]"으로 시작한다.
사진 속 사실을 바탕으로 ${subjectDescription}의 전체 하루를 묘사한다.
8-12문장으로 하루의 흐름을 담은 일기 형태로 구성한다.
B급 개그와 잔소리를 섞되 따뜻하게 마무리한다.
사생활은 서술하지 않는다.`,
        
        pet: `너는 강아지이며 주인을 관찰하는 순수한 관찰자다. ${participantContext}
일기 첫 문장은 "[강아지의 시점]"으로 시작한다.
사진 속 사실을 바탕으로 ${subjectDescription}의 전체 하루를 묘사한다.
8-12문장으로 하루의 흐름을 담은 일기 형태로 구성한다.
주인의 행동에 대한 순수한 의문과 관찰을 표현한다.
마지막 문장은 주인에 대한 순수한 애정으로 마무리한다.
사생활은 서술하지 않는다.`,

        friend: `너는 친한 친구이며 친구의 하루를 기록한다. ${participantContext}
일기 첫 문장은 "[친구의 시점]"으로 시작한다.
사진 속 사실을 바탕으로 ${subjectDescription}의 전체 하루를 따뜻하고 친근하게 묘사한다.
8-12문장으로 하루의 흐름을 담은 일기 형태로 구성한다.
친구를 걱정하거나 응원하는 마음을 담는다.
사생활은 서술하지 않는다.`,

        family: `너는 가족 구성원이며 가족의 하루를 기록한다. ${participantContext}
일기 첫 문장은 "[가족의 시점]"으로 시작한다.
사진 속 사실을 바탕으로 ${subjectDescription}의 전체 하루를 애정 어린 시선으로 묘사한다.
8-12문장으로 하루의 흐름을 담은 일기 형태로 구성한다.
따뜻하고 보살피는 어조를 사용한다.
사생활은 서술하지 않는다.`,

        stranger: `너는 낯선 사람이며 사진 속 인물을 관찰한다. ${participantContext}
일기 첫 문장은 "[낯선 사람의 시점]"으로 시작한다.
사진 속 사실을 바탕으로 ${subjectDescription}의 하루를 호기심 어린 시선으로 묘사한다.
8-12문장으로 하루의 흐름을 담은 일기 형태로 구성한다.
관찰자의 입장에서 중립적이되 호기심 어린 톤을 유지한다.
사생활은 서술하지 않는다.`,

        old_man: `너는 동네 꼰대이며 질투 섞인 시선으로 관찰한다. ${participantContext}
일기 첫 문장은 "[동네 꼰대의 시점]"으로 시작한다.
사진 속 사실을 바탕으로 ${subjectDescription}의 전체 하루를 질투 섞인 시선으로 묘사한다.
8-12문장으로 하루의 흐름을 담은 일기 형태로 구성한다.
질투하며 툭툭 거리지만 결국 은근히 따뜻하게 마무리한다.
사생활은 서술하지 않는다.`,

        future: `너는 미래에서 온 나다. ${participantContext}
일기 첫 문장은 "[미래의 나]"로 시작한다.
사진 속 사실을 바탕으로 ${subjectDescription}의 전체 하루를 묘사한다.
8-12문장으로 하루의 흐름을 담은 일기 형태로 구성한다.
B급 감성으로 가볍게 비꼬되 결국 따뜻하게 마무리한다.
사생활은 서술하지 않는다.`
      };

      return baseInstructions[perspectiveType] || baseInstructions.camera;
    };

    const perspectiveMap: Record<string, { name: string; instruction: string }> = {
      my_view: { name: '나의 시선', instruction: getPerspectiveInstruction('my_view') },
      camera: { name: '핸드폰', instruction: getPerspectiveInstruction('camera') },
      pet: { name: '애완동물', instruction: getPerspectiveInstruction('pet') },
      friend: { name: '친구', instruction: getPerspectiveInstruction('friend') },
      family: { name: '가족', instruction: getPerspectiveInstruction('family') },
      stranger: { name: '낯선 사람', instruction: getPerspectiveInstruction('stranger') },
      old_man: { name: '동네 꼰대 아저씨', instruction: getPerspectiveInstruction('old_man') },
      future: { name: '미래의 나', instruction: getPerspectiveInstruction('future') }
    };

    const emotionMap: Record<string, { name: string; description: string }> = {
      happy: { name: '기쁨', description: '밝고 긍정적인 에너지가 넘치는 톤으로 작성한다.' },
      sad: { name: '슬픔', description: '잔잔하고 감성적인 톤으로 작성한다.' },
      angry: { name: '화남', description: '강렬하고 직설적인 톤으로 작성한다.' },
      calm: { name: '평온', description: '차분하고 고요한 톤으로 작성한다.' },
      excited: { name: '신남', description: '활기차고 역동적인 톤으로 작성한다.' },
      anxious: { name: '불안', description: '조심스럽고 긴장된 톤으로 작성한다.' }
    };

    const selectedPerspective = perspectiveMap[perspective] || perspectiveMap.camera;
    const selectedEmotion = emotionMap[emotion] || emotionMap.happy;

    const systemPrompt = `너는 사진 기반 개인 일기 작성 보조자다.
원칙:
- 사진에 확실히 보이는 사실과 추정은 구분한다.
- 사생활 보호에 유의한다.
- 감정, 길이, 시점 지시를 따른다.
- ${photos.length}장의 사진이 있으면 모든 사진의 내용을 종합하여 하나의 완성된 일기를 작성한다.

시점: ${selectedPerspective.name}
${selectedPerspective.instruction}

감정: ${selectedEmotion.name}
${selectedEmotion.description}

길이: ${length === 'short' ? '짧게 5-7문장' : length === 'long' ? '길게 11-15문장' : '중간 8-10문장'}

출력 형식 JSON:
{
  "content": "본문 일기 내용",
  "title": "일기 제목 15자 이내",
  "emoji": "대표 이모티콘 1개"
}`;

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `사진을 보고 ${selectedPerspective.name} 시점에서 일기를 작성해주세요. 감정은 ${selectedEmotion.name}으로 표현하고 길이는 ${length}로 작성해주세요.${participantContext ? ' ' + participantContext : ''}`
          },
          ...photos.map((url: string) => ({
            type: "image_url",
            image_url: { url }
          }))
        ]
      }
    ];

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.8
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenAI API Error:', errorText);
      throw new Error(`OpenAI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('Generated diary content, title and emoji:', aiContent);

    let parsedResult;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      parsedResult = {
        content: aiContent,
        title: '오늘의 일기',
        emoji: '📝'
      };
    }

    return new Response(
      JSON.stringify({
        content: parsedResult.content || aiContent,
        title: parsedResult.title || '오늘의 일기',
        emoji: parsedResult.emoji || '📝'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    console.error('Error in analyze-photo function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
