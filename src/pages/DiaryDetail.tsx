import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Edit, Save, X, Plus, Trash2 } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function DiaryDetail() {
  const { id } = useParams();
  const [diary, setDiary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchDiary();
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
      .maybeSingle();

    if (error) {
      console.error("Error fetching diary:", error);
    }

    if (data) {
      setDiary(data);
      setEditedContent(data.content || "");
    }
    setLoading(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent(diary.content || "");
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from("diaries")
      .update({ content: editedContent })
      .eq("id", id);

    if (error) {
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "저장 완료",
        description: "일기가 수정되었습니다.",
      });
      setDiary({ ...diary, content: editedContent });
      setIsEditing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleAddPhotos = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const currentMaxOrder = diary.photos?.length || 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileName = `${user.id}/${Date.now()}-${i}-${file.name}`;

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
            diary_id: id,
            display_order: currentMaxOrder + i,
          });

        if (photoError) throw photoError;
      }

      toast({
        title: "사진 추가 완료",
        description: `${selectedFiles.length}장의 사진이 추가되었습니다.`,
      });

      setSelectedFiles([]);
      fetchDiary();
    } catch (error: any) {
      toast({
        title: "사진 추가 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    const { error } = await supabase
      .from("photos")
      .delete()
      .eq("id", photoId);

    if (error) {
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const fileName = photoUrl.split("/").pop();
      if (fileName) {
        await supabase.storage
          .from("photos")
          .remove([fileName]);
      }

      toast({
        title: "사진 삭제 완료",
      });
      fetchDiary();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-soft">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!diary) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-soft">
        <div className="text-center">
          <p className="mb-4">일기를 찾을 수 없습니다.</p>
          <Button onClick={() => navigate("/")}>홈으로</Button>
        </div>
      </div>
    );
  }

  const sortedPhotos = diary.photos?.sort((a: any, b: any) => a.display_order - b.display_order) || [];

  return (
    <div className="min-h-screen gradient-soft">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
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
                          {isEditing && sortedPhotos.length > 1 && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={() => handleDeletePhoto(photo.id, photo.photo_url)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {format(new Date(diary.created_at), "yyyy년 M월 d일 (EEE) HH:mm", { locale: ko })}
                </div>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    편집
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      취소
                    </Button>
                    <Button variant="default" size="sm" onClick={handleSave}>
                      <Save className="h-4 w-4 mr-2" />
                      저장
                    </Button>
                  </div>
                )}
              </div>
              
              {isEditing ? (
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[200px] resize-none"
                  placeholder="일기 내용을 입력하세요..."
                />
              ) : (
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {diary.content}
                  </p>
                </div>
              )}

              {isEditing && (
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">사진 추가</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="flex-1 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddPhotos}
                      disabled={uploading || selectedFiles.length === 0}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {uploading ? "업로드 중..." : "추가"}
                    </Button>
                  </div>
                  {selectedFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {selectedFiles.length}개 파일 선택됨
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs">
                  {diary.tone === 'warm' ? '따뜻함' : 
                   diary.tone === 'calm' ? '차분함' : 
                   diary.tone === 'essay' ? '에세이' : '경쾌함'}
                </span>
                <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs">
                  {diary.length === 'short' ? '짧게' : 
                   diary.length === 'medium' ? '중간' : '길게'}
                </span>
                {diary.emoji && (
                  <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs">
                    {diary.emoji}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
