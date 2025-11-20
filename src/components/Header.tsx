import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, PenLine, Settings, LogOut, ArrowLeft, BookOpen, Shield, List, Bell, Users, Globe, Pencil } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [viewMode, setViewMode] = useState<"my" | "public">("my");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pencilCount, setPencilCount] = useState(0);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [mobileLogoUrl, setMobileLogoUrl] = useState<string>("");
  const [logoCacheBuster] = useState(() => Date.now());
  const [products, setProducts] = useState<Array<{
    id: string;
    name: string;
    pencil_count: number;
    price: number;
    display_order: number;
  }>>([]);

  useEffect(() => {
    fetchProfile();
    checkAdminRole();
    fetchNotificationCount();
    fetchPencilCount();
    fetchProducts();
    fetchLogos();
    
    // 프로필 업데이트 이벤트 리스너
    const handleProfileUpdate = () => {
      fetchProfile();
    };

    // 연필 개수 업데이트 이벤트 리스너
    const handlePencilUpdate = () => {
      fetchPencilCount();
    };

    // viewMode 변경 이벤트 리스너
    const handleViewModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<"my" | "public">;
      setViewMode(customEvent.detail);
    };
    
    window.addEventListener('profile-updated', handleProfileUpdate);
    window.addEventListener('pencil-updated', handlePencilUpdate);
    window.addEventListener('viewModeChange', handleViewModeChange as EventListener);
    
    // 알림 개수 주기적으로 업데이트
    const interval = setInterval(fetchNotificationCount, 30000);
    
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
      window.removeEventListener('pencil-updated', handlePencilUpdate);
      window.removeEventListener('viewModeChange', handleViewModeChange as EventListener);
      clearInterval(interval);
    };
  }, []);

  const fetchLogos = async () => {
    // 캐시된 로고 확인
    const cachedDesktopLogo = localStorage.getItem("desktop_logo_url");
    const cachedMobileLogo = localStorage.getItem("mobile_logo_url");
    
    if (cachedDesktopLogo) {
      setLogoUrl(cachedDesktopLogo);
    }
    if (cachedMobileLogo) {
      setMobileLogoUrl(cachedMobileLogo);
    }

    // 브랜드 에셋에서 로고 가져오기
    const { data } = supabase.storage
      .from("brand-assets")
      .getPublicUrl("3rdme-logo.png");

    if (data) {
      setLogoUrl(data.publicUrl);
      localStorage.setItem("desktop_logo_url", data.publicUrl);
    }

    const { data: mobileData } = supabase.storage
      .from("brand-assets")
      .getPublicUrl("3rdme-logo-mobile.png");

    if (mobileData) {
      setMobileLogoUrl(mobileData.publicUrl);
      localStorage.setItem("mobile_logo_url", mobileData.publicUrl);
    }
  };

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
      // 타임스탬프 추가하여 브라우저 캐시 방지
      const timestampedUrl = `${profile.profile_photo_url}?t=${Date.now()}`;
      setProfilePhotoUrl(timestampedUrl);
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

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("pencil_products")
        .select("id, name, pencil_count, price, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
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
    <>
      {/* Backdrop */}
      {dropdownOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setDropdownOpen(false)}
        />
      )}
      
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex h-14 items-center px-4 relative">
        <div className="flex-1 flex">
          {currentPath === "/" ? (
            <button 
              onClick={() => navigate("/")}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              {isMobile && mobileLogoUrl ? (
                <img 
                  src={`${mobileLogoUrl}?t=${logoCacheBuster}`} 
                  alt="Dpen 로고" 
                  className="h-9 w-auto object-contain"
                />
              ) : logoUrl ? (
                <img 
                  src={`${logoUrl}?t=${logoCacheBuster}`} 
                  alt="Dpen 로고" 
                  className="h-9 w-auto object-contain"
                />
              ) : null}
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
            <div className="relative flex items-center gap-2 bg-muted rounded-full p-1 h-11 shadow-md">
              {/* 슬라이딩 배경 */}
              <div 
                className={cn(
                  "absolute h-9 w-9 rounded-full bg-background shadow-lg transition-all duration-300 ease-in-out",
                  viewMode === "my" ? "left-1" : "left-[calc(50%+0.25rem)]"
                )}
              />
              
              {/* 버튼들 */}
              <button
                onClick={() => {
                  setViewMode("my");
                  window.dispatchEvent(new CustomEvent('viewModeChange', { detail: 'my' }));
                }}
                className="relative z-10 flex items-center justify-center rounded-full h-9 w-9 transition-colors"
              >
                <User className={cn("h-5 w-5 transition-colors", viewMode === "my" ? "text-primary" : "text-muted-foreground")} />
              </button>
              
              <button
                onClick={() => {
                  setViewMode("public");
                  window.dispatchEvent(new CustomEvent('viewModeChange', { detail: 'public' }));
                }}
                className="relative z-10 flex items-center justify-center rounded-full h-9 w-9 transition-colors"
              >
                <Globe className={cn("h-5 w-5 transition-colors", viewMode === "public" ? "text-primary" : "text-muted-foreground")} />
              </button>
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
            <DropdownMenuContent align="end" className="w-72 bg-background max-h-[85vh] overflow-y-auto">
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
                <div className="flex items-center justify-between pl-2">
                  <p className="text-base font-medium leading-none">{userName || "사용자"}</p>
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
              <div className="p-2 space-y-2">
                <Button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/upload");
                  }}
                  className="w-full h-12 text-base font-semibold rounded-full"
                  size="lg"
                >
                  <PenLine className="mr-2 h-5 w-5" />
                  일기 작성
                </Button>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPurchaseDialogOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-sm py-5 rounded-full hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="font-semibold">연필</span>
                  <span className="font-bold">{pencilCount}개</span>
                </Button>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  setDropdownOpen(false);
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
                  setDropdownOpen(false);
                  setViewMode("public");
                  window.dispatchEvent(new CustomEvent('viewModeChange', { detail: 'public' }));
                  navigate("/");
                }} 
                className="py-3"
              >
                <Globe className="mr-2 h-4 w-4" />
                <span>전체 공개 일기</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setDropdownOpen(false);
                  navigate("/notebooks");
                }} 
                className="py-3"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                <span>일기장 관리</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  setDropdownOpen(false);
                  navigate("/friends");
                }} 
                className="py-3"
              >
                <Users className="mr-2 h-4 w-4" />
                <span>일기친구</span>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate("/admin");
                    }} 
                    className="py-3"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    <span>관리자</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <div className="px-2 py-2">
                <p className="text-xs text-muted-foreground text-left">{userEmail}</p>
              </div>
              <DropdownMenuItem 
                onClick={() => {
                  setDropdownOpen(false);
                  handleLogout();
                }} 
                className="py-3"
              >
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

      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              연필 구매
            </DialogTitle>
            <DialogDescription>
              일기 작성에 필요한 연필을 구매하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {products.length === 0 ? (
              <p className="text-center text-muted-foreground">
                판매 중인 상품이 없습니다
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => (
                  <Button
                    key={product.id}
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "준비 중",
                        description: "토스 페이 연동이 준비 중입니다.",
                      });
                    }}
                    className="h-24 flex flex-col items-center justify-center gap-2 rounded-2xl hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors"
                  >
                    <Pencil className="h-6 w-6" />
                    <span className="font-bold text-lg">{product.pencil_count}개</span>
                    <span className="text-sm text-muted-foreground">
                      ₩{product.price.toLocaleString()}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
    </>
  );
}

