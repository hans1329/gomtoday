import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";

const KakaoCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKakaoCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const error = params.get("error");

        if (error) {
          throw new Error("Kakao 로그인이 취소되었습니다.");
        }

        if (!code) {
          throw new Error("인증 코드를 받지 못했습니다.");
        }

        console.log("Authorization code received, exchanging for token...");

        // Call edge function to exchange code for token and create/login user
        const { data, error: functionError } = await supabase.functions.invoke(
          "kakao-auth",
          {
            body: {
              code,
              redirectUri: `${window.location.origin}/kakao-callback`,
            },
          }
        );

        if (functionError) {
          console.error("Function error:", functionError);
          throw functionError;
        }

        if (!data?.session_url) {
          throw new Error("세션 생성에 실패했습니다.");
        }

        console.log("Session URL received, signing in...");

        // Use the magic link to sign in
        const url = new URL(data.session_url);
        const token = url.searchParams.get("token");
        const type = url.searchParams.get("type");

        if (!token || !type) {
          throw new Error("잘못된 세션 토큰입니다.");
        }

        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as any,
        });

        if (verifyError) {
          console.error("Verify error:", verifyError);
          throw verifyError;
        }

        toast.success("카카오 로그인 성공!");
        
        // Redirect based on whether it's first login
        if (data.is_first_login) {
          navigate("/profile");
        } else {
          navigate("/");
        }
      } catch (err: any) {
        console.error("Kakao callback error:", err);
        setError(err.message || "로그인 중 오류가 발생했습니다.");
        toast.error(err.message || "로그인 실패");
        
        // Redirect to auth page after 3 seconds
        setTimeout(() => {
          navigate("/auth");
        }, 3000);
      }
    };

    handleKakaoCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center">
          <div className="text-destructive mb-4">❌</div>
          <h2 className="text-xl font-semibold mb-2">로그인 실패</h2>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">잠시 후 로그인 페이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-muted-foreground">카카오 로그인 처리 중...</p>
      </div>
    </div>
  );
};

export default KakaoCallback;
