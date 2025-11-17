import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, Image, Pencil } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

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

    setLoading(false);
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
      title: "연필 설정",
      description: "연필 지급 및 차감 항목을 관리합니다",
      icon: Pencil,
      path: "/admin/pencil-settings",
    },
  ];

  return (
    <div className="min-h-screen gradient-soft">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold pl-1">관리자 페이지</h1>
          <p className="text-muted-foreground mt-2 pl-1">시스템 관리 및 설정</p>
        </div>

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
  );
}
