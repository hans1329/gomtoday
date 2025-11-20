import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, Image, Pencil, TrendingUp, BookOpen, Home } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface RecentUser {
  user_id: string;
  name: string | null;
  email: string | null;
  profile_photo_url: string | null;
  created_at: string | null;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ 
    totalUsers: 0, 
    totalDiaries: 0, 
    totalNotebooks: 0,
    todayUsers: 0,
    weekUsers: 0
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

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

    fetchStats();
    fetchRecentUsers();
    setLoading(false);
  };

  const fetchStats = async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [usersRes, diariesRes, notebooksRes, todayUsersRes, weekUsersRes] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("diaries").select("*", { count: "exact", head: true }),
      supabase.from("notebooks").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString())
    ]);

    setStats({
      totalUsers: usersRes.count || 0,
      totalDiaries: diariesRes.count || 0,
      totalNotebooks: notebooksRes.count || 0,
      todayUsers: todayUsersRes.count || 0,
      weekUsers: weekUsersRes.count || 0
    });
  };

  const fetchRecentUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, name, email, profile_photo_url, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("최근 사용자 조회 에러:", error);
    } else {
      setRecentUsers(data || []);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const menuItems = [
    {
      title: "브랜드 애셋 관리",
      description: "로고 및 브랜드 이미지를 관리합니다",
      icon: Image,
      path: "/admin/brand-assets",
    },
    {
      title: "사용자 관리",
      description: "모든 사용자와 역할을 관리합니다",
      icon: Users,
      path: "/admin/users",
    },
    {
      title: "문의 관리",
      description: "사용자 문의를 확인하고 관리합니다",
      icon: Users,
      path: "/admin/inquiries",
    },
    {
      title: "연필 설정",
      description: "연필 지급 및 차감 항목을 관리합니다",
      icon: Pencil,
      path: "/admin/pencil-settings",
    },
    {
      title: "연필 상품 관리",
      description: "판매할 연필 상품을 관리합니다",
      icon: Pencil,
      path: "/admin/pencil-products",
    },
  ];

  return (
    <div className="min-h-screen gradient-soft">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold pl-1">관리자 페이지</h1>
            <p className="text-muted-foreground mt-2 pl-1">시스템 관리 및 설정</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="rounded-full"
          >
            <Home className="mr-2 h-4 w-4" />
            메인 페이지로 이동
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* 전체 회원수 */}
          <Card 
            className="shadow-medium cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/admin/users")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                전체 회원수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
              <p className="text-sm text-muted-foreground mt-1">
                오늘 +{stats.todayUsers} · 이번주 +{stats.weekUsers}
              </p>
            </CardContent>
          </Card>

          {/* 전체 일기수 */}
          <Card 
            className="shadow-medium cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/admin/diaries")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="w-5 h-5" />
                전체 일기수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalDiaries}</p>
              <p className="text-sm text-muted-foreground mt-1">
                사용자당 평균 {stats.totalUsers > 0 ? (stats.totalDiaries / stats.totalUsers).toFixed(1) : 0}개
              </p>
            </CardContent>
          </Card>

          {/* 전체 일기장수 */}
          <Card 
            className="shadow-medium cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/admin/notebooks")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5" />
                전체 일기장수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalNotebooks}</p>
              <p className="text-sm text-muted-foreground mt-1">
                사용자당 평균 {stats.totalUsers > 0 ? (stats.totalNotebooks / stats.totalUsers).toFixed(1) : 0}개
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 최근 가입 사용자 */}
        <Card className="shadow-medium mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              최근 가입 사용자
            </CardTitle>
            <CardDescription>
              최근 5명의 신규 가입자
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div key={user.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  {user.profile_photo_url ? (
                    <img 
                      src={user.profile_photo_url} 
                      alt={user.name || "사용자"}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{user.name || "이름 없음"}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {user.created_at 
                      ? new Date(user.created_at).toLocaleDateString('ko-KR', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : "-"}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 관리 메뉴 */}
        <div>
          <h2 className="text-xl font-bold mb-4 pl-1">관리 메뉴</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <Card
                key={item.path}
                className="shadow-medium cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(item.path)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <item.icon className="w-6 h-6" />
                    {item.title}
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    클릭하여 관리하기 →
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
