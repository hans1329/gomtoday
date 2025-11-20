import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KAKAO_REST_API_KEY = Deno.env.get('KAKAO_REST_API_KEY');
const KAKAO_CLIENT_SECRET = Deno.env.get('KAKAO_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, redirectUri } = await req.json();
    console.log('Kakao auth request received', { code: code?.substring(0, 10), redirectUri });

    if (!code) {
      throw new Error('Authorization code is required');
    }

    // 1. Exchange authorization code for access token
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_REST_API_KEY!,
        client_secret: KAKAO_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Kakao token exchange failed:', errorText);
      throw new Error(`Failed to exchange code for token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Kakao token received');

    // 2. Get user info from Kakao
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Kakao user info fetch failed:', errorText);
      throw new Error(`Failed to fetch user info: ${errorText}`);
    }

    const kakaoUser = await userResponse.json();
    console.log('Kakao user info received', { id: kakaoUser.id });

    // Extract profile information
    const email = kakaoUser.kakao_account?.email || `kakao_${kakaoUser.id}@kakao.user`;
    const name = kakaoUser.properties?.nickname || kakaoUser.kakao_account?.profile?.nickname || 'Kakao User';
    const profileImage = kakaoUser.properties?.profile_image || kakaoUser.kakao_account?.profile?.profile_image_url || null;

    console.log('Profile data extracted', { email, name, hasImage: !!profileImage });

    // 3. Create or get Supabase user
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check if user already exists with this Kakao ID
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .single();

    let userId: string;
    let isNewUser = false;

    if (existingProfile) {
      // User exists, update their profile
      userId = existingProfile.user_id;
      console.log('Existing user found, updating profile', { userId });
      
      await supabase
        .from('profiles')
        .update({
          name: name,
          profile_photo_url: profileImage,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } else {
      // Create new user
      isNewUser = true;
      const WELCOME_PENCILS = 10;
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          name: name,
          kakao_id: kakaoUser.id,
          provider: 'kakao',
          profile_image: profileImage,
        },
      });

      if (authError) {
        console.error('Failed to create user:', authError);
        throw authError;
      }

      userId = authData.user.id;
      console.log('New user created, updating profile', { userId });
      
      // Update profile with Kakao data and welcome pencils
      await supabase
        .from('profiles')
        .update({
          name: name,
          profile_photo_url: profileImage,
          email: email,
          pencil_count: WELCOME_PENCILS,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      
      // Create welcome notification
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'welcome',
          title: '가입 축하 선물',
          message: `GomToday에 오신 것을 환영합니다! 가입 축하 선물로 연필 ${WELCOME_PENCILS}자루를 드렸어요.`,
          link: '/profile',
          read: false,
        });
      
      console.log('Welcome notification created');
    }

    // 4. Generate Supabase session
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: `kakao_${kakaoUser.id}@kakao.user`,
    });

    if (sessionError) {
      console.error('Failed to generate session:', sessionError);
      throw sessionError;
    }

    console.log('Session generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          email: kakaoUser.kakao_account?.email,
          name: kakaoUser.properties?.nickname || kakaoUser.kakao_account?.profile?.nickname,
        },
        session_url: sessionData.properties.action_link,
        is_new_user: isNewUser,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in kakao-auth:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error occurred' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
