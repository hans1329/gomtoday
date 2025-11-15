import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, User, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function Home() {
  const [diaries, setDiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchDiaries();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const fetchDiaries = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("diaries")
      .select(`
        *,
        photos (
          photo_url
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setDiaries(data);
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

  return (
    <div className="min-h-screen gradient-soft pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold gradient-warm bg-clip-text text-transparent">
            사진 일기장
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
          >
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {diaries.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="py-12 text-center space-y-4">
              <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">아직 일기가 없어요</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  사진을 올려서 첫 일기를 만들어보세요!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          diaries.map((diary) => (
            <Card 
              key={diary.id} 
              className="shadow-soft hover:shadow-medium transition-shadow cursor-pointer overflow-hidden"
              onClick={() => navigate(`/diary/${diary.id}`)}
            >
              <CardContent className="p-0">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {diary.photos?.photo_url && (
                    <img
                      src={diary.photos.photo_url}
                      alt="Diary"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(diary.created_at), "yyyy년 M월 d일 (EEE)", { locale: ko })}
                  </div>
                  <p className="text-sm line-clamp-3">{diary.content}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-medium"
        onClick={() => navigate("/upload")}
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}