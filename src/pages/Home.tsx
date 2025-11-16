import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, User, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";

const breadCharacters = ["🍞", "🥐", "🥖", "🥯", "🧈", "🫓", "🥨"];

export default function Home() {
  const [diaries, setDiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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

  const getDiaryForDate = (date: Date) => {
    return diaries.find(diary => 
      isSameDay(new Date(diary.created_at), date)
    );
  };

  const getBreadCharacter = (date: Date) => {
    const diary = getDiaryForDate(date);
    if (!diary) return null;
    
    const seed = date.getDate() + date.getMonth() * 31;
    return breadCharacters[seed % breadCharacters.length];
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
    const startDate = monthStart;
    const endDate = monthEnd;
    
    const dateFormat = "d";
    const rows = [];
    
    let days = [];
    let day = startDate;
    
    const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
    
    const firstDayOfWeek = monthStart.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }
    
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        if (day > endDate) break;
        
        const currentDay = day;
        const breadChar = getBreadCharacter(currentDay);
        const isToday = isSameDay(currentDay, new Date());
        
        days.push(
          <button
            key={currentDay.toString()}
            onClick={() => handleDateClick(currentDay)}
            className={`
              aspect-square p-2 rounded-full flex flex-col items-center justify-center gap-1
              transition-all hover:bg-secondary/50 hover:scale-105 active:scale-95
              ${isToday ? "ring-2 ring-primary" : ""}
              ${!isSameMonth(currentDay, currentMonth) ? "opacity-30" : ""}
            `}
          >
            <span className={`text-sm ${isToday ? "font-bold text-primary" : "text-foreground"}`}>
              {format(currentDay, dateFormat)}
            </span>
            <span className="text-2xl min-h-[32px] flex items-center justify-center">
              {breadChar && (
                <span className="animate-bounce" style={{ animationDuration: "2s" }}>
                  {breadChar}
                </span>
              )}
            </span>
          </button>
        );
        
        day = new Date(day);
        day.setDate(day.getDate() + 1);
      }
      
      if (days.length > 0) {
        rows.push(
          <div key={day.toString()} className="grid grid-cols-7 gap-2">
            {days}
          </div>
        );
        days = [];
      }
    }
    
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-7 gap-2 mb-3">
          {weekDays.map((day, i) => (
            <div key={day} className={`text-center text-sm font-semibold ${i === 0 ? "text-destructive" : i === 6 ? "text-primary" : "text-muted-foreground"}`}>
              {day}
            </div>
          ))}
        </div>
        {rows}
      </div>
    );
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
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-1.5">
            <img src="/3rdme-logo.png" alt="3rdMe" className="w-6 h-6" />
            3rdMe
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
            className="rounded-full shadow-sm hover:shadow-md transition-shadow"
          >
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card className="shadow-soft bg-white">
          <CardContent className="p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold">
                {format(currentMonth, "yyyy년 M월", { locale: ko })}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="rounded-full"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Calendar Grid */}
            {renderCalendar()}

            {/* Legend */}
            <div className="mt-6 pt-4 border-t text-center">
              <p className="text-sm text-muted-foreground">
                📅 날짜를 클릭해서 일기를 보거나 작성해보세요!
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                빵 캐릭터가 있는 날은 일기가 있는 날이에요 🥐
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Diaries */}
        {diaries.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-lg font-semibold px-2">최근 일기</h3>
            {diaries.slice(0, 3).map((diary) => (
              <Card 
                key={diary.id} 
                className="shadow-soft hover:shadow-medium transition-all cursor-pointer hover:scale-[1.02] bg-white"
                onClick={() => navigate(`/diary/${diary.id}`)}
              >
                <CardContent className="p-4 flex gap-4">
                  <div className="w-20 h-20 rounded-xl bg-muted flex-shrink-0 overflow-hidden">
                    {diary.photos?.photo_url && (
                      <img
                        src={diary.photos.photo_url}
                        alt="Diary"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-1">
                      {format(new Date(diary.created_at), "M월 d일 (EEE)", { locale: ko })}
                    </div>
                    <p className="text-sm line-clamp-2">{diary.content}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-medium aspect-square"
        onClick={() => navigate("/upload")}
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}