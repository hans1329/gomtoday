import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "./components/Header";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Upload from "./pages/Upload";
import DiaryDetail from "./pages/DiaryDetail";
import DiaryReview from "./pages/DiaryReview";
import Diaries from "./pages/Diaries";
import Notebooks from "./pages/Notebooks";
import Friends from "./pages/Friends";
import Invitations from "./pages/Invitations";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import AdminBrandAssets from "./pages/AdminBrandAssets";
import AdminImageOptimize from "./pages/AdminImageOptimize";
import AdminUsers from "./pages/AdminUsers";
import AdminInquiries from "./pages/AdminInquiries";
import AdminDiaries from "./pages/AdminDiaries";
import AdminNotebooks from "./pages/AdminNotebooks";
import AdminPencilSettings from "./pages/AdminPencilSettings";
import AdminPencilProducts from "./pages/AdminPencilProducts";
import AdminPerspectives from "./pages/AdminPerspectives";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import About from "./pages/About";
import KakaoCallback from "./pages/KakaoCallback";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const hideHeader = location.pathname === "/auth" || location.pathname.startsWith("/admin");

  useEffect(() => {
    // 밴된 사용자 체크
    const checkBannedStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && location.pathname !== "/auth") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("banned, banned_reason")
          .eq("user_id", user.id)
          .single();

        if (profile?.banned) {
          await supabase.auth.signOut();
          toast({
            title: "계정이 제한되었습니다",
            description: profile.banned_reason || "관리자에게 문의하세요.",
            variant: "destructive",
          });
          navigate("/auth");
        }
      }
    };

    checkBannedStatus();
  }, [location.pathname, navigate, toast]);

  return (
    <div className="min-h-screen flex flex-col w-full">
      <ScrollToTop />
      {!hideHeader && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/kakao-callback" element={<KakaoCallback />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/user/:userId" element={<UserProfile />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/upload/:id" element={<Upload />} />
        <Route path="/diaries" element={<Diaries />} />
        <Route path="/notebooks" element={<Notebooks />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/invitations" element={<Invitations />} />
        <Route path="/diary/:id" element={<DiaryDetail />} />
        <Route path="/diary-review/:id" element={<DiaryReview />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/brand-assets" element={<AdminBrandAssets />} />
        <Route path="/admin/image-optimize" element={<AdminImageOptimize />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/inquiries" element={<AdminInquiries />} />
        <Route path="/admin/diaries" element={<AdminDiaries />} />
        <Route path="/admin/notebooks" element={<AdminNotebooks />} />
        <Route path="/admin/pencil-settings" element={<AdminPencilSettings />} />
        <Route path="/admin/pencil-products" element={<AdminPencilProducts />} />
        <Route path="/admin/perspectives" element={<AdminPerspectives />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
