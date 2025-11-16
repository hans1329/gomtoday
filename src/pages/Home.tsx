import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, BookOpen, User, Globe, Calendar as CalendarIcon, ArrowUpDown, Heart, MessageCircle, Clock, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths, startOfDay, endOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import LoadingBar from "@/components/LoadingBar";
import DiaryCard from "@/components/DiaryCard";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Home() {
  const [diaries, setDiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"my" | "public">("my");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "likes" | "comments">("latest");
  const [filterFriends, setFilterFriends] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchDiaries();
    }
  }, [currentUserId, viewMode, selectedDate, sortBy, filterFriends]);

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

      let diaryIds = diaryNotebooks.map(dn => dn.diary_id);
      
      // 친구 필터링
      if (filterFriends) {
        const { data: friendships } = await supabase
          .from("friend_requests")
          .select("from_user_id, to_user_id")
          .eq("status", "accepted")
          .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);
        
        const friendIds = new Set<string>();
        friendships?.forEach(f => {
          if (f.from_user_id === user.id) {
            friendIds.add(f.to_user_id);
          } else {
            friendIds.add(f.from_user_id);
          }
        });

        // 친구가 작성한 일기만 필터링
        const { data: friendDiaries } = await supabase
          .from("diaries")
          .select("id")
          .in("id", diaryIds)
          .in("user_id", Array.from(friendIds));
        
        diaryIds = friendDiaries?.map(d => d.id) || [];
        
        if (diaryIds.length === 0) {
          setDiaries([]);
          setLoading(false);
          return;
        }
      }
      
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
        `)
        .in("id", diaryIds);
      
      // 날짜 필터링 추가
      if (selectedDate) {
        const dayStart = startOfDay(selectedDate).toISOString();
        const dayEnd = endOfDay(selectedDate).toISOString();
        query = query.gte("created_at", dayStart).lte("created_at", dayEnd);
      }
      
      // 정렬 기준에 따라 기본 쿼리 정렬
      if (sortBy === "latest") {
        query = query.order("created_at", { ascending: false });
      } else if (sortBy === "oldest") {
        query = query.order("created_at", { ascending: true });
      }
      
      const { data, error } = await query;

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

        // 좋아요 수와 댓글 수 가져오기
        const diaryIdsForCounts = data.map(d => d.id);
        
        const { data: likesData } = await supabase
          .from("diary_likes")
          .select("diary_id")
          .in("diary_id", diaryIdsForCounts);
        
        const { data: commentsData } = await supabase
          .from("diary_comments")
          .select("diary_id")
          .in("diary_id", diaryIdsForCounts);
        
        const likesCount = new Map<string, number>();
        likesData?.forEach(l => {
          likesCount.set(l.diary_id, (likesCount.get(l.diary_id) || 0) + 1);
        });
        
        const commentsCount = new Map<string, number>();
        commentsData?.forEach(c => {
          commentsCount.set(c.diary_id, (commentsCount.get(c.diary_id) || 0) + 1);
        });

        let diariesWithSortedPhotos = data.map((diary: any) => {
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
            author_photo: profile?.photo,
            likes_count: likesCount.get(diary.id) || 0,
            comments_count: commentsCount.get(diary.id) || 0
          };
        });
        
        // 정렬 적용
        if (sortBy === "likes") {
          diariesWithSortedPhotos.sort((a, b) => b.likes_count - a.likes_count);
        } else if (sortBy === "comments") {
          diariesWithSortedPhotos.sort((a, b) => b.comments_count - a.comments_count);
        }
        
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
      <div className="max-w-4xl mx-auto p-2 sm:p-4 space-y-4">
        <div className="flex items-center justify-end gap-2 mb-2 px-2 sm:px-0">
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

        {viewMode === "my" ? (
          <Card className="shadow-medium">
            <CardContent className="p-6">
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
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 px-2 sm:px-0">
            <div className="space-y-3 pl-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">전체 공개 일기</h2>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "rounded-full",
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
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
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
                  </SelectContent>
                </Select>
                
                <Button
                  variant={filterFriends ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setFilterFriends(!filterFriends);
                    toast({
                      title: filterFriends ? "전체 일기 보기" : "친구 일기만 보기",
                    });
                  }}
                  className="rounded-full"
                >
                  <Users className="h-4 w-4 mr-2" />
                  친구 일기
                </Button>
              </div>
            </div>
            
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
