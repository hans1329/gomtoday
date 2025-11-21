import { Card, CardContent } from "@/components/ui/card";
import { Camera, Users, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const About = () => {
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string>("");

  useEffect(() => {
    const fetchLogo = async () => {
      const cachedLogo = localStorage.getItem("auth_logo_url");
      if (cachedLogo) {
        setLogoUrl(cachedLogo);
      }

      const { data } = supabase.storage.from("brand-assets").getPublicUrl("3rdme-logo-auth.png");
      if (data) {
        setLogoUrl(data.publicUrl);
        localStorage.setItem("auth_logo_url", data.publicUrl);
      }
    };
    fetchLogo();
  }, []);

  const features = [
    {
      icon: Camera,
      title: "사진만 올리면 일기 완성",
      description: "사진 한 장만 업로드하면 AI가 자동으로 감성적인 일기를 작성해드립니다. 더 이상 일기 쓰기를 고민하지 마세요.",
    },
    {
      icon: Sparkles,
      title: "다양한 시점의 일기",
      description: "같은 사진도 여러 관점에서 바라볼 수 있습니다. 긍정적, 회상적, 문학적 등 다양한 시점으로 일기를 재작성할 수 있습니다.",
    },
    {
      icon: Users,
      title: "함께 쓰는 공유 일기장",
      description: "친구, 가족, 연인과 함께 일기장을 공유하세요. 소중한 순간을 함께 기록하고 추억을 나눌 수 있습니다.",
    },
    {
      icon: BookOpen,
      title: "나만의 일기 컬렉션",
      description: "주제별, 사람별로 일기장을 나누어 관리하세요. 여행 일기, 일상 일기, 특별한 순간들을 체계적으로 보관할 수 있습니다.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="flex items-center justify-center mb-6">
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="GomToday Logo" 
                className="h-16 md:h-20 w-auto object-contain"
              />
            )}
          </div>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            사진 한 장으로 시작하는 AI 일기 서비스
          </p>
          <p className="text-sm md:text-base text-muted-foreground/80 max-w-xl mx-auto px-4">
            매일매일의 소중한 순간을, 사진과 함께 AI가 감성적인 글로 기록해드립니다.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center space-y-6 bg-card border-2 rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-bold">
            지금 바로 시작해보세요
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            오늘의 순간을 사진으로 담고, AI가 만들어주는 특별한 일기를 경험해보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button
              onClick={() => navigate("/upload")}
              size="lg"
              className="w-full sm:w-auto rounded-full px-8"
            >
              일기 작성하기
            </Button>
            <Button
              onClick={() => navigate("/diaries")}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto rounded-full px-8"
            >
              일기 둘러보기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
