import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, Loader2, ArrowLeft } from "lucide-react";

export default function Upload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [tone, setTone] = useState("warm");
  const [length, setLength] = useState("medium");
  const [perspective, setPerspective] = useState("camera");
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [selectedNotebooks, setSelectedNotebooks] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkTodayDiary();
    fetchNotebooks();
  }, []);

  const checkTodayDiary = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from("diaries")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString())
      .maybeSingle();

    if (data) {
      toast({
        title: "오늘의 일기가 이미 있어요",
        description: "일기를 수정하거나 사진을 추가할 수 있습니다.",
      });
      navigate(`/diary/${data.id}`);
    }
  };

  const fetchNotebooks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("notebooks")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at");

    if (error) {
      console.error("Error fetching notebooks:", error);
    } else if (data) {
      setNotebooks(data);
      const privateNotebook = data.find(nb => nb.visibility === "private" && nb.is_default);
      if (privateNotebook) {
        setSelectedNotebooks(new Set([privateNotebook.id]));
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length < 3) {
      toast({
        title: "사진이 부족해요",
        description: "최소 3장의 사진을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    if (files.length > 6) {
      toast({
        title: "사진이 너무 많아요",
        description: "최대 6장까지만 선택할 수 있어요.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFiles(files);
    setPreviewUrls(files.map(file => URL.createObjectURL(file)));
  };

  const toggleNotebook = (notebookId: string, isPrivate: boolean) => {
    if (isPrivate) return;
    
    setSelectedNotebooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notebookId)) {
        newSet.delete(notebookId);
      } else {
        newSet.add(notebookId);
      }
      return newSet;
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length < 3) {
      toast({
        title: "사진이 부족해요",
        description: "최소 3장의 사진을 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      const { data: diaryData, error: diaryError } = await supabase
        .from("diaries")
        .insert({
          user_id: user.id,
          content: "",
          tone,
          length,
        })
        .select()
        .single();

      if (diaryError) throw diaryError;

      const photoUrls: string[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("photos")
          .getPublicUrl(fileName);

        const { error: photoError } = await supabase
          .from("photos")
          .insert({
            user_id: user.id,
            photo_url: publicUrl,
            diary_id: diaryData.id,
            display_order: i,
          });

        if (photoError) throw photoError;
        photoUrls.push(publicUrl);
      }

      const { data: aiResponse, error: aiError } = await supabase.functions.invoke(
        "analyze-photo",
        {
          body: {
            photoUrls: photoUrls,
            tone,
            length,
            perspective,
          },
        }
      );

      if (aiError) throw aiError;

      const { error: updateError } = await supabase
        .from("diaries")
        .update({
          content: aiResponse.content,
          emoji: aiResponse.emoji,
        })
        .eq("id", diaryData.id);

      if (updateError) throw updateError;

      for (const notebookId of selectedNotebooks) {
        const { error } = await supabase
          .from("diary_notebooks")
          .insert({
            diary_id: diaryData.id,
            notebook_id: notebookId,
          });
        
        if (error) console.error("Error linking diary to notebook:", error);
      }

      toast({
        title: "일기가 작성되었어요!",
        description: `${selectedFiles.length}장의 사진으로 AI가 일기를 작성했습니다.`,
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          뒤로가기
        </Button>
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>일기 작성</CardTitle>
            <CardDescription>
              오늘을 대표하는 3장의 사진을 업로드하면 누군가가 자동으로 일기를 작성해드려요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>사진 선택 (3~6장)</Label>
              {previewUrls.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-border">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedFiles([]);
                      setPreviewUrls([]);
                    }}
                  >
                    다시 선택
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-[4/3] rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer transition-colors">
                  <UploadIcon className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">클릭하여 3~6장의 사진 선택</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, HEIC</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <Label>일기장 선택</Label>
              <div className="space-y-2 p-3 rounded-lg border">
                {notebooks.map((notebook) => {
                  const isPrivate = notebook.visibility === "private" && notebook.is_default;
                  const isSelected = selectedNotebooks.has(notebook.id);
                  
                  return (
                    <div key={notebook.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={notebook.id}
                        checked={isSelected}
                        disabled={isPrivate}
                        onCheckedChange={() => toggleNotebook(notebook.id, isPrivate)}
                      />
                      <Label
                        htmlFor={notebook.id}
                        className="flex-1 cursor-pointer"
                      >
                        {notebook.name}
                        {isPrivate && " (기본)"}
                        {notebook.visibility === "public" && " 🌍"}
                        {notebook.visibility === "shared" && " 👥"}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>톤 선택</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warm">따뜻하게</SelectItem>
                  <SelectItem value="funny">재미있게</SelectItem>
                  <SelectItem value="serious">진지하게</SelectItem>
                  <SelectItem value="poetic">시적으로</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>길이 선택</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">짧게</SelectItem>
                  <SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="long">길게</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>시점 선택</Label>
              <Select value={perspective} onValueChange={setPerspective}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="camera">카메라 시점</SelectItem>
                  <SelectItem value="photographer">사진 찍는 사람 시점</SelectItem>
                  <SelectItem value="subject">사진 속 인물 시점</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length < 3 || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  일기 작성 중...
                </>
              ) : (
                `일기 작성하기 (${selectedFiles.length}/3~6)`
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
