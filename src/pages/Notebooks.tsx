import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Plus, Trash2, Users } from "lucide-react";
import LoadingBar from "@/components/LoadingBar";

export default function Notebooks() {
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVisibility, setNewVisibility] = useState<"private" | "shared" | "public">("shared");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchNotebooks();
  }, []);

  const fetchNotebooks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("notebooks")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at");

    if (error) {
      console.error("Error fetching notebooks:", error);
      toast({
        title: "일기장 로딩 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNotebooks(data || []);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (creating) return;

    if (!newName.trim()) {
      toast({
        title: "이름을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    if (notebooks.length >= 5) {
      toast({
        title: "일기장 개수 초과",
        description: "최대 5개까지만 만들 수 있어요.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }

    const { error } = await supabase
      .from("notebooks")
      .insert({
        user_id: user.id,
        name: newName.trim(),
        visibility: newVisibility,
        is_default: false,
      });

    setCreating(false);

    if (error) {
      toast({
        title: "일기장 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "일기장이 생성되었어요!",
      });
      setNewName("");
      setNewVisibility("shared");
      setIsDialogOpen(false);
      fetchNotebooks();
    }
  };

  const handleDelete = async (notebookId: string, isDefault: boolean) => {
    if (isDefault) {
      toast({
        title: "기본 일기장은 삭제할 수 없어요",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("notebooks")
      .delete()
      .eq("id", notebookId);

    if (error) {
      toast({
        title: "일기장 삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "일기장이 삭제되었어요",
      });
      fetchNotebooks();
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case "private": return "🔒 나만 보기";
      case "shared": return "👥 공유";
      case "public": return "🌍 전체 공개";
      default: return visibility;
    }
  };

  if (loading) {
    return <LoadingBar />;
  }

  return (
    <div className="min-h-screen gradient-soft p-3 sm:p-4">
      <div className="max-w-4xl mx-auto pt-4 sm:pt-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">내 일기장</h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">일기장을 관리하고 공유하세요</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={notebooks.length >= 5} className="w-full sm:w-auto text-sm sm:text-base">
                <Plus className="mr-2 h-4 w-4" />
                새 일기장
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-md mx-2 sm:mx-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">새 일기장 만들기</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  새로운 일기장을 만들어보세요. 최대 5개까지 만들 수 있어요.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">일기장 이름</Label>
                  <Input
                    id="name"
                    placeholder="예: 여행 일기"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visibility">공개 설정</Label>
                  <Select value={newVisibility} onValueChange={(v: any) => setNewVisibility(v)}>
                    <SelectTrigger id="visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">🔒 나만 보기</SelectItem>
                      <SelectItem value="shared">👥 특정 사람과 공유</SelectItem>
                      <SelectItem value="public">🌍 전체 공개</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)} 
                  className="w-full sm:w-auto text-sm sm:text-base order-2 sm:order-1"
                  disabled={creating}
                >
                  취소
                </Button>
                <Button 
                  onClick={handleCreate} 
                  className="w-full sm:w-auto text-sm sm:text-base order-1 sm:order-2"
                  disabled={creating}
                >
                  {creating ? "만드는 중..." : "만들기"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {notebooks.length >= 5 && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-3 sm:p-4 sm:pt-6">
              <p className="text-xs sm:text-sm text-amber-800">
                일기장을 최대 5개까지 만들었어요. 더 만들려면 기존 일기장을 삭제해주세요.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {notebooks.map((notebook) => (
            <Card key={notebook.id} className="shadow-sm">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 sm:mt-0.5 text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base sm:text-lg truncate">{notebook.name}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {getVisibilityLabel(notebook.visibility)}
                        {notebook.is_default && " • 기본"}
                      </CardDescription>
                    </div>
                  </div>
                  {!notebook.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
                      onClick={() => handleDelete(notebook.id, notebook.is_default)}
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              {notebook.visibility === "shared" && (
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                  <Button variant="outline" size="sm" className="w-full text-xs sm:text-sm">
                    <Users className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    멤버 관리
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <Button 
          variant="outline" 
          onClick={() => navigate("/")} 
          className="w-full sm:w-auto rounded-full text-sm sm:text-base"
        >
          ← 홈으로 돌아가기
        </Button>
      </div>
    </div>
  );
}
