import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";

export default function Home() {
  const [diaries, setDiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
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
        photos!photos_diary_id_fkey (
          photo_url,
          display_order
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching diaries:", error);
    }
    
    if (data) {
      // 각 일기의 사진들을 display_order로 정렬
      const diariesWithSortedPhotos = data.map(diary => ({
        ...diary,
        photos: diary.photos?.sort((a: any, b: any) => a.display_order - b.display_order) || []
      }));
      setDiaries(diariesWithSortedPhotos);
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
    return (
      <div className="min-h-screen flex items-center justify-center gradient-soft">
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-soft">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <Card className="shadow-medium">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
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

            {renderCalendar()}
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/diaries")}
        >
          <BookOpen className="mr-2 h-4 w-4" />
          리스트로 보기
        </Button>

        {/* 최근 일기 5개 */}
        {diaries.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">최근 일기</h3>
            <div className="space-y-3">
              {diaries.slice(0, 5).map((diary) => (
                <Card
                  key={diary.id}
                  className="shadow-medium hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/diary/${diary.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* 썸네일 */}
                      {diary.photos && diary.photos.length > 0 && (
                        <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted relative">
                          <img
                            src={diary.photos[0].photo_url}
                            alt="일기 사진"
                            className="w-full h-full object-cover"
                          />
                          {diary.emoji && (
                            <div className="absolute bottom-1 right-1 bg-background/90 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm">
                              {diary.emoji}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 내용 */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {format(new Date(diary.created_at), "yyyy년 M월 d일 (E)", { locale: ko })}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {diary.content}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
