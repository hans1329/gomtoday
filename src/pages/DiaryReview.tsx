import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function DiaryReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [diary, setDiary] = useState<any>(null);
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [selectedNotebooks, setSelectedNotebooks] = useState<Set<string>>(new Set());
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDiary();
    fetchNotebooks();
  }, [id]);

  const fetchDiary = async () => {
    const { data, error } = await supabase
      .from("diaries")
      .select(`
        *,
        photos!photos_diary_id_fkey (
          id,
          photo_url,
          display_order
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching diary:", error);
      toast({
        title: "일기를 불러올 수 없습니다",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    if (data) {
      setDiary(data);
      setContent(data.content || "");
      setTitle(data.title || "");
    }
    setLoading(false);
  };

  const fetchNotebooks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notebooks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (data) {
      setNotebooks(data);
      // 기본 비공개 일기장 자동 선택
      const defaultNotebook = data.find(nb => nb.is_default && nb.visibility === "private");
      if (defaultNotebook) {
        setSelectedNotebooks(new Set([defaultNotebook.id]));
      }
    }
  };

  const toggleNotebook = (notebookId: string) => {
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

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: "내용을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    if (selectedNotebooks.size === 0) {
      toast({
        title: "일기장을 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // 일기 내용 업데이트
      const { error: updateError } = await supabase
        .from("diaries")
        .update({
          content: content.trim(),
          title: title.trim() || "무제",
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // 기존 일기장 연결 삭제
      await supabase
        .from("diary_notebooks")
        .delete()
        .eq("diary_id", id);

      // 새로운 일기장 연결 추가
      for (const notebookId of selectedNotebooks) {
        const { error } = await supabase
          .from("diary_notebooks")
          .insert({
            diary_id: id,
            notebook_id: notebookId,
          });
        if (error) console.error("Error linking diary to notebook:", error);
      }

      toast({
        title: "일기가 저장되었습니다!",
        description: "선택한 일기장에 저장되었습니다.",
      });

      navigate(`/diary/${id}`);
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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

  if (!diary) {
    return null;
  }

  const sortedPhotos = diary.photos?.sort((a: any, b: any) => a.display_order - b.display_order) || [];

  return (
    <div className="min-h-screen gradient-soft">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">일기 리뷰 및 등록</h1>
          <p className="text-muted-foreground text-sm">
            작성된 일기를 확인하고 수정한 후 일기장에 등록하세요
          </p>
        </div>

        <Card className="shadow-medium overflow-hidden">
          <CardContent className="p-0">
            {/* Photos Carousel */}
            {sortedPhotos.length > 0 && (
              <div className="aspect-[4/3] bg-muted relative">
                <Carousel className="w-full h-full">
                  <CarouselContent>
                    {sortedPhotos.map((photo: any, index: number) => (
                      <CarouselItem key={photo.id}>
                        <div className="relative w-full h-full aspect-[4/3]">
                          <img
                            src={photo.photo_url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {sortedPhotos.length > 1 && (
                    <>
                      <CarouselPrevious className="left-2" />
                      <CarouselNext className="right-2" />
                    </>
                  )}
                </Carousel>
              </div>
            )}

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label>제목</Label>
                <Textarea
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="제목을 입력하세요"
                  className="min-h-[40px] resize-none"
                  maxLength={50}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label>내용</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="일기 내용을 수정하세요"
                  className="min-h-[200px] resize-none"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {content.length}/2000
                </p>
              </div>

              {/* Emoji */}
              {diary.emoji && (
                <div className="flex items-center gap-2">
                  <Label>감정</Label>
                  <span className="text-3xl">{diary.emoji}</span>
                </div>
              )}

              {/* Notebook Selection */}
              <div className="space-y-3 pt-4 border-t">
                <Label>일기장 선택</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {notebooks.map(notebook => {
                    const isPrivate = notebook.visibility === "private" && notebook.is_default;
                    const isSelected = selectedNotebooks.has(notebook.id);
                    return (
                      <div
                        key={notebook.id}
                        className={`flex items-center space-x-2 p-2 rounded ${isPrivate ? "bg-muted/50" : "hover:bg-muted/50 cursor-pointer"}`}
                        onClick={() => !isPrivate && toggleNotebook(notebook.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={isPrivate}
                          onCheckedChange={() => toggleNotebook(notebook.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{notebook.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {notebook.visibility === "private" ? "비공개" : "공개"}
                            {isPrivate && " (기본)"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  공개 일기장을 선택하면 다른 사람들이 일기를 볼 수 있습니다
                </p>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
                size="lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    일기 등록하기
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
