import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Image as ImageIcon } from "lucide-react";

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      toast({
        title: "권한 없음",
        description: "관리자만 접근할 수 있습니다.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchCurrentLogo();
    setLoading(false);
  };

  const fetchCurrentLogo = () => {
    const { data } = supabase.storage
      .from("brand-assets")
      .getPublicUrl("3rdme-logo.png");
    
    setLogoUrl(data.publicUrl);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일만 허용
    if (!file.type.startsWith("image/")) {
      toast({
        title: "업로드 실패",
        description: "이미지 파일만 업로드할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    const { error: uploadError } = await supabase.storage
      .from("brand-assets")
      .upload("3rdme-logo.png", file, { upsert: true });

    setUploading(false);

    if (uploadError) {
      toast({
        title: "업로드 실패",
        description: uploadError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "업로드 완료!",
        description: "브랜드 로고가 업데이트되었습니다.",
      });
      fetchCurrentLogo();
      // 페이지 새로고침하여 로고 반영
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-soft p-4">
      <div className="max-w-4xl mx-auto pt-8 space-y-6">
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>관리자 페이지</CardTitle>
            <CardDescription>
              브랜드 자산 및 시스템 설정을 관리합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">브랜드 로고</h3>
              
              {logoUrl && (
                <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                  <img 
                    src={`${logoUrl}?t=${Date.now()}`} 
                    alt="현재 로고" 
                    className="max-w-[200px] max-h-[200px] object-contain"
                  />
                </div>
              )}

              <div className="flex flex-col gap-4">
                <label
                  htmlFor="logo-upload"
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors">
                    {uploading ? (
                      <p className="text-sm text-muted-foreground">업로드 중...</p>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          클릭하여 새 로고 업로드
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                </label>
                
                <p className="text-xs text-muted-foreground">
                  * PNG 형식 권장, 파일명은 자동으로 3rdme-logo.png로 저장됩니다
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
