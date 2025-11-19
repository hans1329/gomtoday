import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import { ChevronLeft, ChevronRight, User, Globe, Calendar as CalendarIcon, Heart, MessageCircle, Clock, Users, Search, Smile, ChevronDown, ChevronUp, ArrowUpDown, Send, Edit, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [hasAnyDiary, setHasAnyDiary] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"my" | "public">("my");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "likes" | "comments" | "friends">("latest");
  const [selectedEmoji, setSelectedEmoji] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [likes, setLikes] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [displayCount, setDisplayCount] = useState(30);
  const [filteredDiaries, setFilteredDiaries] = useState<any[]>([]);
  const [isFilteringDiaries, setIsFilteringDiaries] = useState(false);
  const isLikingRef = useRef(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const commonEmojis = ["😊", "😢", "😡", "😍", "🤔", "😴", "😱", "🤗", "😎", "🥳", "😤", "😭"];

  const hasDiaryOnSelectedDate =
    !!selectedDate &&
    (viewMode === "my"
      ? allDiaries.some((diary) =>
          isSameDay(new Date(diary.created_at), selectedDate)
        )
      : publicDiaries.some((diary) =>
          isSameDay(new Date(diary.created_at), selectedDate)
        ));

  useEffect(() => {
    const fetchLogo = async () => {
      // 캐시된 로고 확인
      const cachedLogo = localStorage.getItem("desktop_logo_url");
      if (cachedLogo) {
        setLogoUrl(cachedLogo);
      }

      // 브랜드 에셋에서 로고 가져오기
      const { data } = supabase.storage
        .from("brand-assets")
        .getPublicUrl("3rdme-logo.png");
      if (data) {
        setLogoUrl(data.publicUrl);
        localStorage.setItem("desktop_logo_url", data.publicUrl);
      }
    };
    fetchLogo();
  }, []);

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
    if (!currentUserId) return;

    const checkHasAnyDiary = async () => {
      const { count, error } = await supabase
        .from("diaries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", currentUserId);

      if (!error) {
        setHasAnyDiary((count ?? 0) > 0);
      }
    };

    checkHasAnyDiary();
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      fetchMonthData();
    }
  }, [currentUserId, currentMonth]);

  useEffect(() => {
    if (!currentUserId) return;
    filterAndSetDiaries();
  }, [selectedDate, sortBy, selectedEmoji, searchQuery, allDiaries, publicDiaries, viewMode, displayCount]);

  useEffect(() => {
    // 필터나 보기 모드가 변경되면 displayCount 초기화
    setDisplayCount(30);
  }, [selectedDate, sortBy, selectedEmoji, searchQuery, viewMode]);

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const monthKey = format(currentMonth, 'yyyy-MM');
    const cacheKey = `home_data_${user.id}_${monthKey}`;
    const cacheTimeKey = `home_data_time_${user.id}_${monthKey}`;

    // 캐시된 데이터 확인
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);
    const cacheAge = cachedTime ? Date.now() - parseInt(cachedTime) : Infinity;
    const CACHE_DURATION = 5 * 60 * 1000; // 5분

    // 캐시가 유효하면 먼저 보여주기
    if (cachedData && cacheAge < CACHE_DURATION) {
      try {
        const parsed = JSON.parse(cachedData);
        setAllDiaries(parsed.myDiaries || []);
        setPublicDiaries(parsed.publicDiaries || []);
        setLoading(false);
        // 캐시가 유효하면 백그라운드 업데이트는 하지 않음
        return;
      } catch (e) {
        console.error('Cache parse error:', e);
      }
    }

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
        ),
        diary_notebooks(
          notebook_id,
          notebooks(visibility)
        )
      `)
      .eq("user_id", user.id)
      .gte("created_at", monthStart.toISOString())
      .lte("created_at", monthEnd.toISOString())
      .order("created_at", { ascending: false });

    const processedMyData = myData ? myData.map((diary: any) => {
      let allPhotos = [];
      if (diary.photos && diary.photos.length > 0) {
        allPhotos = diary.photos.sort((a: any, b: any) => a.display_order - b.display_order);
      } else if (diary.photo) {
        allPhotos = [diary.photo];
      }
      // 하나라도 공개 노트북에 속하면 공개로 표시
      const isPublic = diary.diary_notebooks?.some((dn: any) => dn.notebooks?.visibility === 'public') ?? false;
      return { ...diary, photos: allPhotos, isPublic };
    }) : [];

    setAllDiaries(processedMyData);

    // 전체 공개 일기 가져오기 (공개 일기 + 등장인물에 내가 포함된 일기)
    let finalPublicDiaries: any[] = [];

    // 1) 전체 공개 일기 (기존 공개 일기 로직)
    let basePublicDiaries: any[] = [];
    const { data: publicNotebooks } = await supabase
      .from("notebooks")
      .select("id")
      .eq("visibility", "public");

    if (publicNotebooks && publicNotebooks.length > 0) {
      const publicNotebookIds = publicNotebooks.map((nb: any) => nb.id);
      
      const { data: publicDiaryIds } = await supabase
        .from("diary_notebooks")
        .select("diary_id")
        .in("notebook_id", publicNotebookIds);

      if (publicDiaryIds && publicDiaryIds.length > 0) {
        const publicDiaryIdList = publicDiaryIds.map((dn: any) => dn.diary_id);
        
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
            ),
            diary_notebooks(
              notebook_id,
              notebooks(visibility)
            )
          `)
          .in("id", publicDiaryIdList)
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        if (publicData) {
          basePublicDiaries = publicData;
        }
      }
    }

    // 2) 등장인물에 내가 포함된 일기
    const { data: participantData } = await supabase
      .from("diaries")
      .select(`
        *,
        photos!photos_diary_id_fkey (
          photo_url,
          display_order
        ),
        photo:photos!diaries_photo_id_fkey (
          photo_url
        ),
        diary_notebooks(
          notebook_id,
          notebooks(visibility)
        )
      `)
      .gte("created_at", monthStart.toISOString())
      .lte("created_at", monthEnd.toISOString());

    let combinedDiaries: any[] = [...basePublicDiaries];

    if (participantData && participantData.length > 0) {
      const diariesWithMe = participantData.filter((d: any) => {
        if (!d.participants || !Array.isArray(d.participants)) return false;
        return d.participants.some((p: any) => p.id === user.id);
      });

      // 공개 일기 + 등장인물에 내가 포함된 일기를 합치고 중복 제거
      const diaryMap = new Map<string, any>();
      combinedDiaries.forEach((d: any) => diaryMap.set(d.id, d));
      diariesWithMe.forEach((d: any) => diaryMap.set(d.id, d));
      combinedDiaries = Array.from(diaryMap.values());
    }

    if (combinedDiaries.length > 0) {
      const diaryIds = combinedDiaries.map((d: any) => d.id);
      const userIds = [...new Set(combinedDiaries.map((d: any) => d.user_id))];

      // 작성자 정보 가져오기
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, name, profile_photo_url")
        .in("user_id", userIds);

      const profilesMap = new Map(
        (profilesData || []).map((p: any) => [p.user_id, p])
      );

      const processedPublicData = combinedDiaries.map((diary: any) => {
        let allPhotos = [];
        if (diary.photos && diary.photos.length > 0) {
          allPhotos = diary.photos.sort(
            (a: any, b: any) => a.display_order - b.display_order
          );
        } else if (diary.photo) {
          allPhotos = [diary.photo];
        }
        const profile = profilesMap.get(diary.user_id);
        // 하나라도 공개 노트북에 속하면 공개로 표시
        const isPublic = diary.diary_notebooks?.some((dn: any) => dn.notebooks?.visibility === 'public') ?? false;
        return {
          ...diary,
          photos: allPhotos,
          author_name: profile?.name,
          author_photo: profile?.profile_photo_url,
          isPublic,
        };
      });

      console.log("[Home] Public view diaries sample:", processedPublicData.slice(0, 3));

      // 좋아요와 댓글 수 가져오기
      const { data: likesData } = await supabase
        .from("diary_likes")
        .select("diary_id")
        .in("diary_id", diaryIds);

      const { data: commentsData } = await supabase
        .from("diary_comments")
        .select("diary_id")
        .in("diary_id", diaryIds);

      const likesCount =
        likesData?.reduce((acc: any, like: any) => {
          acc[like.diary_id] = (acc[like.diary_id] || 0) + 1;
          return acc;
        }, {}) || {};

      const commentsCount =
        commentsData?.reduce((acc: any, comment: any) => {
          acc[comment.diary_id] = (acc[comment.diary_id] || 0) + 1;
          return acc;
        }, {}) || {};

      const dataWithCounts = processedPublicData.map((diary: any) => ({
        ...diary,
        likesCount: likesCount[diary.id] || 0,
        commentsCount: commentsCount[diary.id] || 0,
      }));

      finalPublicDiaries = dataWithCounts;
      setPublicDiaries(dataWithCounts);
    }

    if (finalPublicDiaries.length === 0) {
      setPublicDiaries([]);
    }


    // 데이터 캐싱
    const cacheData = {
      myDiaries: processedMyData,
      publicDiaries: finalPublicDiaries
    };
    
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      localStorage.setItem(cacheTimeKey, Date.now().toString());
    } catch (e) {
      console.error('Cache save error:', e);
    }

    setLoading(false);
  };

  const filterAndSetDiaries = () => {
    setIsFilteringDiaries(true);
    let sourceDiaries = viewMode === "my" ? allDiaries : publicDiaries;
    let filtered = [...sourceDiaries];

    if (selectedEmoji) {
      filtered = filtered.filter((diary) => diary.emoji === selectedEmoji);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter((diary) =>
        diary.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        diary.content?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 공개 일기 모드에서는 선택한 날짜의 일기만 필터
    if (selectedDate && viewMode === "public") {
      filtered = filtered.filter((diary) =>
        isSameDay(new Date(diary.created_at), selectedDate)
      );
    }

    // 정렬
    if (sortBy === "latest") {
      filtered.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortBy === "oldest") {
      filtered.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } else if (sortBy === "likes") {
      filtered.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    } else if (sortBy === "comments") {
      filtered.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
    }

    // 필터링된 전체 일기 저장
    setFilteredDiaries(filtered);
    // 페이지네이션 적용
    setDiaries(filtered.slice(0, displayCount));
    setIsFilteringDiaries(false);
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

    return <div className="rounded-lg p-4">{dateRows}</div>;
  };

  const handlePrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    
    // selectedDate도 같이 이동 (같은 날짜로, 없으면 월의 마지막 날로)
    if (selectedDate) {
      const newDate = new Date(newMonth);
      const maxDay = endOfMonth(newMonth).getDate();
      const targetDay = Math.min(selectedDate.getDate(), maxDay);
      newDate.setDate(targetDay);
      setSelectedDate(newDate);
    }
  };

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    
    // selectedDate도 같이 이동 (같은 날짜로, 없으면 월의 마지막 날로)
    if (selectedDate) {
      const newDate = new Date(newMonth);
      const maxDay = endOfMonth(newMonth).getDate();
      const targetDay = Math.min(selectedDate.getDate(), maxDay);
      newDate.setDate(targetDay);
      setSelectedDate(newDate);
    }
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

  const handleDeleteDiary = async () => {
    if (diaries.length === 0) return;
    
    const diaryId = diaries[0].id;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.id !== diaries[0].user_id) {
      toast({
        title: "삭제 권한이 없습니다",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("diaries")
      .delete()
      .eq("id", diaryId);

    if (!error) {
      toast({
        title: "일기가 삭제되었습니다",
      });
      setShowDeleteDialog(false);
      // 캐시 초기화
      const monthKey = format(currentMonth, 'yyyy-MM');
      const cacheKey = `home_data_${user.id}_${monthKey}`;
      const cacheTimeKey = `home_data_time_${user.id}_${monthKey}`;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(cacheTimeKey);
      // 데이터 다시 가져오기
      fetchMonthData();
    } else {
      toast({
        title: "삭제에 실패했습니다",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <LoadingBar />;
  }

  return (
    <div className="min-h-screen gradient-soft">
      <div className="max-w-4xl mx-auto pb-24">
        <div className="bg-background shadow-lg md:max-w-2xl md:mx-auto rounded-t-none rounded-b-lg px-6 pt-8 pb-6">
          <div className={cn(
            "flex items-center justify-center relative",
            isCalendarExpanded ? "mb-6" : "mb-0"
          )}>
            <div className="flex items-center gap-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="h-8 w-6 text-muted-foreground opacity-30 relative p-0 hover:bg-transparent hover:text-primary hover:opacity-100 transition-all"
              >
                <ChevronLeft className="h-4 w-4 absolute left-0.5" />
                <ChevronLeft className="h-4 w-4 absolute left-2" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevDay}
                className="h-8 w-7 p-0 -ml-1 hover:bg-transparent hover:text-primary transition-colors"
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
                className="h-8 w-7 p-0 -mr-1 hover:bg-transparent hover:text-primary transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-6 text-muted-foreground opacity-30 relative p-0 hover:bg-transparent hover:text-primary hover:opacity-100 transition-all"
              >
                <ChevronRight className="h-4 w-4 absolute right-2" />
                <ChevronRight className="h-4 w-4 absolute right-0.5" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
              className="rounded-full absolute right-0 hover:bg-accent group"
            >
              {isCalendarExpanded ? (
                <ChevronUp className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
              ) : (
                <ChevronDown className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
              )}
            </Button>
          </div>
          {isCalendarExpanded && renderCalendar()}
        </div>

        <div className="p-2 sm:p-4 space-y-4">
        {viewMode === "my" && hasAnyDiary === false ? (
          <div className="px-2 sm:px-0 flex items-center justify-center min-h-[60vh]">
            <div className="text-center flex flex-col items-center">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-16 w-auto object-contain mb-6"
              />
              <p className="text-muted-foreground mb-6 text-base">
                첫 일기를 작성해 보세요!
              </p>
              <Button
                onClick={() => navigate("/upload")}
                size="lg"
                className="rounded-full gap-2 shadow-medium"
              >
                <Pencil className="h-5 w-5" />
                일기 쓰기
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn("px-2 sm:px-0", diaries.length === 0 ? "flex items-center justify-center min-h-[60vh]" : "space-y-3")}>
            {loading || isFilteringDiaries ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <LoadingBar />
              </div>
            ) : viewMode === "my" && !hasDiaryOnSelectedDate ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center flex flex-col items-center">
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="h-16 w-auto object-contain mb-6"
                  />
                  <p className="text-muted-foreground mb-6 text-base">
                    선택한 날짜에 작성한 일기가 없습니다.
                  </p>
                  <Button
                    onClick={() => navigate("/upload")}
                    size="lg"
                    className="rounded-full gap-2 shadow-medium"
                  >
                    <Pencil className="h-5 w-5" />
                    일기 쓰기
                  </Button>
                </div>
              </div>
            ) : diaries.length === 0 ? (
              <div className="text-center flex flex-col items-center">
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="h-16 w-auto object-contain mb-6"
                />
                <p className="text-muted-foreground mb-6 text-base">
                  {viewMode === "my"
                    ? "선택한 날짜에 작성한 일기가 없습니다."
                    : "공개된 일기가 없습니다."}
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
            ) : viewMode === "my" ? (
              <>
                <Card className="shadow-medium overflow-hidden">
              <CardContent className="p-0">
                {/* Photos Carousel */}
                {diaries[0].photos && diaries[0].photos.length > 0 && (
                  <div className="aspect-[4/3] bg-muted relative">
                    <Carousel className="w-full h-full" opts={{ loop: true }}>
                      <CarouselContent>
                        {diaries[0].photos.map((photo: any, index: number) => (
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
                      {diaries[0].photos.length > 1 && (
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
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(diaries[0].created_at), "yyyy년 M월 d일 (EEE) a h:mm", { locale: ko })}
                      </div>
                      {diaries[0].weather && (
                        <span className="text-xl">
                          {(() => {
                            const weatherEmojis: Record<string, string> = {
                              sunny: '☀️',
                              partly_cloudy: '⛅',
                              cloudy: '☁️',
                              rainy: '🌧️',
                              stormy: '⛈️',
                              snowy: '🌨️'
                            };
                            return weatherEmojis[diaries[0].weather] || diaries[0].weather;
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {diaries[0].title && (
                    <>
                      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        {diaries[0].title}
                        {diaries[0].emoji && (
                          <span className="text-2xl">{diaries[0].emoji}</span>
                        )}
                      </h2>
                      {diaries[0].perspective && diaries[0].photos && diaries[0].photos.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          #{(() => {
                            const perspectiveMap: Record<string, string> = {
                              camera: "내 핸드폰의 시점",
                              pet: "애완동물의 시점",
                              friend: "친구의 시점",
                              family: "가족의 시점",
                              stranger: "낯선 사람의 시점",
                              old_man: "동네 꼰대의 시점",
                              future: "미래의 나의 시점"
                            };
                            return perspectiveMap[diaries[0].perspective] || diaries[0].perspective;
                          })()}
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="prose prose-sm max-w-none text-base text-foreground/70">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {diaries[0].content}
                    </p>
                  </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLike}
                      className={cn(
                        "gap-2 rounded-full h-9 px-3",
                        isLiked ? "text-red-500 hover:text-red-600" : "text-muted-foreground"
                      )}
                    >
                      <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                      <span className="text-sm">{likes.length}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowComments(!showComments);
                      }}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground h-9 px-3 rounded-full"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="text-sm">{comments.length}</span>
                    </Button>
                  </div>

                  {/* Edit/Delete Buttons - 본인의 일기일 경우에만 표시 */}
                  {currentUserId === diaries[0].user_id && (
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(`/upload/${diaries[0].id}`)} 
                        className="rounded-full h-9 w-9"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setShowDeleteDialog(true)}
                        className="rounded-full h-9 w-9 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {showComments && (
                  <>
                    {comments.length > 0 && (
                      <div className="space-y-4 pt-2">
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

                    <div className="pt-2">
                      <div className="relative">
                        <Input
                          placeholder="댓글을 입력하세요..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="pr-12 h-11 text-sm placeholder:text-sm"
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
                  </>
                )}
              </div>
            </CardContent>
              </Card>
              
              {/* 검색 영역 */}
              <div className="px-2 sm:px-0 pt-4 pb-2">
                <div className="flex items-center gap-2">
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
                    <PopoverContent className="w-48 p-2 bg-background" align="end">
                      <div className="space-y-1">
                        <Button
                          variant={sortBy === "latest" ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start rounded-full text-sm h-8"
                          onClick={() => {
                            setSortBy("latest");
                            toast({
                              title: "최신순 정렬",
                            });
                          }}
                        >
                          <Clock className="h-3.5 w-3.5 mr-2" />
                          최신순
                        </Button>
                        <Button
                          variant={sortBy === "oldest" ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start rounded-full text-sm h-8"
                          onClick={() => {
                            setSortBy("oldest");
                            toast({
                              title: "오래된순 정렬",
                            });
                          }}
                        >
                          <Clock className="h-3.5 w-3.5 mr-2" />
                          오래된순
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
                        <div className="bg-background/90 rounded-full w-9 h-9 flex items-center justify-center shadow-sm border border-border">
                          {selectedEmoji ? (
                            <span className="text-lg">{selectedEmoji}</span>
                          ) : (
                            <Smile className="h-4 w-4" />
                          )}
                        </div>
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
              </div>
              
              {/* 나머지 일기들 */}
              {diaries.length > 1 && (
                <div className="space-y-3">
                  {diaries.slice(1).map((diary) => (
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
              )}
            </>
          ) : (
            <>
              {/* 검색 영역 - 공개 일기 */}
              <div className="px-2 sm:px-0 pb-2">
                <div className="flex items-center gap-2">
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
                    <PopoverContent className="w-48 p-2 bg-background" align="end">
                      <div className="space-y-1">
                        <Button
                          variant={sortBy === "latest" ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start rounded-full text-sm h-8"
                          onClick={() => {
                            setSortBy("latest");
                            toast({
                              title: "최신순 정렬",
                            });
                          }}
                        >
                          <Clock className="h-3.5 w-3.5 mr-2" />
                          최신순
                        </Button>
                        <Button
                          variant={sortBy === "oldest" ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start rounded-full text-sm h-8"
                          onClick={() => {
                            setSortBy("oldest");
                            toast({
                              title: "오래된순 정렬",
                            });
                          }}
                        >
                          <Clock className="h-3.5 w-3.5 mr-2" />
                          오래된순
                        </Button>
                        <Button
                          variant={sortBy === "likes" ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start rounded-full text-sm h-8"
                          onClick={() => {
                            setSortBy("likes");
                            toast({
                              title: "좋아요순 정렬",
                            });
                          }}
                        >
                          <Heart className="h-3.5 w-3.5 mr-2" />
                          좋아요순
                        </Button>
                        <Button
                          variant={sortBy === "comments" ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start rounded-full text-sm h-8"
                          onClick={() => {
                            setSortBy("comments");
                            toast({
                              title: "댓글순 정렬",
                            });
                          }}
                        >
                          <MessageCircle className="h-3.5 w-3.5 mr-2" />
                          댓글순
                        </Button>
                        <Button
                          variant={sortBy === "friends" ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start rounded-full text-sm h-8"
                          onClick={() => {
                            setSortBy("friends");
                            toast({
                              title: "친구순 정렬",
                            });
                          }}
                        >
                          <Users className="h-3.5 w-3.5 mr-2" />
                          친구순
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
                        <div className="bg-background/90 rounded-full w-9 h-9 flex items-center justify-center shadow-sm border border-border">
                          {selectedEmoji ? (
                            <span className="text-lg">{selectedEmoji}</span>
                          ) : (
                            <Smile className="h-4 w-4" />
                          )}
                        </div>
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
              </div>
              
            <div className="space-y-3">
              {diaries.map((diary) => (
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
            </>
          )}

          {/* 더 불러오기 버튼 */}
          {filteredDiaries.length > displayCount && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => setDisplayCount(prev => prev + 30)}
                className="rounded-full"
              >
                더 불러오기 ({filteredDiaries.length - displayCount}개 남음)
              </Button>
            </div>
          )}
          </div>
        )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일기를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 취소할 수 없습니다. 일기가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDiary} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}