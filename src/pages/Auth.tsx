import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
export default function Auth() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  useEffect(() => {
    const fetchLogo = async () => {
      // 캐시된 로고 확인
      const cachedLogo = localStorage.getItem("desktop_logo_url");
      if (cachedLogo) {
        setLogoUrl(cachedLogo);
      }

      // 브랜드 에셋에서 로고 가져오기
      const {
        data
      } = supabase.storage.from("brand-assets").getPublicUrl("3rdme-logo.png");
      if (data) {
        setLogoUrl(data.publicUrl);
        localStorage.setItem("desktop_logo_url", data.publicUrl);
      }
    };
    fetchLogo();
  }, []);
  const handleEmailAuth = async (isSignUp: boolean) => {
    setLoading(true);
    try {
      if (isSignUp) {
        const {
          error
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        if (error) throw error;
        toast({
          title: "회원가입 완료",
          description: "이메일을 확인해주세요."
        });
      } else {
        const {
          error
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: isSignUp ? "회원가입 실패" : "로그인 실패",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSocialLogin = async (provider: 'google' | 'kakao') => {
    const {
      error
    } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    if (error) {
      toast({
        title: "로그인 실패",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  return <div className="min-h-screen flex items-center justify-center gradient-soft px-4 sm:px-6 py-8">
      <div className="w-full max-w-md">
        <div className="space-y-6 mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src={logoUrl} alt="Logo" className="h-36 w-auto object-contain" />
          </div>
          <p className="text-base text-center text-muted-foreground font-bold">
            누군가가 써주는 나의 일기
          </p>
        </div>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="email">이메일</TabsTrigger>
            <TabsTrigger value="social">소셜 로그인</TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signin">로그인</TabsTrigger>
                <TabsTrigger value="signup">회원가입</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">이메일</Label>
                  <Input id="signin-email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">비밀번호</Label>
                  <Input id="signin-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
                </div>
                <Button onClick={() => handleEmailAuth(false)} disabled={loading} className="w-full h-14">
                  로그인
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">이메일</Label>
                  <Input id="signup-email" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">비밀번호</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
                </div>
                <Button onClick={() => handleEmailAuth(true)} className="w-full h-12" disabled={loading}>
                  회원가입
                </Button>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <p className="text-center text-muted-foreground text-sm mb-4">
              소셜 계정으로 간편하게 시작하세요
            </p>
            
            <div className="space-y-3">
              <Button onClick={() => handleSocialLogin('google')} variant="outline" className="w-full h-12" size="lg">
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google로 시작하기
              </Button>

              <Button onClick={() => handleSocialLogin('kakao')} variant="outline" className="w-full h-12 bg-[#FEE500] hover:bg-[#FEE500]/90 text-[#000000] border-[#FEE500]" size="lg">
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3Z" />
                </svg>
                카카오로 시작하기
              </Button>

              <Button variant="outline" className="w-full h-12 bg-[#03C75A] hover:bg-[#03C75A]/90 text-white border-[#03C75A]" size="lg" disabled>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M16.273 12.845 7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845Z" />
                </svg>
                네이버로 시작하기 (준비중)
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-8 pt-6">
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">
              이용약관
            </Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              개인정보 처리방침
            </Link>
            <span>•</span>
            <a href="mailto:support@3rdme.com" className="hover:text-foreground transition-colors">
              문의하기
            </a>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">
            © 2024 3rdME. All rights reserved.
          </p>
        </div>
      </div>
    </div>;
}