import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Calendar, Heart, FileText, ArrowUpDown } from "lucide-react";
import DiaryCard from "@/components/DiaryCard";

type Diary = {
  id: string;
  content: string;
  created_at: string;
  tone: string;
  emoji: string;
  photos: { photo_url: string }[];
  photo?: { photo_url: string } | null;
  user_id: string;
  author_name?: string | null;
};

export default function Diaries() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [filteredDiaries, setFilteredDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [emotionFilter, setEmotionFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchDiaries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [diaries, searchQuery, emotionFilter, sortBy]);

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

    // 캐시된 데이터 확인
    const cacheKey = `diaries_${user.id}`;
    const cacheTimeKey = `diaries_time_${user.id}`;
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);
    const cacheAge = cachedTime ? Date.now() - parseInt(cachedTime) : Infinity;
    const CACHE_DURATION = 5 * 60 * 1000; // 5분

    // 캐시가 유효하면 먼저 보여주기
    if (cachedData && cacheAge < CACHE_DURATION) {
      try {
        const parsed = JSON.parse(cachedData);
        setDiaries(parsed || []);
        setLoading(false);
        return;
      } catch (e) {
        console.error('Cache parse error:', e);
      }
    }

    setLoading(true);

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
    } else if (data) {
      // 각 일기의 사진들을 display_order로 정렬하고, photo_id 방식도 포함
      const diariesWithSortedPhotos = data.map((diary: any) => {
        let allPhotos = [];
        
        // 새 방식: diary_id로 연결된 사진들
        if (diary.photos && diary.photos.length > 0) {
          allPhotos = diary.photos.sort((a: any, b: any) => a.display_order - b.display_order);
        }
        // 오래된 방식: photo_id로 연결된 사진
        else if (diary.photo) {
          allPhotos = [diary.photo];
        }
        
        return {
          ...diary,
          photos: allPhotos
        };
      });
      setDiaries(diariesWithSortedPhotos);
      
      // 데이터 캐싱
      try {
        localStorage.setItem(cacheKey, JSON.stringify(diariesWithSortedPhotos));
        localStorage.setItem(cacheTimeKey, Date.now().toString());
      } catch (e) {
        console.error('Cache save error:', e);
      }
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...diaries];

    // 검색 필터
    if (searchQuery) {
      filtered = filtered.filter(diary =>
        diary.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 감정 필터
    if (emotionFilter !== "all") {
      filtered = filtered.filter(diary => diary.tone === emotionFilter);
    }

    // 정렬
    if (sortBy === "latest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    setFilteredDiaries(filtered);
  };

  const getEmotionLabel = (emotion: string) => {
    const emotions: Record<string, string> = {
      happy: "기쁨 😊",
      sad: "슬픔 😢",
      angry: "화남 😠",
      calm: "평온 😌",
      excited: "신남 🤩",
      anxious: "불안 😰",
    };
    return emotions[emotion] || emotion;
  };

  const getLengthLabel = (length: string) => {
    const lengths: Record<string, string> = {
      short: "짧게",
      medium: "중간",
      long: "길게",
    };
    return lengths[length] || length;
  };


  if (loading) {
    return (
      <div className="min-h-screen gradient-soft flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">일기를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-soft p-4">
      <div className="max-w-4xl mx-auto pt-6 space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">나의 일기</h1>
          <p className="text-muted-foreground text-sm">
            총 {filteredDiaries.length}개의 일기
          </p>
        </div>

        {/* 검색 및 필터 */}
        <Card className="shadow-medium">
          <CardContent className="p-4">
            {/* 한 줄에 검색 / 감정 / 정렬 */}
            <div className="flex gap-2">
              {/* 검색 - 가장 넓게 */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* 감정 필터 - 아이콘만 */}
              <Select value={emotionFilter} onValueChange={setEmotionFilter}>
                <SelectTrigger className="w-[50px] px-0 justify-center">
                  <Heart className="h-4 w-4" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 감정</SelectItem>
                  <SelectItem value="happy">😊 기쁨</SelectItem>
                  <SelectItem value="sad">😢 슬픔</SelectItem>
                  <SelectItem value="angry">😠 화남</SelectItem>
                  <SelectItem value="calm">😌 평온</SelectItem>
                  <SelectItem value="excited">🤩 신남</SelectItem>
                  <SelectItem value="anxious">😰 불안</SelectItem>
                </SelectContent>
              </Select>

              {/* 정렬 - 아이콘 버튼 */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortBy(sortBy === "latest" ? "oldest" : "latest")}
                title={sortBy === "latest" ? "최신순" : "오래된순"}
                className="shrink-0"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 일기 리스트 */}
        <div className="space-y-3">
          {filteredDiaries.length === 0 ? (
            <Card className="shadow-medium">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery || emotionFilter !== "all"
                    ? "검색 조건에 맞는 일기가 없습니다."
                    : "첫 일기를 작성해 보세요!"}
                </p>
                <Button
                  onClick={() => navigate("/upload")}
                  className="mt-4"
                >
                  첫 일기 작성하기
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredDiaries.map((diary) => (
              <DiaryCard
                key={diary.id}
                diary={diary}
                onClick={() => navigate(`/diary/${diary.id}`)}
                showTime={true}
                imageSize="md"
                currentUserId={currentUserId}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
