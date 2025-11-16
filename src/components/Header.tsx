import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Plus, Home } from "lucide-react";

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <button 
            onClick={() => navigate("/")}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl">📝</span>
            <span className="font-bold text-xl">3rdMe</span>
          </button>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          {currentPath !== "/" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              title="홈"
            >
              <Home className="h-5 w-5" />
            </Button>
          )}
          
          {currentPath !== "/upload" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/upload")}
              title="일기 작성"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}

          {currentPath !== "/profile" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              title="프로필"
            >
              <User className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
