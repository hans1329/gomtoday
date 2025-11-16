import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, Loader2, ArrowLeft, Trash2, ChevronUp, ChevronDown } from "lucide-react";
export default function Upload() {
  const { id } = useParams();
  const isEditMode = !!id;
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [emotion, setEmotion] = useState("happy");
  const [length, setLength] = useState("medium");
  const [perspective, setPerspective] = useState("camera");
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [selectedNotebooks, setSelectedNotebooks] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [showNotebookDialog, setShowNotebookDialog] = useState(false);
  const [createdDiaryId, setCreatedDiaryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    if (isEditMode) {
      loadDiaryData();
    } else {
      checkTodayDiary();
    }
    fetchNotebooks();
  }, [id]);
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

  const loadDiaryData = async () => {
    if (!id) return;
    
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: diary, error } = await supabase
      .from("diaries")
      .select(`
        *,
        photos!photos_diary_id_fkey (
          id,
          photo_url,
          display_order
        ),
        diary_notebooks (
          notebook_id
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !diary) {
      toast({
        title: "일기를 찾을 수 없습니다",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // 기존 데이터로 초기화
    setEmotion(diary.tone || "happy");
    setLength(diary.length || "medium");
    setExistingPhotos(diary.photos || []);
    setPreviewUrls((diary.photos || []).map((p: any) => p.photo_url));
    
    // 일기장 선택 상태 초기화
    const notebookIds = new Set(diary.diary_notebooks.map((dn: any) => dn.notebook_id));
    setSelectedNotebooks(notebookIds);
    
    setLoading(false);
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

  const movePhoto = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...selectedFiles];
    const newUrls = [...previewUrls];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newFiles.length) return;
    
    [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
    [newUrls[index], newUrls[targetIndex]] = [newUrls[targetIndex], newUrls[index]];
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  const removePhoto = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    const newExisting = existingPhotos.filter((_, i) => i !== index);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
    setExistingPhotos(newExisting);
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
    const totalPhotos = (existingPhotos.length || 0) + selectedFiles.length;
    
    if (totalPhotos < 3) {
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
      let diaryId = id;
      
      if (isEditMode) {
        // 편집 모드: 일기 업데이트
        const { error: updateError } = await supabase
          .from("diaries")
          .update({
            tone: emotion,
            length
          })
          .eq("id", id);
        
        if (updateError) throw updateError;
        
        // 새로운 사진만 업로드
        if (selectedFiles.length > 0) {
          for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;
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
              diary_id: id,
              display_order: existingPhotos.length + i
            });
            if (photoError) throw photoError;
          }
        }
        
        toast({
          title: "일기가 수정되었어요!",
        });
        navigate(`/diary/${id}`);
      } else {
        // 새로 작성 모드
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
        
        diaryId = diaryData.id;
        
        const photoUrls: string[] = [];
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;
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
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: isEditMode ? "수정 실패" : "업로드 실패",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen gradient-soft flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">일기를 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  return <div className="min-h-screen gradient-soft p-4">
      <div className="max-w-2xl mx-auto pt-6 space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{isEditMode ? "일기 수정" : "일기 작성"}</h1>
          <p className="text-muted-foreground text-sm">
            {isEditMode 
              ? "사진과 감정, 길이를 수정할 수 있어요"
              : "오늘을 대표하는 3장의 사진을 업로드하면 누군가가 자동으로 일기를 작성해드려요"
            }
          </p>
        </div>
        
        <Card className="shadow-medium">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>사진 선택 (3~6장)</Label>
              {previewUrls.length > 0 ? <div className="space-y-3">
                  <div className="space-y-2">
                    {previewUrls.map((url, index) => <div key={index} className="relative flex items-center gap-3 p-3 rounded-lg border-2 border-border bg-card">
                        <div className="relative flex-shrink-0 w-28 h-20 rounded overflow-hidden bg-muted">
                          <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-contain" />
                          <div className="absolute top-1 left-1 bg-primary/90 text-primary-foreground rounded px-1.5 py-0.5 text-xs font-medium">
                            {index + 1}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute bottom-0.5 left-0.5 h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removePhoto(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" style={{ filter: 'drop-shadow(0 1px 0 white) drop-shadow(1px 0 0 white) drop-shadow(0 -1px 0 white) drop-shadow(-1px 0 0 white)' }} />
                          </Button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground">사진 {index + 1}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          {index > 0 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => movePhoto(index, 'up')}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                          )}
                          {index < previewUrls.length - 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => movePhoto(index, 'down')}
                            >
                              <ChevronDown className="h-4 w-4" />
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

            {!isEditMode && (
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
            )}

            <Button onClick={handleUpload} disabled={uploading || (existingPhotos.length + selectedFiles.length) < 3} className="w-full">
              {uploading ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "일기 수정 중..." : "일기 작성 중..."}
                </> : (isEditMode ? "일기 수정하기" : "일기 작성하기")}
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