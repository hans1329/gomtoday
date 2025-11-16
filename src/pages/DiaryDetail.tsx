import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Edit } from "lucide-react";
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
    }
    setLoading(false);
  };

  const handleEdit = () => {
    navigate(`/upload/${id}`);
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
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </Button>
              </div>
              
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {diary.content}
                </p>
              </div>

              {/* Metadata */}
              <div className="flex gap-2 pt-4 border-t">
                {diary.emoji && (
                  <span className="text-3xl">{diary.emoji}</span>
                )}
                <div className="flex flex-wrap gap-2">
                  {diary.tone && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary">
                      감정: {diary.tone}
                    </span>
                  )}
                  {diary.length && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary">
                      길이: {diary.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
