import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, Loader2 } from "lucide-react";

export default function Upload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [tone, setTone] = useState("warm");
  const [length, setLength] = useState("medium");
  const [perspective, setPerspective] = useState("camera");
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      // Upload photo to storage
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("photos")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("photos")
        .getPublicUrl(fileName);

      // Save photo record
      const { data: photoData, error: photoError } = await supabase
        .from("photos")
        .insert({
          user_id: user.id,
          photo_url: publicUrl,
        })
        .select()
        .single();

      if (photoError) throw photoError;

      // Call AI to generate diary
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke(
        "analyze-photo",
        {
          body: {
            photoUrl: publicUrl,
            tone,
            length,
            perspective,
          },
        }
      );

      if (aiError) throw aiError;

      // Save diary
      const { data: diaryData, error: diaryError } = await supabase
        .from("diaries")
        .insert({
          user_id: user.id,
          photo_id: photoData.id,
          content: aiResponse.content,
          emoji: aiResponse.emoji,
          tone,
          length,
        })
        .select()
        .single();

      if (diaryError) throw diaryError;

      toast({
        title: "일기가 작성되었어요!",
        description: "AI가 사진을 보고 일기를 작성했습니다.",
      });

      navigate(`/diary/${diaryData.id}`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-soft p-4">
      <div className="max-w-2xl mx-auto pt-8 space-y-6">
        <Button variant="ghost" onClick={() => navigate("/")}>
          ← 뒤로
        </Button>

        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>사진 일기 작성</CardTitle>
            <CardDescription>
              사진을 업로드하면 AI가 자동으로 일기를 작성해드려요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>사진 선택</Label>
              {previewUrl ? (
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-dashed border-border">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl("");
                    }}
                  >
                    다시 선택
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-[4/3] rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer transition-colors">
                  <UploadIcon className="w-12 h-12 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    클릭하여 사진 선택
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </div>

            {/* Tone Selection */}
            <div className="space-y-2">
              <Label>일기 톤</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warm">따뜻함</SelectItem>
                  <SelectItem value="calm">차분함</SelectItem>
                  <SelectItem value="essay">에세이</SelectItem>
                  <SelectItem value="playful">경쾌함</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Length Selection */}
            <div className="space-y-2">
              <Label>일기 길이</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">짧게 (5-7문장)</SelectItem>
                  <SelectItem value="medium">중간 (8-10문장)</SelectItem>
                  <SelectItem value="long">길게 (11-15문장)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Perspective Selection */}
            <div className="space-y-2">
              <Label>시점</Label>
              <Select value={perspective} onValueChange={setPerspective}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="camera">카메라 시점</SelectItem>
                  <SelectItem value="pet">애완동물 시점</SelectItem>
                  <SelectItem value="friend">친구 시점</SelectItem>
                  <SelectItem value="family">가족 시점</SelectItem>
                  <SelectItem value="stranger">낯선 사람 시점</SelectItem>
                  <SelectItem value="future">미래의 나 시점</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI가 일기를 작성하는 중...
                </>
              ) : (
                "일기 작성하기"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}