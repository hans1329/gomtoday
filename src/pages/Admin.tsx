import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Users, Shield, UserCircle, Ban, CheckCircle, Trash2 } from "lucide-react";
import LoadingBar from "@/components/LoadingBar";
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
}

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, totalDiaries: 0, totalNotebooks: 0 });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminRole();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchStats();
    }
  }, [isAdmin]);

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
        title: "권한 없음",
        description: "관리자만 접근할 수 있습니다.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchCurrentLogo();
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
    
    // 모든 프로필 가져오기
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, name, email, profile_photo_url, created_at, banned, banned_at, banned_reason")
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

    // 모든 유저의 롤 가져오기
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

    // 프로필과 롤 정보 병합
    const usersWithRoles: UserWithRole[] = profiles.map(profile => {
      const userRole = roles.find(r => r.user_id === profile.user_id);
      return {
        ...profile,
        role: userRole?.role || "user"
      };
    });

    setUsers(usersWithRoles);
    setLoadingUsers(false);
  };

  const handleRoleChange = async (userId: string, newRole: "admin" | "user") => {
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", newRole)
      .maybeSingle();

    if (existingRole) {
      // 이미 해당 롤이 있으면 아무것도 하지 않음
      return;
    }

    // 기존 롤 삭제
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      toast({
        title: "역할 변경 실패",
        description: deleteError.message,
        variant: "destructive",
      });
      return;
    }

    // 새 롤 추가
    const { error: insertError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole });

    if (insertError) {
      toast({
        title: "역할 변경 실패",
        description: insertError.message,
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

  const handleDeleteUser = async (userId: string) => {
    setDeleting(true);

    try {
      console.log('=== 사용자 삭제 시작 ===', userId);
      
      // 1. 사용자의 모든 사진 가져오기
      console.log('1. 사진 조회 중...');
      const { data: photos, error: photosError } = await supabase
        .from("photos")
        .select("photo_url")
        .eq("user_id", userId);

      if (photosError) {
        console.error('사진 조회 에러:', photosError);
      } else {
        console.log('조회된 사진 수:', photos?.length || 0);
      }

      // 2. 스토리지에서 사진 삭제
      if (photos && photos.length > 0) {
        console.log('2. 스토리지에서 사진 삭제 중...');
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
        console.log('스토리지 사진 삭제 완료');
      }

      // 3. 데이터베이스에서 사용자 데이터 삭제
      console.log('3. 프로필 삭제 시도 중...');
      const { data: deletedData, error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", userId)
        .select();

      console.log('프로필 삭제 결과:', { deletedData, profileError });

      if (profileError) {
        console.error('프로필 삭제 에러:', profileError);
        throw profileError;
      }

      if (!deletedData || deletedData.length === 0) {
        console.warn('삭제된 프로필이 없습니다');
        toast({
          title: "삭제 실패",
          description: "삭제할 사용자를 찾을 수 없습니다.",
          variant: "destructive",
        });
        return;
      }

      console.log('=== 사용자 삭제 완료 ===');
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
        description: error.message || "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const fetchCurrentLogo = () => {
    const { data } = supabase.storage
      .from("brand-assets")
      .getPublicUrl("3rdme-logo.png");
    
    setLogoUrl(data.publicUrl);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일만 허용
    if (!file.type.startsWith("image/")) {
      toast({
        title: "업로드 실패",
        description: "이미지 파일만 업로드할 수 있습니다.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    const { error: uploadError } = await supabase.storage
      .from("brand-assets")
      .upload("3rdme-logo.png", file, { upsert: true });

    setUploading(false);

    if (uploadError) {
      toast({
        title: "업로드 실패",
        description: uploadError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "업로드 완료!",
        description: "브랜드 로고가 업데이트되었습니다.",
      });
      fetchCurrentLogo();
      // 페이지 새로고침하여 로고 반영
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  if (loading) {
    return <LoadingBar />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-soft p-4">
      <div className="max-w-6xl mx-auto pt-8 space-y-6">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Upload className="w-5 h-5" />
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
              사용자 관리
            </CardTitle>
            <CardDescription>
              모든 사용자와 역할을 관리합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary via-primary/60 to-primary animate-shimmer bg-[length:200%_100%]" />
                </div>
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
                        <TableCell className="text-muted-foreground">
                          {user.email || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.created_at 
                            ? new Date(user.created_at).toLocaleDateString("ko-KR")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {user.banned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                              <Ban className="w-3 h-3" />
                              밴
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              활성
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
                            <SelectTrigger className="w-32 mx-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">
                                <div className="flex items-center gap-2">
                                  <UserCircle className="w-4 h-4" />
                                  User
                                </div>
                              </SelectItem>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-4 h-4" />
                                  Admin
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
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

        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>관리자 페이지</CardTitle>
            <CardDescription>
              브랜드 자산 및 시스템 설정을 관리합니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">브랜드 로고</h3>
              
              {logoUrl && (
                <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                  <img 
                    src={`${logoUrl}?t=${Date.now()}`} 
                    alt="현재 로고" 
                    className="max-w-[200px] max-h-[200px] object-contain"
                  />
                </div>
              )}

              <div className="flex flex-col gap-4">
                <label
                  htmlFor="logo-upload"
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors">
                    {uploading ? (
                      <p className="text-sm text-muted-foreground">업로드 중...</p>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          클릭하여 새 로고 업로드
                        </span>
                      </>
                    )}
                  </div>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                  />
                </label>
                
                <p className="text-xs text-muted-foreground">
                  * PNG 형식 권장, 파일명은 자동으로 3rdme-logo.png로 저장됩니다
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 사용자 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
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
              className="rounded-full bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
