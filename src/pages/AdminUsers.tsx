import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Users, UserCircle, Ban, CheckCircle, Trash2, Shield } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserWithRole {
  user_id: string;
  name: string | null;
  email: string | null;
  profile_photo_url: string | null;
  created_at: string | null;
  role: "admin" | "user" | null;
  banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  pencil_count: number;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, totalDiaries: 0, totalNotebooks: 0 });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pencilDialogOpen, setPencilDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; currentCount: number } | null>(null);
  const [newPencilCount, setNewPencilCount] = useState("");

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
      .single();

    if (!roles) {
      toast({
        title: "접근 권한 없음",
        description: "관리자만 접근할 수 있습니다.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    fetchUsers();
    fetchStats();
    setLoading(false);
  };

  const fetchStats = async () => {
    const [usersRes, diariesRes, notebooksRes] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("diaries").select("*", { count: "exact", head: true }),
      supabase.from("notebooks").select("*", { count: "exact", head: true })
    ]);

    setStats({
      totalUsers: usersRes.count || 0,
      totalDiaries: diariesRes.count || 0,
      totalNotebooks: notebooksRes.count || 0
    });
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, name, email, profile_photo_url, created_at, banned, banned_at, banned_reason, pencil_count")
      .order("created_at", { ascending: false });

    if (profilesError) {
      toast({
        title: "사용자 목록 불러오기 실패",
        description: profilesError.message,
        variant: "destructive",
      });
      setLoadingUsers(false);
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      toast({
        title: "역할 정보 불러오기 실패",
        description: rolesError.message,
        variant: "destructive",
      });
      setLoadingUsers(false);
      return;
    }

    const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
      const userRole = roles?.find((r) => r.user_id === profile.user_id);
      return {
        ...profile,
        role: userRole?.role || "user",
      };
    });

    setUsers(usersWithRoles);
    setLoadingUsers(false);
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "user") => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "역할 변경 실패",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "역할 변경 완료!",
      description: `사용자 역할이 ${newRole}로 변경되었습니다.`,
    });

    fetchUsers();
  };

  const handleBanUser = async (userId: string, currentBanStatus: boolean) => {
    const newBanStatus = !currentBanStatus;
    
    const { error } = await supabase
      .from("profiles")
      .update({ 
        banned: newBanStatus,
        banned_at: newBanStatus ? new Date().toISOString() : null,
        banned_reason: newBanStatus ? "관리자에 의해 제한됨" : null
      })
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "상태 변경 실패",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: newBanStatus ? "사용자 밴 완료" : "밴 해제 완료",
      description: newBanStatus 
        ? "해당 사용자는 더 이상 앱을 사용할 수 없습니다." 
        : "해당 사용자의 계정이 복구되었습니다.",
    });

    fetchUsers();
  };

  const handleOpenPencilDialog = (userId: string, userName: string, currentCount: number) => {
    setSelectedUser({ id: userId, name: userName, currentCount });
    setNewPencilCount(currentCount.toString());
    setPencilDialogOpen(true);
  };

  const handleUpdatePencilCount = async () => {
    if (!selectedUser) return;

    const count = parseInt(newPencilCount);
    if (isNaN(count) || count < 0) {
      toast({
        title: "잘못된 값",
        description: "0 이상의 숫자를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ pencil_count: count })
      .eq("user_id", selectedUser.id);

    if (error) {
      toast({
        title: "연필 수량 변경 실패",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "연필 수량 변경 완료!",
      description: `${selectedUser.name}님의 연필이 ${count}개로 변경되었습니다.`,
    });

    setPencilDialogOpen(false);
    setSelectedUser(null);
    setNewPencilCount("");
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    setDeleting(true);

    try {
      console.log('=== 사용자 삭제 시작 ===', userId);
      
      const { data: photos, error: photosError } = await supabase
        .from("photos")
        .select("photo_url")
        .eq("user_id", userId);

      if (photosError) {
        console.error('사진 조회 에러:', photosError);
      } else {
        console.log('조회된 사진 수:', photos?.length || 0);
      }

      if (photos && photos.length > 0) {
        console.log('스토리지에서 사진 삭제 중...');
        for (const photo of photos) {
          const urlParts = photo.photo_url.split('/');
          const bucketIndex = urlParts.findIndex(part => part === 'photos');
          if (bucketIndex !== -1) {
            const filePath = urlParts.slice(bucketIndex + 1).join('/');
            const { error: storageError } = await supabase.storage
              .from('photos')
              .remove([filePath]);
            if (storageError) {
              console.error('스토리지 삭제 에러:', storageError);
            }
          }
        }
      }

      const { data: deletedData, error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", userId)
        .select();

      if (profileError) {
        console.error('프로필 삭제 에러:', profileError);
        throw profileError;
      }

      if (!deletedData || deletedData.length === 0) {
        toast({
          title: "삭제 실패",
          description: "삭제할 사용자를 찾을 수 없습니다.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "사용자 삭제 완료",
        description: "해당 사용자와 모든 데이터가 삭제되었습니다.",
      });

      fetchUsers();
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      console.error('=== 사용자 삭제 실패 ===', error);
      toast({
        title: "삭제 실패",
        description: error.message || "사용자 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen gradient-soft">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">사용자 관리</h1>
            <p className="text-muted-foreground mt-1">모든 사용자와 역할을 관리합니다</p>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="shadow-medium">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                전체 회원수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5" />
                전체 일기수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalDiaries}</p>
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5" />
                전체 일기장 수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalNotebooks}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              사용자 목록
            </CardTitle>
            <CardDescription>
              모든 사용자와 역할을 관리합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>사용자</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>가입일</TableHead>
                      <TableHead className="text-center">연필</TableHead>
                      <TableHead className="text-center">상태</TableHead>
                      <TableHead className="text-center">역할</TableHead>
                      <TableHead className="text-center">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.profile_photo_url ? (
                              <img 
                                src={user.profile_photo_url} 
                                alt={user.name || "사용자"}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <UserCircle className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {user.name || "이름 없음"}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.created_at 
                            ? new Date(user.created_at).toLocaleDateString('ko-KR')
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPencilDialog(user.user_id, user.name || "이름 없음", user.pencil_count)}
                            className="font-semibold hover:text-primary"
                          >
                            {user.pencil_count}
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          {user.banned ? (
                            <span className="inline-flex items-center gap-1 text-destructive">
                              <Ban className="h-4 w-4" />
                              <span className="text-sm">제한됨</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">정상</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Select
                            value={user.role || "user"}
                            onValueChange={(value: "admin" | "user") => 
                              handleRoleChange(user.user_id, value)
                            }
                          >
                            <SelectTrigger className="w-[120px] mx-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">일반 사용자</SelectItem>
                              <SelectItem value="admin">관리자</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant={user.banned ? "outline" : "destructive"}
                              size="sm"
                              onClick={() => handleBanUser(user.user_id, user.banned)}
                              className="rounded-full"
                            >
                              {user.banned ? "밴 해제" : "밴"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setUserToDelete(user.user_id);
                                setDeleteDialogOpen(true);
                              }}
                              className="rounded-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 사용자 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>사용자를 정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 해당 사용자의 모든 데이터(일기, 사진, 노트북 등)가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={deleting} className="rounded-full">
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && handleDeleteUser(userToDelete)}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 연필 갯수 변경 다이얼로그 */}
      <Dialog open={pencilDialogOpen} onOpenChange={setPencilDialogOpen}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>연필 갯수 변경</DialogTitle>
            <DialogDescription>
              {selectedUser?.name}님의 연필 갯수를 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pencil-count">현재 연필 갯수: {selectedUser?.currentCount}개</Label>
              <Input
                id="pencil-count"
                type="number"
                min="0"
                value={newPencilCount}
                onChange={(e) => setNewPencilCount(e.target.value)}
                placeholder="새로운 연필 갯수를 입력하세요"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPencilDialogOpen(false)}
              className="rounded-full"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleUpdatePencilCount}
              className="rounded-full"
            >
              변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
