import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, User, Globe, Calendar as CalendarIcon, Heart, MessageCircle, Clock, Users, Search, Smile, ChevronDown, ChevronUp } from "lucide-react";
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import LoadingBar from "@/components/LoadingBar";
import DiaryCard from "@/components/DiaryCard";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [diaries, setDiaries] = useState<any[]>([]);
  const [allDiaries, setAllDiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"my" | "public">("my");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "likes" | "comments" | "friends">("latest");
  const [selectedEmoji, setSelectedEmoji] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const commonEmojis = ["😊", "😢", "😡", "😍", "🤔", "😴", "😱", "🤗", "😎", "🥳", "😤", "😭"];

  useEffect(() => {
    const handleViewModeChange = (e: CustomEvent<"my" | "public">) => {
      setViewMode(e.detail);
      setLoading(true);
      if (e.detail === "my") {
        setSearchQuery("");
      }
      toast({
        title: e.detail === "my" ? "내 일기 보기" : "전체 공개 일기 보기"
      });
    };

    window.addEventListener('viewModeChange', handleViewModeChange as any);
    return () => window.removeEventListener('viewModeChange', handleViewModeChange as any);
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchDiaries();
    }
  }, [currentUserId, viewMode, selectedDate, sortBy, selectedEmoji, searchQuery]);

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
        let diariesWithSortedPhotos = data.map((diary: any) => {
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
        
        setAllDiaries(diariesWithSortedPhotos);
        
        if (selectedEmoji) {
          diariesWithSortedPhotos = diariesWithSortedPhotos.filter(diary => 
            diary.emoji === selectedEmoji
          );
        }
        
        if (searchQuery.trim()) {
          diariesWithSortedPhotos = diariesWithSortedPhotos.filter(diary => 
            diary.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            diary.content?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        if (selectedDate) {
          diariesWithSortedPhotos = diariesWithSortedPhotos.filter(diary => 
            isSameDay(new Date(diary.created_at), selectedDate)
          );
        }
        
        setDiaries(diariesWithSortedPhotos);
      }
      setLoading(false);
    } else {
      let query = supabase
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
        `);

      const { data: publicNotebooks } = await supabase
        .from("notebooks")
        .select("id")
        .eq("visibility", "public");

      if (publicNotebooks && publicNotebooks.length > 0) {
        const publicNotebookIds = publicNotebooks.map(nb => nb.id);
        
        const { data: publicDiaryIds } = await supabase
          .from("diary_notebooks")
          .select("diary_id")
          .in("notebook_id", publicNotebookIds);

        if (publicDiaryIds && publicDiaryIds.length > 0) {
          const diaryIds = publicDiaryIds.map(dn => dn.diary_id);
          query = query.in("id", diaryIds);
        } else {
          setDiaries([]);
          setLoading(false);
          return;
        }
      } else {
        setDiaries([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching public diaries:", error);
      }

      if (data) {
        let diariesWithSortedPhotos = data.map((diary: any) => {
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
        
        setAllDiaries(diariesWithSortedPhotos);
        
        if (selectedEmoji) {
          diariesWithSortedPhotos = diariesWithSortedPhotos.filter(diary => 
            diary.emoji === selectedEmoji
          );
        }
        
        if (searchQuery.trim()) {
          diariesWithSortedPhotos = diariesWithSortedPhotos.filter(diary => 
            diary.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            diary.content?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        if (selectedDate) {
          diariesWithSortedPhotos = diariesWithSortedPhotos.filter(diary => 
            isSameDay(new Date(diary.created_at), selectedDate)
          );
        }

        const diaryIds = diariesWithSortedPhotos.map(d => d.id);
        const { data: likesData } = await supabase
          .from("diary_likes")
          .select("diary_id")
          .in("diary_id", diaryIds);

        const { data: commentsData } = await supabase
          .from("diary_comments")
          .select("diary_id")
          .in("diary_id", diaryIds);

        const likesCount = likesData?.reduce((acc: any, like: any) => {
          acc[like.diary_id] = (acc[like.diary_id] || 0) + 1;
          return acc;
        }, {}) || {};

        const commentsCount = commentsData?.reduce((acc: any, comment: any) => {
          acc[comment.diary_id] = (acc[comment.diary_id] || 0) + 1;
          return acc;
        }, {}) || {};

        diariesWithSortedPhotos = diariesWithSortedPhotos.map((diary: any) => ({
          ...diary,
          likesCount: likesCount[diary.id] || 0,
          commentsCount: commentsCount[diary.id] || 0,
        }));

        const { data: friendships } = await supabase
          .from("friend_requests")
          .select("from_user_id, to_user_id")
          .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
          .eq("status", "accepted");

        const friendIds = friendships?.map((f: any) => 
          f.from_user_id === user.id ? f.to_user_id : f.from_user_id
        ) || [];

        if (sortBy === "latest") {
          diariesWithSortedPhotos.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        } else if (sortBy === "oldest") {
          diariesWithSortedPhotos.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        } else if (sortBy === "likes") {
          diariesWithSortedPhotos.sort((a, b) => b.likesCount - a.likesCount);
        } else if (sortBy === "comments") {
          diariesWithSortedPhotos.sort((a, b) => b.commentsCount - a.commentsCount);
        } else if (sortBy === "friends") {
          diariesWithSortedPhotos.sort((a, b) => {
            const aIsFriend = friendIds.includes(a.user_id);
            const bIsFriend = friendIds.includes(b.user_id);
            if (aIsFriend && !bIsFriend) return -1;
            if (!aIsFriend && bIsFriend) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
        }

        setDiaries(diariesWithSortedPhotos);
      }
      setLoading(false);
    }
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = monthStart;
    const endDate = monthEnd;

    const dateRows = [];
    let days = [];
    let day = startDate;

    const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
    
    dateRows.push(
      <div key="weekdays" className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((weekDay) => (
          <div key={weekDay} className="text-center text-sm font-medium text-muted-foreground p-2">
            {weekDay}
          </div>
        ))}
      </div>
    );

    const startDayOfWeek = startDate.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-start-${i}`} className="p-2"></div>);
    }

    while (day <= endDate) {
      const currentDay = day;
      const dayDiaries = allDiaries.filter((diary) =>
        isSameDay(new Date(diary.created_at), currentDay)
      );
      
      days.push(
        <div
          key={currentDay.toISOString()}
          onClick={() => {
            setSelectedDate(currentDay);
          }}
          className={cn(
            "p-3 pt-2 text-center transition-all relative cursor-pointer min-h-[60px] flex flex-col items-center justify-start rounded-sm",
            dayDiaries.length > 0
              ? "hover:bg-muted/40 text-primary font-semibold"
              : "hover:bg-muted/40",
            selectedDate && isSameDay(currentDay, selectedDate) && "bg-muted/50"
          )}
        >
          <div className="text-sm">{format(currentDay, "d")}</div>
          {isSameDay(currentDay, new Date()) && (
            <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-primary rounded-full"></div>
          )}
          {dayDiaries.length > 0 && dayDiaries[0].emoji && (
            <div className="absolute top-7 left-1/2 -translate-x-1/2 text-2xl leading-none">
              {dayDiaries[0].emoji}
            </div>
          )}
        </div>
      );

      day = new Date(day);
      day.setDate(day.getDate() + 1);

      if (days.length === 7) {
        dateRows.push(
          <div key={day.toISOString()} className="grid grid-cols-7 gap-1">
            {days}
          </div>
        );
        days = [];
      }
    }

    if (days.length > 0) {
      while (days.length < 7) {
        days.push(<div key={`empty-end-${days.length}`} className="p-2"></div>);
      }
      dateRows.push(
        <div key="last-row" className="grid grid-cols-7 gap-1">
          {days}
        </div>
      );
    }

    return <div>{dateRows}</div>;
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
      <div className="max-w-4xl mx-auto p-2 sm:p-4 space-y-4">
        {viewMode === "my" && (
          <Card className="shadow-medium">
            <CardContent className="p-6">
              <div className={cn(
                "flex items-center justify-between",
                isCalendarExpanded ? "mb-6" : "mb-0"
              )}>
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
                  className="rounded-full"
                >
                  {isCalendarExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </Button>
              </div>
              {isCalendarExpanded && renderCalendar()}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-2 px-2 sm:px-0 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-full h-9 text-sm"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-full h-9",
                  selectedDate && "border-primary"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  if (date) {
                    toast({
                      title: format(date, "yyyy년 M월 d일 (E)", { locale: ko }) + " 일기",
                    });
                  }
                }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
              {selectedDate && (
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-full"
                    onClick={() => {
                      setSelectedDate(undefined);
                      toast({
                        title: "날짜 필터 해제",
                      });
                    }}
                  >
                    필터 해제
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[140px] rounded-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  최신순
                </div>
              </SelectItem>
              <SelectItem value="oldest">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  오래된순
                </div>
              </SelectItem>
              <SelectItem value="likes">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  좋아요순
                </div>
              </SelectItem>
              <SelectItem value="comments">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  댓글순
                </div>
              </SelectItem>
              <SelectItem value="friends">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  친구 우선
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 p-0 hover:bg-transparent border-0"
              >
                {selectedEmoji ? (
                  <div className="bg-background/90 rounded-full w-7 h-7 flex items-center justify-center text-base shadow-sm border border-border">
                    {selectedEmoji}
                  </div>
                ) : (
                  <div className="bg-background/90 rounded-full w-7 h-7 flex items-center justify-center shadow-sm border border-border">
                    <Smile className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="grid grid-cols-6 gap-2">
                {commonEmojis.map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0 hover:bg-accent text-xl"
                    onClick={() => {
                      setSelectedEmoji(emoji);
                      toast({
                        title: `${emoji} 감정으로 필터링`,
                      });
                    }}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
              {selectedEmoji && (
                <div className="mt-3 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-full"
                    onClick={() => {
                      setSelectedEmoji("");
                      toast({
                        title: "감정 필터 해제",
                      });
                    }}
                  >
                    필터 해제
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-3 px-2 sm:px-0">
          {diaries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {viewMode === "my" ? "아직 작성한 일기가 없습니다." : "공개된 일기가 없습니다."}
            </div>
          ) : (
            <div className="space-y-3">
              {diaries.slice(0, 5).map((diary) => (
                <DiaryCard
                  key={diary.id}
                  diary={diary}
                  onClick={() => navigate(`/diary/${diary.id}`)}
                  showTime={viewMode === "public"}
                  imageSize="md"
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}