import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Calendar, Heart, FileText } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type Diary = {
  id: string;
  content: string;
  created_at: string;
  tone: string;
  length: string;
  emoji: string;
  photos: { photo_url: string }[];
};

export default function Diaries() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [filteredDiaries, setFilteredDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [emotionFilter, setEmotionFilter] = useState("all");
  const [lengthFilter, setLengthFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchDiaries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [diaries, searchQuery, emotionFilter, lengthFilter, sortBy]);

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
          photo_url
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching diaries:", error);
    } else if (data) {
      setDiaries(data);
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

    // 길이 필터
    if (lengthFilter !== "all") {
      filtered = filtered.filter(diary => diary.length === lengthFilter);
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
          <CardContent className="p-4 space-y-3">
            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="일기 내용 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* 필터 탭 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  감정
                </label>
                <Select value={emotionFilter} onValueChange={setEmotionFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="happy">기쁨 😊</SelectItem>
                    <SelectItem value="sad">슬픔 😢</SelectItem>
                    <SelectItem value="angry">화남 😠</SelectItem>
                    <SelectItem value="calm">평온 😌</SelectItem>
                    <SelectItem value="excited">신남 🤩</SelectItem>
                    <SelectItem value="anxious">불안 😰</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  길이
                </label>
                <Select value={lengthFilter} onValueChange={setLengthFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="short">짧게</SelectItem>
                    <SelectItem value="medium">중간</SelectItem>
                    <SelectItem value="long">길게</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  정렬
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">최신순</SelectItem>
                    <SelectItem value="oldest">오래된순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 일기 리스트 */}
        <div className="space-y-3">
          {filteredDiaries.length === 0 ? (
            <Card className="shadow-medium">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery || emotionFilter !== "all" || lengthFilter !== "all"
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
                className="shadow-medium hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/diary/${diary.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* 썸네일 */}
                    {diary.photos && diary.photos.length > 0 && (
                      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted">
                        <img
                          src={diary.photos[0].photo_url}
                          alt="일기 사진"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* 내용 */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {diary.emoji && (
                            <span className="text-2xl">{diary.emoji}</span>
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(diary.created_at), "yyyy년 M월 d일 (E)", { locale: ko })}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                                {getEmotionLabel(diary.tone)}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                                {getLengthLabel(diary.length)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
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
