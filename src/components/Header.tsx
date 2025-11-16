import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, PenLine, Settings, LogOut, ArrowLeft, BookOpen, Shield } from "lucide-react";
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

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const currentPath = location.pathname;
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchProfile();
    checkAdminRole();
    
    // 프로필 업데이트 이벤트 리스너
    const handleProfileUpdate = () => {
      fetchProfile();
    };
    
    window.addEventListener('profile-updated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_photo_url, name")
      .eq("user_id", user.id)
      .single();

    if (profile?.profile_photo_url) {
      setProfilePhotoUrl(profile.profile_photo_url);
    }
    if (profile?.name) {
      setUserName(profile.name);
    }
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
      <div className="flex h-14 items-center px-4">
        <div className="mr-4 flex">
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
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="프로필"
                className="shadow-md rounded-full p-0 h-9 w-9"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profilePhotoUrl || undefined} alt="프로필" />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName || "사용자"}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/diaries")} className="py-3">
                <BookOpen className="mr-2 h-4 w-4" />
                <span>나의 일기</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/notebooks")} className="py-3">
                <User className="mr-2 h-4 w-4" />
                <span>일기장 관리</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/profile")} className="py-3">
                <Settings className="mr-2 h-4 w-4" />
                <span>설정</span>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="py-3">
                    <Shield className="mr-2 h-4 w-4" />
                    <span>관리자</span>
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
    </header>
  );
}

