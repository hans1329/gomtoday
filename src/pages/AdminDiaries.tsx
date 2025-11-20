import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen, Trash2, Eye } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface Diary {
  id: string;
  title: string | null;
  content: string;
  user_id: string;
  created_at: string;
  status: string;
}

interface DiaryWithProfile extends Diary {
  profile?: {
    name: string | null;
    email: string | null;
  };
  is_public?: boolean;
}

export default function AdminDiaries() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [diaries, setDiaries] = useState<DiaryWithProfile[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [diaryToDelete, setDiaryToDelete] = useState<string | null>(null);

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) {
      toast({
        title: "접근 권한 없음",
        description: "관리자만 접근할 수 있습니다.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    fetchDiaries();
  };

  const fetchDiaries = async () => {
    setLoading(true);
    const { data: diariesData, error } = await supabase
      .from("diaries")
      .select("id, title, content, user_id, created_at, status")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast({
        title: "일기 목록 조회 실패",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(diariesData.map(d => d.user_id))];
    
    // Fetch profiles for these users
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, name, email")
      .in("user_id", userIds);

    // Get diary visibility through notebooks
    const diaryIds = diariesData.map(d => d.id);
    const { data: diaryNotebooks } = await supabase
      .from("diary_notebooks")
      .select("diary_id, notebooks(visibility)")
      .in("diary_id", diaryIds);

    // Check if each diary is public (exists in at least one public notebook)
    const publicDiaryIds = new Set(
      diaryNotebooks
        ?.filter(dn => (dn.notebooks as any)?.visibility === 'public')
        .map(dn => dn.diary_id) || []
    );

    // Map profiles and visibility to diaries
    const diariesWithProfiles = diariesData.map(diary => ({
      ...diary,
      profile: profilesData?.find(p => p.user_id === diary.user_id),
      is_public: publicDiaryIds.has(diary.id),
    }));

    setDiaries(diariesWithProfiles);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!diaryToDelete) return;

    const { error } = await supabase
      .from("diaries")
      .delete()
      .eq("id", diaryToDelete);

    if (error) {
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "삭제 완료",
        description: "일기가 삭제되었습니다.",
      });
      fetchDiaries();
    }
    setDeleteDialogOpen(false);
    setDiaryToDelete(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">일기 관리</h1>
              <p className="text-muted-foreground">전체 일기를 확인하고 관리합니다</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              전체 일기 목록
            </CardTitle>
            <CardDescription>총 {diaries.length}개의 일기 (최근 100개)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제목</TableHead>
                      <TableHead>작성자</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>공개설정</TableHead>
                      <TableHead>작성일</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {diaries.map((diary) => (
                    <TableRow key={diary.id}>
                      <TableCell className="font-medium max-w-xs truncate">
                        {diary.title || diary.content.substring(0, 50) + "..."}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {diary.profile?.name || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {diary.profile?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            diary.status === "published"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {diary.status === "published" ? "게시됨" : "작성중"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            diary.is_public
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {diary.is_public ? "공개" : "비공개"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(diary.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/diary/${diary.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDiaryToDelete(diary.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>일기 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 일기를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
