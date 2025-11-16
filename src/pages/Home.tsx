import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, BookOpen, User, Globe } from "lucide-react";
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import LoadingBar from "@/components/LoadingBar";
import DiaryCard from "@/components/DiaryCard";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [diaries, setDiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"my" | "public">("my");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchDiaries();
    }
  }, [currentUserId, viewMode]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    } else {
      setCurrentUserId(user.id);
    }
  };

  const fetchDiaries = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (viewMode === "my") {
      // 내 일기 가져오기
      const { data, error } = await supabase
        .from("diaries")
        .select(`
          *,
          photos!photos_diary_id_fkey (
            photo_url,
            display_order
          ),
          photo:photos!diaries_photo_id_fkey (
            photo_url
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching diaries:", error);
      }
      
      if (data) {
        const diariesWithSortedPhotos = data.map((diary: any) => {
          let allPhotos = [];
          
          if (diary.photos && diary.photos.length > 0) {
            allPhotos = diary.photos.sort((a: any, b: any) => a.display_order - b.display_order);
          } else if (diary.photo) {
            allPhotos = [diary.photo];
          }
          
          return {
            ...diary,
            photos: allPhotos
          };
        });
        setDiaries(diariesWithSortedPhotos);
      }
    } else {
      // 전체 공개된 일기 가져오기
      const { data: publicNotebooks } = await supabase
        .from("notebooks")
        .select("id")
        .eq("visibility", "public");

      if (!publicNotebooks || publicNotebooks.length === 0) {
        setDiaries([]);
        setLoading(false);
        return;
      }

      const notebookIds = publicNotebooks.map(nb => nb.id);
      
      const { data: diaryNotebooks } = await supabase
        .from("diary_notebooks")
        .select("diary_id")
        .in("notebook_id", notebookIds);

      if (!diaryNotebooks || diaryNotebooks.length === 0) {
        setDiaries([]);
        setLoading(false);
        return;
      }

      const diaryIds = diaryNotebooks.map(dn => dn.diary_id);
      
      const { data, error } = await supabase
        .from("diaries")
        .select(`
          *,
          photos!photos_diary_id_fkey (
            photo_url,
            display_order
          ),
          photo:photos!diaries_photo_id_fkey (
            photo_url
          )
        `)
        .in("id", diaryIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching public diaries:", error);
      }

      if (data) {
        // 각 일기의 작성자 정보 가져오기
        const userIds = [...new Set(data.map(d => d.user_id))];
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, profile_photo_url")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, { name: p.name, photo: p.profile_photo_url }]) || []);

        const diariesWithSortedPhotos = data.map((diary: any) => {
          let allPhotos = [];
          
          if (diary.photos && diary.photos.length > 0) {
            allPhotos = diary.photos.sort((a: any, b: any) => a.display_order - b.display_order);
          } else if (diary.photo) {
            allPhotos = [diary.photo];
          }
          
          const profile = profileMap.get(diary.user_id);
          
          return {
            ...diary,
            photos: allPhotos,
            author_name: profile?.name,
            author_photo: profile?.photo
          };
        });
        
        setDiaries(diariesWithSortedPhotos);
      }
    }
    
    setLoading(false);
  };

  const getDiaryForDate = (date: Date) => {
    return diaries.find(diary => 
      isSameDay(new Date(diary.created_at), date)
    );
  };

  const getEmojiForDate = (date: Date) => {
    const diary = getDiaryForDate(date);
    return diary?.emoji || null;
  };

  const handleDateClick = (date: Date) => {
    const diary = getDiaryForDate(date);
    if (diary) {
      navigate(`/diary/${diary.id}`);
    } else {
      navigate("/upload");
    }
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    const dateFormat = "d";
    const rows = [];
    
    const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
    
    const firstDayOfWeek = monthStart.getDay();
    let days = [];
    
    // 첫 주의 빈 칸 추가
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="flex flex-col gap-1">
          <div className="h-5" />
          <div className="w-full" style={{ aspectRatio: '1/1' }} />
        </div>
      );
    }
    
    // 날짜 추가
    let day = new Date(monthStart);
    while (day <= monthEnd) {
      const currentDay = new Date(day);
      const emoji = getEmojiForDate(currentDay);
      const isToday = isSameDay(currentDay, new Date());
      
      days.push(
        <div key={currentDay.toString()} className="flex flex-col gap-1">
          <div className="text-center h-5 flex items-center justify-center">
            <span className={`text-sm ${isToday ? "font-bold text-primary" : "text-foreground"}`}>
              {format(currentDay, dateFormat)}
            </span>
            {isToday && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary"></span>
            )}
          </div>
          <button
            onClick={() => handleDateClick(currentDay)}
            style={{ aspectRatio: '1/1' }}
            className={`
              w-full rounded-lg flex items-center justify-center relative
              transition-all hover:bg-secondary/50 hover:scale-105 active:scale-95
            `}
          >
            <span className="text-2xl">
              {emoji}
            </span>
          </button>
        </div>
      );
      
      // 일주일마다 행 추가
      if (days.length === 7) {
        rows.push(
          <div key={`week-${rows.length}`} className="grid grid-cols-7 gap-2">
            {days}
          </div>
        );
        days = [];
      }
      
      day.setDate(day.getDate() + 1);
    }
    
    // 마지막 주의 남은 칸 처리
    if (days.length > 0) {
      while (days.length < 7) {
        days.push(
          <div key={`empty-end-${days.length}`} className="flex flex-col gap-1">
            <div className="h-5" />
            <div className="w-full" style={{ aspectRatio: '1/1' }} />
          </div>
        );
      }
      rows.push(
        <div key={`week-${rows.length}`} className="grid grid-cols-7 gap-2">
          {days}
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-muted-foreground h-5"
            >
              {day}
            </div>
          ))}
        </div>
        {rows}
      </div>
    );
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  if (loading) {
    return <LoadingBar />;
  }

  return (
    <div className="min-h-screen gradient-soft">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-end gap-2 mb-2">
          <Button
            variant={viewMode === "my" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setViewMode("my");
              setLoading(true);
              toast({
                title: "내 일기 보기"
              });
            }}
            className="rounded-full"
          >
            <User className="h-4 w-4 mr-2" />
            내 일기
          </Button>
          <Button
            variant={viewMode === "public" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setViewMode("public");
              setLoading(true);
              toast({
                title: "전체 공개 일기 보기"
              });
            }}
            className="rounded-full"
          >
            <Globe className="h-4 w-4 mr-2" />
            전체 공개
          </Button>
        </div>

        <Card className="shadow-medium">
          <CardContent className="p-6">
            {viewMode === "my" ? (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePrevMonth}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="text-xl font-bold">
                      {format(currentMonth, "yyyy년 M월", { locale: ko })}
                    </h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleNextMonth}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                {renderCalendar()}
              </>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">전체 공개 일기</h2>
                {diaries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    공개된 일기가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {diaries.map((diary) => (
                      <DiaryCard
                        key={diary.id}
                        diary={diary}
                        onClick={() => navigate(`/diary/${diary.id}`)}
                        showTime={true}
                        imageSize="md"
                        currentUserId={currentUserId}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 리스트로 보기 버튼 - 내 일기 모드에서만 표시 */}
        {viewMode === "my" && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/diaries")}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            리스트로 보기
          </Button>
        )}

        {/* 최근 일기 5개 - 내 일기 모드에서만 표시 */}
        {viewMode === "my" && diaries.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">최근 일기</h3>
            <div className="space-y-3">
              {diaries.slice(0, 5).map((diary) => (
                <DiaryCard
                  key={diary.id}
                  diary={diary}
                  onClick={() => navigate(`/diary/${diary.id}`)}
                  showTime={false}
                  imageSize="sm"
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
