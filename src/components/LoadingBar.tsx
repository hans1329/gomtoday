import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function LoadingBar() {
  const [mobileLogoUrl, setMobileLogoUrl] = useState<string>("");

  useEffect(() => {
    const { data } = supabase.storage
      .from("brand-assets")
      .getPublicUrl("3rdme-logo-mobile.png");

    if (data) {
      setMobileLogoUrl(data.publicUrl);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gradient-soft gap-4">
      {mobileLogoUrl ? (
        <img 
          src={`${mobileLogoUrl}?t=${Date.now()}`} 
          alt="로딩 중" 
          className="w-12 h-12 animate-spin"
          style={{ animationDuration: '2s' }}
          onError={(e) => {
            e.currentTarget.src = "/3rdme-logo.png";
          }}
        />
      ) : (
        <img src="/3rdme-logo.png" alt="로딩 중" className="w-12 h-12 animate-spin" style={{ animationDuration: '2s' }} />
      )}
      <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary via-primary/60 to-primary animate-shimmer bg-[length:200%_100%]" />
      </div>
    </div>
  );
}
