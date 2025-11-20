import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen, Trash2 } from "lucide-react";
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

interface Notebook {
  id: string;
  name: string;
  user_id: string;
  visibility: string;
  is_default: boolean;
  created_at: string;
}

interface NotebookWithProfile extends Notebook {
  profile?: {
    name: string | null;
    email: string | null;
  };
}

export default function AdminNotebooks() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [notebooks, setNotebooks] = useState<NotebookWithProfile[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notebookToDelete, setNotebookToDelete] = useState<string | null>(null);

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

    fetchNotebooks();
  };

  const fetchNotebooks = async () => {
    setLoading(true);
    const { data: notebooksData, error } = await supabase
      .from("notebooks")
      .select("id, name, user_id, visibility, is_default, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast({
        title: "일기장 목록 조회 실패",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(notebooksData.map(n => n.user_id))];
    
    // Fetch profiles for these users
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, name, email")
      .in("user_id", userIds);

    // Map profiles to notebooks
    const notebooksWithProfiles = notebooksData.map(notebook => ({
      ...notebook,
      profile: profilesData?.find(p => p.user_id === notebook.user_id),
    }));

    setNotebooks(notebooksWithProfiles);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!notebookToDelete) return;

    const { error } = await supabase
      .from("notebooks")
      .delete()
      .eq("id", notebookToDelete);

    if (error) {
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "삭제 완료",
        description: "일기장이 삭제되었습니다.",
      });
      fetchNotebooks();
    }
    setDeleteDialogOpen(false);
    setNotebookToDelete(null);
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
              <h1 className="text-3xl font-bold">일기장 관리</h1>
              <p className="text-muted-foreground">전체 일기장을 확인하고 관리합니다</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              전체 일기장 목록
            </CardTitle>
            <CardDescription>총 {notebooks.length}개의 일기장 (최근 100개)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>일기장 이름</TableHead>
                    <TableHead>소유자</TableHead>
                    <TableHead>공개 설정</TableHead>
                    <TableHead>생성일</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notebooks.map((notebook) => (
                    <TableRow key={notebook.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {notebook.name}
                          {notebook.is_default && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                              기본
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {notebook.profile?.name || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {notebook.profile?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            notebook.visibility === "public"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {notebook.visibility === "public" ? "공개" : "비공개"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(notebook.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (notebook.is_default) {
                              toast({
                                title: "삭제 불가",
                                description: "기본 일기장은 삭제할 수 없습니다.",
                                variant: "destructive",
                              });
                              return;
                            }
                            setNotebookToDelete(notebook.id);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={notebook.is_default}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
            <AlertDialogTitle>일기장 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 일기장을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
