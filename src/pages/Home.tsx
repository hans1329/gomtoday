import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, User, Globe, Calendar as CalendarIcon, Heart, MessageCircle, Clock, Users, Search, Smile, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
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
  const [publicDiaries, setPublicDiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"my" | "public">("my");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "likes" | "comments" | "friends">("latest");
  const [selectedEmoji, setSelectedEmoji] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
  const [showAllDiaries, setShowAllDiaries] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const commonEmojis = ["😊", "😢", "😡", "😍", "🤔", "😴", "😱", "🤗", "😎", "🥳", "😤", "😭"];

  useEffect(() => {
    const handleViewModeChange = (e: CustomEvent<"my" | "public">) => {
      setViewMode(e.detail);
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
      fetchMonthData();
    }
  }, [currentUserId, currentMonth, showAllDiaries]);

  useEffect(() => {
    if (currentUserId && (allDiaries.length > 0 || publicDiaries.length > 0)) {
      filterAndSetDiaries();
    }
  }, [selectedDate, sortBy, selectedEmoji, searchQuery, allDiaries, publicDiaries, viewMode]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    } else {
      setCurrentUserId(user.id);
    }
  };

  const fetchMonthData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // 내 일기 가져오기
    let myQuery = supabase
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
      .eq("user_id", user.id);
    
    // 전체 보기가 아닐 때만 날짜 필터 적용
    if (!showAllDiaries) {
      myQuery = myQuery
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());
    }
    
    const { data: myData } = await myQuery.order("created_at", { ascending: false });

    if (myData) {
      const processedMyData = myData.map((diary: any) => {
        let allPhotos = [];
        if (diary.photos && diary.photos.length > 0) {
          allPhotos = diary.photos.sort((a: any, b: any) => a.display_order - b.display_order);
        } else if (diary.photo) {
          allPhotos = [diary.photo];
        }
        return { ...diary, photos: allPhotos };
      });
      setAllDiaries(processedMyData);
    }

    // 전체 공개 일기 가져오기
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
        
        const { data: publicData } = await supabase
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
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        if (publicData) {
          // 작성자 정보 가져오기
          const userIds = [...new Set(publicData.map(d => d.user_id))];
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("user_id, name, profile_photo_url")
            .in("user_id", userIds);

          const profilesMap = new Map(
            profilesData?.map(p => [p.user_id, p]) || []
          );

          const processedPublicData = publicData.map((diary: any) => {
            let allPhotos = [];
            if (diary.photos && diary.photos.length > 0) {
              allPhotos = diary.photos.sort((a: any, b: any) => a.display_order - b.display_order);
            } else if (diary.photo) {
              allPhotos = [diary.photo];
            }
            const profile = profilesMap.get(diary.user_id);
            return { 
              ...diary, 
              photos: allPhotos,
              author_name: profile?.name,
              author_photo: profile?.profile_photo_url
            };
          });

          // 좋아요와 댓글 수 가져오기
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

          const dataWithCounts = processedPublicData.map((diary: any) => ({
            ...diary,
            likesCount: likesCount[diary.id] || 0,
            commentsCount: commentsCount[diary.id] || 0,
          }));

          setPublicDiaries(dataWithCounts);
        }
      } else {
        setPublicDiaries([]);
      }
    } else {
      setPublicDiaries([]);
    }

    setLoading(false);
  };

  const filterAndSetDiaries = () => {
    let sourceDiaries = viewMode === "my" ? allDiaries : publicDiaries;
    let filtered = [...sourceDiaries];

    if (selectedEmoji) {
      filtered = filtered.filter(diary => diary.emoji === selectedEmoji);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(diary => 
        diary.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        diary.content?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedDate) {
      filtered = filtered.filter(diary => 
        isSameDay(new Date(diary.created_at), selectedDate)
      );
    }

    // 정렬
    if (sortBy === "latest") {
      filtered.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } else if (sortBy === "likes") {
      filtered.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (sortBy === "comments") {
      filtered.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
    }

    setDiaries(filtered);
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
      <div className="max-w-4xl mx-auto p-2 sm:p-4 pb-8 space-y-4">
        <Card className="shadow-medium md:max-w-2xl md:mx-auto">
          <CardContent className="p-6">
            <div className={cn(
              "flex items-center justify-between",
              isCalendarExpanded ? "mb-6" : "mb-0"
            )}>
              <div className="flex items-center gap-2">
                {!showAllDiaries && (
                  <>
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
                  </>
                )}
                {showAllDiaries && (
                  <h2 className="text-xl font-bold">전체 일기</h2>
                )}
                <Button
                  variant={showAllDiaries ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAllDiaries(!showAllDiaries)}
                  className="ml-2 rounded-full text-xs"
                >
                  {showAllDiaries ? "월별 보기" : "전체 보기"}
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

        <div className="flex items-center gap-2 px-2 sm:px-0">
          <div className="relative flex-1">
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
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 p-0 hover:bg-transparent border-0 flex-shrink-0"
              >
                <div className="bg-background/90 rounded-full w-9 h-9 flex items-center justify-center shadow-sm border border-border">
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 bg-background" align="end">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortBy("latest")}
                  className={cn("justify-start", sortBy === "latest" && "bg-accent")}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  최신순
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortBy("oldest")}
                  className={cn("justify-start", sortBy === "oldest" && "bg-accent")}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  오래된순
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortBy("likes")}
                  className={cn("justify-start", sortBy === "likes" && "bg-accent")}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  좋아요순
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortBy("comments")}
                  className={cn("justify-start", sortBy === "comments" && "bg-accent")}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  댓글순
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortBy("friends")}
                  className={cn("justify-start", sortBy === "friends" && "bg-accent")}
                >
                  <Users className="h-4 w-4 mr-2" />
                  친구 우선
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 p-0 hover:bg-transparent border-0 flex-shrink-0"
              >
                {selectedEmoji ? (
                  <div className="bg-background/90 rounded-full w-9 h-9 flex items-center justify-center text-base shadow-sm border border-border">
                    {selectedEmoji}
                  </div>
                ) : (
                  <div className="bg-background/90 rounded-full w-9 h-9 flex items-center justify-center shadow-sm border border-border">
                    <Smile className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 bg-background" align="end">
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