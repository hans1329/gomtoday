import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, User, Globe, Calendar as CalendarIcon, Heart, MessageCircle, Clock, Users, Search, Smile, ChevronDown, ChevronUp, ArrowUpDown, Send, Edit, Pencil } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [likes, setLikes] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const isLikingRef = useRef(false);
  const isMobile = useIsMobile();
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
  }, [currentUserId, currentMonth]);

  useEffect(() => {
    if (currentUserId && (allDiaries.length > 0 || publicDiaries.length > 0)) {
      filterAndSetDiaries();
    }
  }, [selectedDate, sortBy, selectedEmoji, searchQuery, allDiaries, publicDiaries, viewMode]);

  useEffect(() => {
    if (viewMode === "my" && diaries.length > 0) {
      fetchLikes();
      fetchComments();
    }
  }, [diaries, viewMode]);

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
    const { data: myData } = await supabase
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
      .gte("created_at", monthStart.toISOString())
      .lte("created_at", monthEnd.toISOString())
      .order("created_at", { ascending: false });

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

  const handlePrevDay = () => {
    if (selectedDate) {
      const prevDay = new Date(selectedDate);
      prevDay.setDate(prevDay.getDate() - 1);
      setSelectedDate(prevDay);
      
      // 월이 바뀌는 경우에만 currentMonth 업데이트
      if (prevDay.getMonth() !== selectedDate.getMonth()) {
        setCurrentMonth(prevDay);
      }
    }
  };

  const handleNextDay = () => {
    if (selectedDate) {
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setSelectedDate(nextDay);
      
      // 월이 바뀌는 경우에만 currentMonth 업데이트
      if (nextDay.getMonth() !== selectedDate.getMonth()) {
        setCurrentMonth(nextDay);
      }
    }
  };

  const fetchLikes = async () => {
    if (diaries.length === 0) return;
    const diaryId = diaries[0].id;
    const { data } = await supabase
      .from("diary_likes")
      .select("*")
      .eq("diary_id", diaryId);
    
    if (data) {
      setLikes(data);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLiked(data.some(like => like.user_id === user.id));
      }
    }
  };

  const fetchComments = async () => {
    if (diaries.length === 0) return;
    const diaryId = diaries[0].id;
    const { data } = await supabase
      .from("diary_comments")
      .select(`
        *,
        profiles:user_id (
          name,
          profile_photo_url
        )
      `)
      .eq("diary_id", diaryId)
      .order("created_at", { ascending: true });

    if (data) {
      setComments(data);
    }
  };

  const handleLike = async () => {
    if (diaries.length === 0 || isLikingRef.current) return;
    
    isLikingRef.current = true;
    const diaryId = diaries[0].id;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      isLikingRef.current = false;
      return;
    }

    setIsLiked(!isLiked);
    setLikes(prev => 
      isLiked 
        ? prev.filter(like => like.user_id !== user.id)
        : [...prev, { user_id: user.id }]
    );

    try {
      if (isLiked) {
        await supabase
          .from("diary_likes")
          .delete()
          .eq("diary_id", diaryId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("diary_likes")
          .insert({ diary_id: diaryId, user_id: user.id });
      }
    } finally {
      isLikingRef.current = false;
    }
  };

  const handleCommentSubmit = async () => {
    if (diaries.length === 0 || !newComment.trim()) return;
    
    const diaryId = diaries[0].id;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from("diary_comments")
      .insert({
        diary_id: diaryId,
        user_id: user.id,
        content: newComment.trim()
      });

    if (!error) {
      setNewComment("");
      fetchComments();
      toast({
        title: "댓글이 작성되었습니다",
      });
    }
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
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-8 w-8 text-muted-foreground relative"
                >
                  <ChevronLeft className="h-4 w-4 absolute left-2" />
                  <ChevronLeft className="h-4 w-4 absolute left-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevDay}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-base sm:text-xl font-bold mx-2">
                  {format(selectedDate || new Date(), isMobile ? "M월 d일 EEEEE" : "M월 d일 EEEE", { locale: ko })}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextDay}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-8 w-8 text-muted-foreground relative"
                >
                  <ChevronRight className="h-4 w-4 absolute right-3.5" />
                  <ChevronRight className="h-4 w-4 absolute right-2" />
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

        {viewMode === "public" && (
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
        )}

        <div className="space-y-3 px-2 sm:px-0">
          {diaries.length === 0 ? (
            (() => {
              const isFutureDate = selectedDate && selectedDate > new Date();
              return !isFutureDate ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    {viewMode === "my" ? "아직 작성한 일기가 없습니다." : "공개된 일기가 없습니다."}
                  </p>
                  {viewMode === "my" && (
                    <Button
                      onClick={() => navigate("/upload")}
                      size="lg"
                      className="rounded-full gap-2 shadow-medium"
                    >
                      <Pencil className="h-5 w-5" />
                      일기 쓰기
                    </Button>
                  )}
                </div>
              ) : null;
            })()
          ) : viewMode === "my" ? (
            <div className="shadow-medium bg-card rounded-lg border p-4 md:p-6">
              {diaries[0].photos && diaries[0].photos.length > 0 && (
                <div className="mb-6">
                  <Carousel className="w-full">
                    <CarouselContent>
                      {diaries[0].photos.map((photo: any) => (
                        <CarouselItem key={photo.id}>
                          <img
                            src={photo.photo_url}
                            alt="Diary photo"
                            className="w-full h-[400px] object-cover rounded-lg"
                          />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {diaries[0].photos.length > 1 && (
                      <>
                        <CarouselPrevious className="left-2" />
                        <CarouselNext className="right-2" />
                      </>
                    )}
                  </Carousel>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-2">
                      {diaries[0].title || "제목 없음"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(diaries[0].created_at), "yyyy년 M월 d일 EEEE", { locale: ko })}
                    </p>
                  </div>
                  {currentUserId === diaries[0].user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/upload/${diaries[0].id}`)}
                      className="rounded-full"
                    >
                      <Edit className="h-5 w-5" />
                    </Button>
                  )}
                </div>

                {diaries[0].emoji && (
                  <div className="flex items-center gap-3 text-4xl">
                    {diaries[0].emoji}
                  </div>
                )}

                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-muted-foreground/60 leading-relaxed text-sm">
                    {diaries[0].content}
                  </p>
                </div>

                  <div className="flex items-center gap-4 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLike}
                      className={cn(
                        "gap-2 rounded-full",
                        isLiked && "text-red-500 hover:text-red-600"
                      )}
                    >
                      <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                      <span>{likes.length}</span>
                    </Button>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-sm">{comments.length}</span>
                    </div>
                  </div>

                  {comments.length > 0 && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold">댓글 {comments.length}개</h3>
                      <div className="space-y-3">
                        {comments.map((comment: any) => (
                          <div key={comment.id} className="flex gap-3">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={comment.profiles?.profile_photo_url} />
                              <AvatarFallback>
                                {comment.profiles?.name?.[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">
                                  {comment.profiles?.name || "익명"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(comment.created_at), "M월 d일 HH:mm", { locale: ko })}
                                </span>
                              </div>
                              <p className="text-sm text-foreground break-words">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <div className="relative">
                      <Input
                        placeholder="댓글을 입력하세요..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="pr-12 h-11"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleCommentSubmit();
                          }
                        }}
                      />
                      <Button
                        onClick={handleCommentSubmit}
                        disabled={!newComment.trim()}
                        size="icon"
                        className="absolute right-1 top-1 h-9 w-9 rounded-full"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
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