import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, Loader2, ArrowLeft, X, ChevronLeft, ChevronRight } from "lucide-react";
export default function Upload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [emotion, setEmotion] = useState("happy");
  const [length, setLength] = useState("medium");
  const [perspective, setPerspective] = useState("camera");
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [selectedNotebooks, setSelectedNotebooks] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [showNotebookDialog, setShowNotebookDialog] = useState(false);
  const [createdDiaryId, setCreatedDiaryId] = useState<string | null>(null);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    checkTodayDiary();
    fetchNotebooks();
  }, []);
  const checkTodayDiary = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const {
      data,
      error
    } = await supabase.from("diaries").select("id").eq("user_id", user.id).gte("created_at", today.toISOString()).lt("created_at", tomorrow.toISOString()).maybeSingle();
    if (data) {
      toast({
        title: "오늘의 일기가 이미 있어요",
        description: "일기를 수정하거나 사진을 추가할 수 있습니다."
      });
      navigate(`/diary/${data.id}`);
    }
  };
  const fetchNotebooks = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    const {
      data,
      error
    } = await supabase.from("notebooks").select("*").eq("user_id", user.id).order("is_default", {
      ascending: false
    }).order("created_at");
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
    const newFiles = [...selectedFiles, ...files];
    
    if (newFiles.length > 6) {
      toast({
        title: "사진이 너무 많아요",
        description: "최대 6장까지만 선택할 수 있어요.",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newFiles.map(file => URL.createObjectURL(file)));
  };

  const movePhoto = (index: number, direction: 'left' | 'right') => {
    const newFiles = [...selectedFiles];
    const newUrls = [...previewUrls];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newFiles.length) return;
    
    [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
    [newUrls[index], newUrls[targetIndex]] = [newUrls[targetIndex], newUrls[index]];
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  const removePhoto = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
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
  const handleSaveToNotebooks = async () => {
    if (!createdDiaryId) return;
    try {
      for (const notebookId of selectedNotebooks) {
        const {
          error
        } = await supabase.from("diary_notebooks").insert({
          diary_id: createdDiaryId,
          notebook_id: notebookId
        });
        if (error) console.error("Error linking diary to notebook:", error);
      }
      toast({
        title: "일기가 저장되었어요!",
        description: "선택한 일기장에 저장되었습니다."
      });
      navigate(`/diary/${createdDiaryId}`);
    } catch (error: any) {
      console.error("Save to notebooks error:", error);
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleUpload = async () => {
    if (selectedFiles.length < 3) {
      toast({
        title: "사진이 부족해요",
        description: "최소 3장의 사진을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }
    setUploading(true);
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      const {
        data: diaryData,
        error: diaryError
      } = await supabase.from("diaries").insert({
        user_id: user.id,
        content: "",
        tone: emotion,
        length
      }).select().single();
      if (diaryError) throw diaryError;
      const photoUrls: string[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileName = `${user.id}/${Date.now()}-${i}-${file.name}`;
        const {
          error: uploadError
        } = await supabase.storage.from("photos").upload(fileName, file);
        if (uploadError) throw uploadError;
        const {
          data: {
            publicUrl
          }
        } = supabase.storage.from("photos").getPublicUrl(fileName);
        const {
          error: photoError
        } = await supabase.from("photos").insert({
          user_id: user.id,
          photo_url: publicUrl,
          diary_id: diaryData.id,
          display_order: i
        });
        if (photoError) throw photoError;
        photoUrls.push(publicUrl);
      }
      const {
        data: aiResponse,
        error: aiError
      } = await supabase.functions.invoke("analyze-photo", {
        body: {
          photoUrls: photoUrls,
          emotion,
          length,
          perspective
        }
      });
      if (aiError) throw aiError;
      const {
        error: updateError
      } = await supabase.from("diaries").update({
        content: aiResponse.content,
        emoji: aiResponse.emoji
      }).eq("id", diaryData.id);
      if (updateError) throw updateError;
      setCreatedDiaryId(diaryData.id);
      setShowNotebookDialog(true);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  return <div className="min-h-screen gradient-soft p-4">
      <div className="max-w-2xl mx-auto pt-6 space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">일기 작성</h1>
          <p className="text-muted-foreground text-sm">
            오늘을 대표하는 3장의 사진을 업로드하면 누군가가 자동으로 일기를 작성해드려요
          </p>
        </div>
        
        <Card className="shadow-medium">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>사진 선택 (3~6장)</Label>
              {previewUrls.length > 0 ? <div className="space-y-3">
                  <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
                    {previewUrls.map((url, index) => <div key={index} className="relative flex-shrink-0 w-40 aspect-[3/4] rounded-lg overflow-hidden border-2 border-border snap-center">
                        <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shadow-lg">
                          {index + 1}
                        </div>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute top-2 right-2 h-7 w-7 opacity-90 hover:opacity-100"
                          onClick={() => removePhoto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {index > 0 && (
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7 opacity-90 hover:opacity-100"
                              onClick={() => movePhoto(index, 'left')}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                          )}
                          {index < previewUrls.length - 1 && (
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7 opacity-90 hover:opacity-100"
                              onClick={() => movePhoto(index, 'right')}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>)}
                  </div>
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full" asChild>
                        <span>사진 추가</span>
                      </Button>
                      <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                    </label>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                      setSelectedFiles([]);
                      setPreviewUrls([]);
                    }}>
                      전체 삭제
                    </Button>
                  </div>
                </div> : <label className="flex flex-col items-center justify-center aspect-[4/3] rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer transition-colors">
                  <UploadIcon className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">클릭하여 3~6장의 사진 선택</p>
                  <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                </label>}
            </div>

            <div className="space-y-2">
              <Label>감정 선택</Label>
              <Select value={emotion} onValueChange={setEmotion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="happy">기쁨 😊</SelectItem>
                  <SelectItem value="sad">슬픔 😢</SelectItem>
                  <SelectItem value="angry">화남 😠</SelectItem>
                  <SelectItem value="calm">평온 😌</SelectItem>
                  <SelectItem value="excited">신남 🤩</SelectItem>
                  <SelectItem value="anxious">불안 😰</SelectItem>
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
                  <SelectItem value="short">짧게 (5-7문장)</SelectItem>
                  <SelectItem value="medium">중간 (8-10문장)</SelectItem>
                  <SelectItem value="long">길게 (11-15문장)</SelectItem>
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
                  <SelectItem value="camera">핸드폰</SelectItem>
                  <SelectItem value="pet">애완동물</SelectItem>
                  <SelectItem value="friend">친구</SelectItem>
                  <SelectItem value="family">가족</SelectItem>
                  <SelectItem value="stranger">낯선 사람</SelectItem>
                  <SelectItem value="future">미래의 나</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleUpload} disabled={uploading || selectedFiles.length < 3} className="w-full">
              {uploading ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  일기 작성 중...
                </> : "일기 작성하기"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showNotebookDialog} onOpenChange={setShowNotebookDialog}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>일기장 선택</DialogTitle>
            <DialogDescription>
              이 일기를 저장할 일기장을 선택해주세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notebooks.map(notebook => {
            const isPrivate = notebook.visibility === "private" && notebook.is_default;
            const isSelected = selectedNotebooks.has(notebook.id);
            return <div key={notebook.id} className={`flex items-center space-x-2 p-3 rounded-lg border ${isPrivate ? "bg-muted" : "hover:bg-secondary cursor-pointer"}`} onClick={() => !isPrivate && toggleNotebook(notebook.id, isPrivate)}>
                  <Checkbox checked={isSelected} disabled={isPrivate} onCheckedChange={() => toggleNotebook(notebook.id, isPrivate)} />
                  <div className="flex-1">
                    <div className="font-medium">{notebook.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {notebook.visibility === "private" ? "비공개" : "공개"}
                      {isPrivate && " (기본)"}
                    </div>
                  </div>
                </div>;
          })}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => {
            setShowNotebookDialog(false);
            if (createdDiaryId) {
              navigate(`/diary/${createdDiaryId}`);
            }
          }} className="w-full sm:w-auto order-2 sm:order-1">
              건너뛰기
            </Button>
            <Button onClick={handleSaveToNotebooks} className="w-full sm:w-auto order-1 sm:order-2">
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}