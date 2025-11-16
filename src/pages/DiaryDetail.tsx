import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function DiaryDetail() {
  const { id } = useParams();
  const [diary, setDiary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDiary();
  }, [id]);

  const fetchDiary = async () => {
    const { data, error } = await supabase
      .from("diaries")
      .select(`
        *,
        photos (
          photo_url
        )
      `)
      .eq("id", id)
      .single();

    if (data) {
      setDiary(data);
    }
    setLoading(false);
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

  return (
    <div className="min-h-screen gradient-soft">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Card className="shadow-medium overflow-hidden">
          <CardContent className="p-0">
            {/* Photo */}
            <div className="aspect-[4/3] bg-muted relative overflow-hidden">
              {diary.photos?.photo_url && (
                <img
                  src={diary.photos.photo_url}
                  alt="Diary"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="text-sm text-muted-foreground">
                {format(new Date(diary.created_at), "yyyy년 M월 d일 (EEE) HH:mm", { locale: ko })}
              </div>
              
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {diary.content}
                </p>
              </div>

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
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}