import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Users, Shield, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

interface UserWithRole {
  user_id: string;
  name: string | null;
  email: string | null;
  profile_photo_url: string | null;
  created_at: string | null;
  role: "admin" | "user" | null;
}

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminRole();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
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

  const fetchUsers = async () => {
    setLoadingUsers(true);
    
    // 모든 프로필 가져오기
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, name, email, profile_photo_url, created_at")
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-soft p-4">
      <div className="max-w-6xl mx-auto pt-8 space-y-6">
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
              <p className="text-center py-8 text-muted-foreground">로딩 중...</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>사용자</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>가입일</TableHead>
                      <TableHead className="text-center">역할</TableHead>
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
    </div>
  );
}
