import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Calendar, Heart, FileText, Trash2 } from "lucide-react";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [diaryToDelete, setDiaryToDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleDeleteClick = (e: React.MouseEvent, diaryId: string) => {
    e.stopPropagation();
    setDiaryToDelete(diaryId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!diaryToDelete) return;

    try {
      // 일기에 연결된 사진들 먼저 삭제
      const { data: photos } = await supabase
        .from("photos")
        .select("photo_url")
        .eq("diary_id", diaryToDelete);

      if (photos) {
        for (const photo of photos) {
          const fileName = photo.photo_url.split("/").slice(-2).join("/");
          await supabase.storage.from("photos").remove([fileName]);
        }
      }

      // 사진 레코드 삭제
      await supabase.from("photos").delete().eq("diary_id", diaryToDelete);

      // 일기장 연결 삭제
      await supabase.from("diary_notebooks").delete().eq("diary_id", diaryToDelete);

      // 일기 삭제
      const { error } = await supabase
        .from("diaries")
        .delete()
        .eq("id", diaryToDelete);

      if (error) throw error;

      toast({
        title: "일기가 삭제되었습니다",
      });

      // 목록에서 제거
      setDiaries(prev => prev.filter(d => d.id !== diaryToDelete));
      setDeleteDialogOpen(false);
      setDiaryToDelete(null);
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    }
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
                className="shadow-medium hover:shadow-lg transition-shadow cursor-pointer group"
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
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {diary.emoji && (
                            <span className="text-2xl flex-shrink-0">{diary.emoji}</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {format(new Date(diary.created_at), "yyyy년 M월 d일 (E)", { locale: ko })}
                            </p>
                            <span className="text-xs px-2 py-0.5 bg-secondary rounded inline-block mt-1">
                              {getEmotionLabel(diary.tone)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive flex-shrink-0"
                          onClick={(e) => handleDeleteClick(e, diary.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="mx-4">
            <AlertDialogHeader>
              <AlertDialogTitle>일기를 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                이 작업은 되돌릴 수 없습니다. 일기와 관련된 모든 사진이 영구적으로 삭제됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto order-2 sm:order-1">
                취소
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="w-full sm:w-auto order-1 sm:order-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
