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
    const { photoUrl, photoUrls, emotion = 'happy', length = 'medium', perspective = 'camera', userContext, participants = [], userId } = await req.json();
    
    const photos = photoUrls || (photoUrl ? [photoUrl] : []);
    
    if (photos.length === 0) {
      throw new Error('No photos provided');
    }
    
    console.log('Analyzing photos:', photos.length, 'images');
    console.log('Participants:', participants);
    console.log('Perspective:', perspective);
    console.log('UserId:', userId);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch perspective from database
    const { data: perspectiveData, error: perspectiveError } = await supabase
      .from('perspectives')
      .select('label, prompt_template')
      .eq('perspective_key', perspective)
      .eq('is_active', true)
      .maybeSingle();

    if (perspectiveError || !perspectiveData) {
      console.error('Perspective not found:', perspective);
      throw new Error('Invalid perspective');
    }

    // 나의 시선일 때만 등장인물에서 본인 제외 (카메라는 본인을 관찰하므로 포함)
    const otherParticipants = perspective === 'my_view' && userId
      ? participants.filter((p: any) => p.id !== userId)
      : participants;

    const participantNames = otherParticipants.map((p: any) => p.name).join(', ');
    const participantContext = otherParticipants.length > 0 
      ? `등장인물: ${participantNames}. 이들이 함께한 하루를 자연스럽게 묘사한다.`
      : '';

    // Use prompt template from database
    let perspectiveInstruction = perspectiveData.prompt_template || '';
    
    // Process length first to get sentenceCount
    const lengthMap: Record<string, { name: string; sentenceCount: string; description: string }> = {
      short: { name: '짧게', sentenceCount: '4-6문장으로', description: '핵심만 담아 간결하게 작성한다.' },
      medium: { name: '보통', sentenceCount: '8-12문장으로', description: '적당한 길이로 작성한다.' },
      long: { name: '길게', sentenceCount: '15-20문장으로', description: '디테일하게 작성한다.' }
    };
    const selectedLength = lengthMap[length] || lengthMap.medium;
    
    // Replace variables in template if they exist
    if (perspectiveInstruction.includes('{participantContext}')) {
      perspectiveInstruction = perspectiveInstruction.replace('{participantContext}', participantContext);
    }
    if (perspectiveInstruction.includes('{participantNames}')) {
      perspectiveInstruction = perspectiveInstruction.replace('{participantNames}', participantNames || '집사');
    }
    if (perspectiveInstruction.includes('{sentenceCount}')) {
      perspectiveInstruction = perspectiveInstruction.replace('{sentenceCount}', selectedLength.sentenceCount);
    }

    const emotionMap: Record<string, { name: string; description: string }> = {
      happy: { name: '기쁨', description: '밝고 긍정적인 에너지가 넘치는 톤으로 작성한다.' },
      sad: { name: '슬픔', description: '잔잔하고 감성적인 톤으로 작성한다.' },
      angry: { name: '화남', description: '강렬하고 직설적인 톤으로 작성한다.' },
      calm: { name: '평온', description: '차분하고 고요한 톤으로 작성한다.' },
      excited: { name: '설렘', description: '활기차고 들뜬 톤으로 작성한다.' }
    };

    const selectedEmotion = emotionMap[emotion] || emotionMap.happy;

    const systemPrompt = `너는 사진을 기반으로 일기를 작성하는 AI 작가다.

시점 설정: ${perspectiveData.label}
${perspectiveInstruction}

감정 톤: ${selectedEmotion.name}
${selectedEmotion.description}

${userContext ? `추가 맥락: ${userContext}` : ''}

중요 규칙:
1. 사진에서 보이는 것만을 바탕으로 작성한다
2. 과장이나 상상을 배제한다
3. 자연스러운 한국어로 작성한다
4. 시간 흐름을 자연스럽게 연결한다
5. 마지막은 감정적으로 울림 있게 마무리한다
6. 일기 내용은 3-5개의 문단으로 구성하며, 각 문단 사이에는 줄바꿈(\\n\\n)을 넣는다

응답 형식은 반드시 다음 JSON 형식으로만 제공한다:
{
  "diary": "일기 내용 (문단 구분을 위해 \\n\\n 사용)",
  "title": "일기 제목 (15자 이내, 핵심 키워드 중심)",
  "emoji": "대표 이모지 1개"
}`;
    
    console.log('=== System Prompt ===');
    console.log('participantNames:', participantNames);
    console.log('participantContext:', participantContext);
    console.log('Final perspectiveInstruction:', perspectiveInstruction);
    console.log('Full systemPrompt:', systemPrompt);

    const imageContents = photos.map((url: string) => ({
      type: "image_url",
      image_url: { url }
    }));

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
              {
                type: "text",
                text: photos.length > 1 
                  ? "이 사진들을 시간 순서대로 분석하여 하루의 흐름이 담긴 일기를 작성해줘."
                  : "이 사진을 분석하여 일기를 작성해줘."
              },
              ...imageContents
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    console.log('OpenAI Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${JSON.stringify(data)}`);
    }

    const content = data.choices[0].message.content;
    console.log('Generated content:', content);
    
    // JSON 형식으로 파싱 시도
    let parsedContent;
    try {
      // 코드 블록이나 마크다운 형식 제거
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      parsedContent = JSON.parse(cleanedContent);
    } catch (e) {
      console.error('JSON parsing error:', e);
      // JSON 파싱 실패시 텍스트에서 추출 시도
      const diaryMatch = content.match(/"diary":\s*"([^"]+)"/);
      const titleMatch = content.match(/"title":\s*"([^"]+)"/);
      const emojiMatch = content.match(/"emoji":\s*"([^"]+)"/);
      
      parsedContent = {
        diary: diaryMatch ? diaryMatch[1] : content,
        title: titleMatch ? titleMatch[1] : '오늘의 일기',
        emoji: emojiMatch ? emojiMatch[1] : '📝'
      };
    }

    return new Response(
      JSON.stringify({
        diary: parsedContent.diary || content,
        title: parsedContent.title || '오늘의 일기',
        emoji: parsedContent.emoji || '📝'
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  } catch (error) {
    console.error('Error in analyze-photo function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        diary: '일기를 생성하는 중 오류가 발생했습니다.',
        title: '오류 발생',
        emoji: '❌'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  }
});
