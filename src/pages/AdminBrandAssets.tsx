import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function AdminBrandAssets() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [mobileLogoUrl, setMobileLogoUrl] = useState<string>("");
  const [faviconUrl, setFaviconUrl] = useState<string>("");

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
        title: "접근 권한 없음",
        description: "관리자만 접근할 수 있습니다.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    fetchCurrentLogo();
    setLoading(false);
  };

  const fetchCurrentLogo = async () => {
    const { data } = supabase.storage
      .from("brand-assets")
      .getPublicUrl("3rdme-logo.png");

    if (data) {
      setLogoUrl(data.publicUrl);
    }

    const { data: mobileData } = supabase.storage
      .from("brand-assets")
      .getPublicUrl("3rdme-logo-mobile.png");

    if (mobileData) {
      setMobileLogoUrl(mobileData.publicUrl);
    }

    const { data: faviconData } = supabase.storage
      .from("brand-assets")
      .getPublicUrl("favicon.png");

    if (faviconData) {
      setFaviconUrl(faviconData.publicUrl);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from("brand-assets")
        .upload("3rdme-logo.png", file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      toast({
        title: "로고 업로드 완료",
        description: "브랜드 로고가 성공적으로 업데이트되었습니다.",
      });

      fetchCurrentLogo();
    } catch (error: any) {
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleMobileLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingMobile(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from("brand-assets")
        .upload("3rdme-logo-mobile.png", file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      toast({
        title: "모바일 로고 업로드 완료",
        description: "모바일 브랜드 로고가 성공적으로 업데이트되었습니다.",
      });

      fetchCurrentLogo();
    } catch (error: any) {
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingMobile(false);
    }
  };

  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFavicon(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from("brand-assets")
        .upload("favicon.png", file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      toast({
        title: "파비콘 업로드 완료",
        description: "파비콘이 성공적으로 업데이트되었습니다. 브라우저를 새로고침하면 반영됩니다.",
      });

      fetchCurrentLogo();
    } catch (error: any) {
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingFavicon(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen gradient-soft">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">브랜드 애셋 관리</h1>
            <p className="text-muted-foreground mt-1">로고 및 브랜드 이미지를 관리합니다</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>데스크톱 로고</CardTitle>
              <CardDescription>
                데스크톱 및 태블릿에서 텍스트와 함께 표시되는 로고입니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                
                <p className="text-xs text-muted-foreground pl-1">
                  * PNG 형식 권장, 파일명은 자동으로 3rdme-logo.png로 저장됩니다
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>모바일 로고</CardTitle>
              <CardDescription>
                모바일에서 아이콘 형태로 표시되는 로고입니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {mobileLogoUrl && (
                <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                  <img 
                    src={`${mobileLogoUrl}?t=${Date.now()}`} 
                    alt="현재 모바일 로고" 
                    className="max-w-[100px] max-h-[100px] object-contain"
                  />
                </div>
              )}

              <div className="flex flex-col gap-4">
                <label
                  htmlFor="mobile-logo-upload"
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors">
                    {uploadingMobile ? (
                      <p className="text-sm text-muted-foreground">업로드 중...</p>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          클릭하여 새 모바일 로고 업로드
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    id="mobile-logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleMobileLogoUpload}
                    disabled={uploadingMobile}
                  />
                </label>
                
                <p className="text-xs text-muted-foreground pl-1">
                  * PNG 형식 권장, 정사각형 이미지 권장, 파일명은 자동으로 3rdme-logo-mobile.png로 저장됩니다
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>파비콘</CardTitle>
              <CardDescription>
                브라우저 탭에 표시되는 파비콘 아이콘입니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {faviconUrl && (
                <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                  <img 
                    src={`${faviconUrl}?t=${Date.now()}`} 
                    alt="현재 파비콘" 
                    className="max-w-[64px] max-h-[64px] object-contain"
                  />
                </div>
              )}

              <div className="flex flex-col gap-4">
                <label
                  htmlFor="favicon-upload"
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors">
                    {uploadingFavicon ? (
                      <p className="text-sm text-muted-foreground">업로드 중...</p>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          클릭하여 새 파비콘 업로드
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    id="favicon-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFaviconUpload}
                    disabled={uploadingFavicon}
                  />
                </label>
                
                <p className="text-xs text-muted-foreground pl-1">
                  * PNG/ICO 형식 권장, 32x32 또는 64x64 픽셀 권장, 파일명은 자동으로 favicon.png로 저장됩니다
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
