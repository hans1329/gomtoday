import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Upload from "./pages/Upload";
import DiaryDetail from "./pages/DiaryDetail";
import DiaryReview from "./pages/DiaryReview";
import Diaries from "./pages/Diaries";
import Notebooks from "./pages/Notebooks";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";

function AppContent() {
  const location = useLocation();
  const hideHeader = location.pathname === "/auth";

  return (
    <div className="min-h-screen flex flex-col w-full">
      <ScrollToTop />
      {!hideHeader && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/upload/:id" element={<Upload />} />
        <Route path="/diaries" element={<Diaries />} />
        <Route path="/notebooks" element={<Notebooks />} />
        <Route path="/diary/:id" element={<DiaryDetail />} />
        <Route path="/diary-review/:id" element={<DiaryReview />} />
        <Route path="/admin" element={<Admin />} />
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
