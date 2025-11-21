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
      // photos 테이블에서 이미지 개수 가져오기
      const { count, error } = await supabase
        .from("photos")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      // Storage API로 실제 용량 합계 계산
      let totalSize = 0;
      const queue: string[] = [""];

      while (queue.length > 0) {
        const path = queue.shift()!;
        const { data, error: listError } = await supabase.storage
          .from("photos")
          .list(path, { limit: 1000 });

        if (listError) throw listError;
        if (!data) continue;

        for (const item of data) {
          // 폴더: metadata 없음, 파일: metadata.size 존재
          if (!item.metadata) {
            queue.push(path ? `${path}/${item.name}` : item.name);
          } else {
            totalSize += (item.metadata as { size?: number }).size ?? 0;
          }
        }
      }

      setStats({
        totalFiles: count || 0,
        totalSize,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        title: "통계 조회 실패",
        description:
          error instanceof Error
            ? error.message
            : "통계를 불러오는 중 오류가 발생했습니다.",
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
          console.log(`Processing image ${i + 1}/${photos.length}: ${photo.photo_url}`);
          
          // 이미지 URL에서 다운로드
          const response = await fetch(photo.photo_url);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          const originalSize = blob.size;
          
          // File 객체로 변환
          const file = new File([blob], "image.jpg", { type: blob.type });
          
          // 이미지 최적화
          const optimizedFile = await optimizeImage(file);
          const optimizedSize = optimizedFile.size;
          
          console.log(`Original: ${formatBytes(originalSize)}, Optimized: ${formatBytes(optimizedSize)}`);
          
          // 원본보다 크거나 같으면 스킵
          if (optimizedSize >= originalSize) {
            console.log(`Skipping - optimized size is not smaller`);
            setProcessedImages(i + 1);
            setProgress(((i + 1) / photos.length) * 100);
            continue;
          }
          
          // 스토리지에 업로드 (같은 경로에 덮어쓰기)
          // URL 형식: https://...supabase.co/storage/v1/object/public/photos/USER_ID/FILE_NAME
          const urlParts = photo.photo_url.split('/storage/v1/object/public/photos/');
          if (urlParts.length < 2) {
            throw new Error(`Invalid photo URL format: ${photo.photo_url}`);
          }
          const path = urlParts[1];
          
          console.log(`Uploading to path: ${path}`);
          
          // Blob을 Base64로 변환
          const reader = new FileReader();
          const base64Blob = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(optimizedFile);
          });
          
          // Edge Function으로 업로드 (Service Role 사용)
          console.log(`Calling edge function with path: ${path}`);
          const { data: uploadData, error: uploadError } = await supabase.functions.invoke('optimize-images', {
            body: {
              action: 'upload',
              photoId: photo.id,
              optimizedBlob: base64Blob,
              path: path
            }
          });

          console.log('Edge function response:', { uploadData, uploadError });

          if (uploadError) {
            console.error(`Upload error:`, uploadError);
            throw uploadError;
          }

          // 절약된 용량 계산
          const savedAmount = originalSize - optimizedSize;
          setSavedBytes(prev => prev + savedAmount);
          console.log(`Saved: ${formatBytes(savedAmount)}`);
          
        } catch (error) {
          console.error(`Error optimizing image ${photo.id}:`, error);
          toast({
            title: "이미지 최적화 오류",
            description: `이미지 ID ${photo.id} 처리 중 오류 발생`,
            variant: "destructive",
          });
        }
        
        setProcessedImages(i + 1);
        setProgress(((i + 1) / photos.length) * 100);
      }

      toast({
        title: "최적화 완료",
        description: `${processedImages}개 중 ${Math.max(0, processedImages - photos.length + savedBytes > 0 ? 1 : 0)}개 이미지를 최적화했습니다. 총 ${formatBytes(savedBytes)} 절약`,
      });

      // 통계 새로고침
      await fetchStats();
      
    } catch (error) {
      console.error("Error optimizing images:", error);
      toast({
        title: "최적화 실패",
        description: error instanceof Error ? error.message : "이미지 최적화 중 오류가 발생했습니다.",
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  현재 스토리지 상태
                </CardTitle>
                <CardDescription>
                  photos 버킷의 이미지 파일 정보
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchStats}
                className="rounded-full"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
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
