import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, PenLine, Settings, LogOut, ArrowLeft, BookOpen, Shield, List, Bell, Users, Globe, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import NotificationsSheet from "./NotificationsSheet";
import { cn } from "@/lib/utils";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const currentPath = location.pathname;
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [viewMode, setViewMode] = useState<"my" | "public">("my");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pencilCount, setPencilCount] = useState(0);

  useEffect(() => {
    fetchProfile();
    checkAdminRole();
    fetchNotificationCount();
    fetchPencilCount();
    
    // 프로필 업데이트 이벤트 리스너
    const handleProfileUpdate = () => {
      fetchProfile();
    };

    // viewMode 변경 이벤트 리스너
    const handleViewModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<"my" | "public">;
      setViewMode(customEvent.detail);
    };
    
    window.addEventListener('profile-updated', handleProfileUpdate);
    window.addEventListener('viewModeChange', handleViewModeChange as EventListener);
    
    // 알림 개수 주기적으로 업데이트
    const interval = setInterval(fetchNotificationCount, 30000);
    
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
      window.removeEventListener('viewModeChange', handleViewModeChange as EventListener);
      clearInterval(interval);
    };
  }, []);

  const checkAdminRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!roles);
  };

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserEmail(user.email || "");

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("profile_photo_url, name, pencil_count")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("프로필 로드 에러:", error);
      return;
    }

    if (profile?.profile_photo_url) {
      setProfilePhotoUrl(profile.profile_photo_url);
    }
    if (profile?.name) {
      setUserName(profile.name);
    }
    if (profile?.pencil_count !== undefined) {
      setPencilCount(profile.pencil_count);
    }
  };

  const fetchPencilCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("pencil_count")
      .eq("user_id", user.id)
      .single();

    if (profile?.pencil_count !== undefined) {
      setPencilCount(profile.pencil_count);
    }
  };

  const fetchNotificationCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count: requestCount } = await supabase
      .from("friend_requests" as any)
      .select("*", { count: "exact", head: true })
      .eq("to_user_id", user.id)
      .eq("status", "pending");

    const { data: myDiaries } = await supabase
      .from("diaries")
      .select("id")
      .eq("user_id", user.id);

    let likeCount = 0;
    let commentCount = 0;

    if (myDiaries && myDiaries.length > 0) {
      const diaryIds = myDiaries.map(d => d.id);

      const { count: likes } = await supabase
        .from("diary_likes")
        .select("*", { count: "exact", head: true })
        .in("diary_id", diaryIds)
        .neq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const { count: comments } = await supabase
        .from("diary_comments")
        .select("*", { count: "exact", head: true })
        .in("diary_id", diaryIds)
        .neq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      likeCount = likes || 0;
      commentCount = comments || 0;
    }

    setNotificationCount((requestCount || 0) + likeCount + commentCount);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "로그아웃 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "로그아웃 완료",
        description: "안전하게 로그아웃되었습니다.",
      });
      navigate("/auth");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 relative">
        <div className="flex-1 flex">
          {currentPath === "/" ? (
            <button 
              onClick={() => navigate("/")}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <img src="/3rdme-logo.png" alt="3rdME" className="w-6 h-6" />
              <span className="hidden md:inline font-bold text-xl">3rdME</span>
            </button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
        </div>

        {currentPath === "/" && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center gap-1 bg-background rounded-full p-1 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setViewMode("my");
                  window.dispatchEvent(new CustomEvent('viewModeChange', { detail: 'my' }));
                }}
                className="rounded-full h-9 w-9 group relative"
              >
                <User className={cn("h-5 w-5 group-hover:text-white transition-colors", viewMode === "my" ? "text-primary" : "text-muted-foreground")} />
                {viewMode === "my" && (
                  <span className="absolute top-1.5 right-1.5 h-1 w-1 rounded-full bg-destructive" />
                )}
              </Button>
              <div className="h-3 w-px bg-muted-foreground/30" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setViewMode("public");
                  window.dispatchEvent(new CustomEvent('viewModeChange', { detail: 'public' }));
                }}
                className="rounded-full h-9 w-9 group relative"
              >
                <Globe className={cn("h-5 w-5 group-hover:text-white transition-colors", viewMode === "public" ? "text-primary" : "text-muted-foreground")} />
                {viewMode === "public" && (
                  <span className="absolute top-1.5 right-1.5 h-1 w-1 rounded-full bg-destructive" />
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 flex items-center justify-end space-x-2">
          {currentPath !== "/upload" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/upload")}
              title="일기 작성"
            >
              <PenLine className="h-5 w-5" />
            </Button>
          )}

          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="프로필"
                className="shadow-md rounded-full p-0 h-9 w-9 relative"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profilePhotoUrl || undefined} alt="프로필" />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-background">
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center justify-end mb-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 relative"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNotificationsOpen(true);
                      fetchNotificationCount();
                    }}
                  >
                    <Bell className="h-4 w-4" />
                    {notificationCount > 0 && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium leading-none">{userName || "사용자"}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate("/profile");
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate("/upload");
                    }}
                    className="flex-1 h-12 text-base font-semibold"
                    size="lg"
                  >
                    <PenLine className="mr-2 h-5 w-5" />
                    일기 작성
                  </Button>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Pencil className="h-4 w-4" />
                    <span className="font-medium">{pencilCount}</span>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  setViewMode("my");
                  window.dispatchEvent(new CustomEvent('viewModeChange', { detail: 'my' }));
                  navigate("/");
                }} 
                className="py-3"
              >
                <User className="mr-2 h-4 w-4" />
                <span>내 일기</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setViewMode("public");
                  window.dispatchEvent(new CustomEvent('viewModeChange', { detail: 'public' }));
                  navigate("/");
                }} 
                className="py-3"
              >
                <Globe className="mr-2 h-4 w-4" />
                <span>전체 공개 일기</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/notebooks")} className="py-3">
                <BookOpen className="mr-2 h-4 w-4" />
                <span>일기장 관리</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/friends")} className="py-3">
                <Users className="mr-2 h-4 w-4" />
                <span>일기친구</span>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="py-3">
                    <Shield className="mr-2 h-4 w-4" />
                    <span>관리자</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/pencil-settings")} className="py-3">
                    <Pencil className="mr-2 h-4 w-4" />
                    <span>연필 설정</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <div className="px-2 py-2">
                <p className="text-xs text-muted-foreground text-left">{userEmail}</p>
              </div>
              <DropdownMenuItem onClick={handleLogout} className="py-3">
                <LogOut className="mr-2 h-4 w-4" />
                <span>로그아웃</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <NotificationsSheet 
        open={notificationsOpen} 
        onOpenChange={setNotificationsOpen}
      />
    </header>
  );
}

