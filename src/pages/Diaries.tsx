import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Calendar, Heart, FileText, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type Diary = {
  id: string;
  content: string;
  created_at: string;
  tone: string;
  emoji: string;
  photos: { photo_url: string }[];
};

export default function Diaries() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [filteredDiaries, setFilteredDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [emotionFilter, setEmotionFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
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
    } else if (data) {
      // 각 일기의 사진들을 display_order로 정렬
      const diariesWithSortedPhotos = data.map(diary => ({
        ...diary,
        photos: diary.photos?.sort((a: any, b: any) => a.display_order - b.display_order) || []
      }));
      setDiaries(diariesWithSortedPhotos);
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
                    : "아직 작성된 일기가 없습니다."}
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
              <Card
                key={diary.id}
                className="shadow-medium hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigate(`/diary/${diary.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* 썸네일 또는 이모티콘 */}
                    <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted relative flex items-center justify-center">
                      {diary.photos && diary.photos.length > 0 ? (
                        <>
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
                        </>
                      ) : (
                        diary.emoji && (
                          <div className="text-3xl">
                            {diary.emoji}
                          </div>
                        )
                      )}
                    </div>

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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
