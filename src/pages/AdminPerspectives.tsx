import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Perspective {
  id: string;
  perspective_key: string;
  label: string;
  cost: number;
  display_order: number;
  is_active: boolean;
  is_new: boolean;
  prompt_template: string | null;
}

export default function AdminPerspectives() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [perspectives, setPerspectives] = useState<Perspective[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPerspective, setEditingPerspective] = useState<Perspective | null>(null);
  const [perspectiveToDelete, setPerspectiveToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    perspective_key: "",
    label: "",
    cost: 1,
    display_order: 0,
    is_active: true,
    is_new: false,
    prompt_template: "",
  });

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

    fetchPerspectives();
  };

  const fetchPerspectives = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("perspectives")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast({
        title: "시점 목록 조회 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setPerspectives(data || []);
    }
    setLoading(false);
  };

  const handleOpenDialog = (perspective?: Perspective) => {
    if (perspective) {
      setEditingPerspective(perspective);
      setFormData({
        perspective_key: perspective.perspective_key,
        label: perspective.label,
        cost: perspective.cost,
        display_order: perspective.display_order,
        is_active: perspective.is_active,
        is_new: perspective.is_new,
        prompt_template: perspective.prompt_template || "",
      });
    } else {
      setEditingPerspective(null);
      setFormData({
        perspective_key: "",
        label: "",
        cost: 1,
        display_order: perspectives.length,
        is_active: true,
        is_new: false,
        prompt_template: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.perspective_key || !formData.label) {
      toast({
        title: "입력 오류",
        description: "시점 키와 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (editingPerspective) {
      const { error } = await supabase
        .from("perspectives")
        .update(formData)
        .eq("id", editingPerspective.id);

      if (error) {
        toast({
          title: "시점 수정 실패",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "시점 수정 완료",
          description: "시점 정보가 수정되었습니다.",
        });
        setDialogOpen(false);
        fetchPerspectives();
      }
    } else {
      const { error } = await supabase
        .from("perspectives")
        .insert([formData]);

      if (error) {
        toast({
          title: "시점 추가 실패",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "시점 추가 완료",
          description: "새로운 시점이 추가되었습니다.",
        });
        setDialogOpen(false);
        fetchPerspectives();
      }
    }
  };

  const handleDelete = async () => {
    if (!perspectiveToDelete) return;

    const { error } = await supabase
      .from("perspectives")
      .delete()
      .eq("id", perspectiveToDelete);

    if (error) {
      toast({
        title: "시점 삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "시점 삭제 완료",
        description: "시점이 삭제되었습니다.",
      });
      setDeleteDialogOpen(false);
      setPerspectiveToDelete(null);
      fetchPerspectives();
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">시점 관리</h1>
              <p className="text-muted-foreground mt-1">
                일기 작성 시점과 비용을 관리합니다
              </p>
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()} className="rounded-full">
            <Plus className="mr-2 h-4 w-4" />
            새 시점 추가
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {perspectives.map((perspective) => (
            <Card key={perspective.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{perspective.label}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(perspective)}
                      className="rounded-full h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setPerspectiveToDelete(perspective.id);
                        setDeleteDialogOpen(true);
                      }}
                      className="rounded-full h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">키: </span>
                  <code className="bg-muted px-2 py-1 rounded">{perspective.perspective_key}</code>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">비용: </span>
                  <span className="font-semibold">{perspective.cost}개</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">순서: </span>
                  <span>{perspective.display_order}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">상태: </span>
                  <span className={perspective.is_active ? "text-green-600" : "text-red-600"}>
                    {perspective.is_active ? "활성" : "비활성"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>
              {editingPerspective ? "시점 수정" : "새 시점 추가"}
            </DialogTitle>
            <DialogDescription>
              일기 작성 시점의 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="perspective_key">시점 키 (영문)</Label>
              <Input
                id="perspective_key"
                value={formData.perspective_key}
                onChange={(e) =>
                  setFormData({ ...formData, perspective_key: e.target.value })
                }
                placeholder="예: my_view"
                disabled={!!editingPerspective}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">시점 이름 (한글)</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                placeholder="예: 나의 시선"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">연필 비용 (개수)</Label>
              <Input
                id="cost"
                type="number"
                min="1"
                value={formData.cost}
                onChange={(e) =>
                  setFormData({ ...formData, cost: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_order">표시 순서</Label>
              <Input
                id="display_order"
                type="number"
                min="0"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt_template">프롬프트 템플릿</Label>
              <Textarea
                id="prompt_template"
                value={formData.prompt_template}
                onChange={(e) =>
                  setFormData({ ...formData, prompt_template: e.target.value })
                }
                placeholder="예: 나의 시선으로, 내가 직접 경험하고 느낀 것을 1인칭 시점에서 서술합니다."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
              <Label htmlFor="is_active">활성화</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_new"
                checked={formData.is_new}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_new: checked })
                }
              />
              <Label htmlFor="is_new">NEW 뱃지 표시</Label>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-full w-full sm:w-auto"
            >
              취소
            </Button>
            <Button onClick={handleSave} className="rounded-full w-full sm:w-auto">
              {editingPerspective ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>시점 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 시점을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-full w-full sm:w-auto">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-full w-full sm:w-auto"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
