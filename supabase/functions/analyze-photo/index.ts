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
    const { photoIds, emotion = 'happy', length = 'medium', perspective = 'camera', userContext, participants = [], userId } = await req.json();
    
    if (!photoIds || photoIds.length === 0) {
      throw new Error('No photo IDs provided');
    }
    
    console.log('Analyzing photos:', photoIds.length, 'images');
    console.log('Photo IDs:', photoIds);
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
    
    // Replace variables in template (use replaceAll for multiple occurrences)
    perspectiveInstruction = perspectiveInstruction
      .replaceAll('{participantContext}', participantContext)
      .replaceAll('{participantNames}', participantNames || '집사')
      .replaceAll('{sentenceCount}', selectedLength.sentenceCount);

    const emotionMap: Record<string, { name: string; description: string }> = {
      happy: { name: '기쁨', description: '밝고 긍정적인 에너지가 넘치는 톤으로 작성한다.' },
      sad: { name: '슬픔', description: '잔잔하고 감성적인 톤으로 작성한다.' },
      angry: { name: '화남', description: '강렬하고 직설적인 톤으로 작성한다.' },
      calm: { name: '평온', description: '차분하고 고요한 톤으로 작성한다.' },
      excited: { name: '설렘', description: '활기차고 들뜬 톤으로 작성한다.' }
    };

    const selectedEmotion = emotionMap[emotion] || emotionMap.happy;

    const systemPrompt = `${perspectiveInstruction}

[감정 톤: ${selectedEmotion.name}]
${selectedEmotion.description}

${userContext ? `[추가 맥락]\n${userContext}\n` : ''}
[응답 형식]
반드시 다음 JSON 형식으로만 제공한다:
{
  "diary": "일기 내용 (문단 구분을 위해 \\n\\n 사용)",
  "title": "일기 제목 (15자 이내)",
  "emoji": "대표 이모지 1개"
}`;
    
    console.log('=== System Prompt ===');
    console.log('participantNames:', participantNames);
    console.log('participantContext:', participantContext);
    console.log('Final perspectiveInstruction:', perspectiveInstruction);
    console.log('Full systemPrompt:', systemPrompt);

    // Fetch base64 data from database
    console.log('Fetching images from database...');
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('id, metadata')
      .in('id', photoIds);
    
    if (photosError || !photos || photos.length === 0) {
      console.error('Failed to fetch photos:', photosError);
      throw new Error('Failed to fetch photos from database');
    }
    
    console.log(`Fetched ${photos.length} photos from database`);
    
    const imageContents = photos.map((photo: any) => {
      const metadata = photo.metadata || {};
      const base64 = metadata.base64;
      const mimeType = metadata.mimeType || 'image/jpeg';
      
      if (!base64) {
        throw new Error(`Photo ${photo.id} does not have base64 data`);
      }
      
      console.log(`Using photo ${photo.id} with mime type: ${mimeType}`);
      
      return {
        type: "image_url",
        image_url: { 
          url: `data:${mimeType};base64,${base64}`
        }
      };
    });
    
    console.log(`Successfully processed ${imageContents.length} images`);

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
