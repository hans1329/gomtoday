import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Image, RefreshCw } from "lucide-react";
import { optimizeImage } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminImageOptimize() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [processedImages, setProcessedImages] = useState(0);
  const [savedBytes, setSavedBytes] = useState(0);
  const [stats, setStats] = useState<{
    totalFiles: number;
    totalSize: number;
  } | null>(null);

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        navigate("/");
        return;
      }

      await fetchStats();
      setLoading(false);
    } catch (error) {
      console.error("Error checking admin role:", error);
      navigate("/");
    }
  };

  const fetchStats = async () => {
    try {
      // photos 테이블에서 모든 이미지 개수 가져오기
      const { count, error } = await supabase
        .from("photos")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      // Storage API로는 정확한 용량을 알 수 없으므로 대략적인 추정값 표시
      const totalFiles = count || 0;
      const estimatedSize = totalFiles * 500000; // 평균 500KB로 추정

      setStats({ totalFiles, totalSize: estimatedSize });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        title: "통계 조회 실패",
        description: "통계를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const optimizeAllImages = async () => {
    try {
      setOptimizing(true);
      setProgress(0);
      setProcessedImages(0);
      setSavedBytes(0);

      // 모든 photos 가져오기
      const { data: photos, error: photosError } = await supabase
        .from("photos")
        .select("*");

      if (photosError) throw photosError;

      if (!photos || photos.length === 0) {
        toast({
          title: "최적화할 이미지 없음",
          description: "최적화할 이미지가 없습니다.",
        });
        setOptimizing(false);
        return;
      }

      setTotalImages(photos.length);

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        
        try {
          // 이미지 URL에서 다운로드
          const response = await fetch(photo.photo_url);
          const blob = await response.blob();
          const originalSize = blob.size;
          
          // File 객체로 변환
          const file = new File([blob], "image.jpg", { type: blob.type });
          
          // 이미지 최적화
          const optimizedFile = await optimizeImage(file);
          const optimizedSize = optimizedFile.size;
          
          // 원본보다 크거나 같으면 스킵
          if (optimizedSize >= originalSize) {
            setProcessedImages(i + 1);
            setProgress(((i + 1) / photos.length) * 100);
            continue;
          }
          
          // 스토리지에 업로드 (같은 경로에 덮어쓰기)
          const path = photo.photo_url.split('/photos/')[1];
          
          await supabase.storage
            .from("photos")
            .remove([path]);
          
          const { error: uploadError } = await supabase.storage
            .from("photos")
            .upload(path, optimizedFile, {
              upsert: true,
              contentType: 'image/webp'
            });

          if (uploadError) throw uploadError;

          // 절약된 용량 계산
          setSavedBytes(prev => prev + (originalSize - optimizedSize));
          
        } catch (error) {
          console.error(`Error optimizing image ${photo.id}:`, error);
        }
        
        setProcessedImages(i + 1);
        setProgress(((i + 1) / photos.length) * 100);
      }

      toast({
        title: "최적화 완료",
        description: `${processedImages}개의 이미지를 최적화했습니다.`,
      });

      await fetchStats();
      
    } catch (error) {
      console.error("Error optimizing images:", error);
      toast({
        title: "최적화 실패",
        description: "이미지 최적화 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setOptimizing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">이미지 최적화</h1>
            <p className="text-muted-foreground mt-1">
              기존 이미지를 일괄 최적화합니다
            </p>
          </div>
        </div>

        {/* 통계 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              현재 스토리지 상태
            </CardTitle>
            <CardDescription>
              photos 버킷의 이미지 파일 정보
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">총 파일 수</p>
                <p className="text-2xl font-bold">{stats?.totalFiles || 0}개</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">총 용량</p>
                <p className="text-2xl font-bold">{formatBytes(stats?.totalSize || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 최적화 실행 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              일괄 최적화 실행
            </CardTitle>
            <CardDescription>
              모든 이미지를 1920px 이하로 리사이즈하고 WebP로 변환합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>주의:</strong> 최적화 중에는 페이지를 새로고침하거나 닫지 마세요.
                원본 이미지는 최적화된 이미지로 교체됩니다.
              </AlertDescription>
            </Alert>

            {optimizing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>진행 상황</span>
                  <span>{processedImages} / {totalImages}</span>
                </div>
                <Progress value={progress} />
                {savedBytes > 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    절약된 용량: {formatBytes(savedBytes)}
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={optimizeAllImages}
              disabled={optimizing || !stats?.totalFiles}
              className="w-full rounded-full"
              size="lg"
            >
              {optimizing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  최적화 중...
                </>
              ) : (
                "최적화 시작"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
