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
    // SEO Meta Tags
    document.title = "곰투데이 소개 | 사진 한 장으로 시작하는 AI 일기";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "곰투데이는 사진만 올리면 AI가 자동으로 다양한 시점에서 일기를 작성해주는 서비스입니다. 친구, 가족과 함께 쓰는 공유 일기장으로 소중한 순간을 기록하세요.");
    }
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute("content", "곰투데이, AI 일기, 사진 일기, 공유 일기장, 자동 일기 작성, 다양한 시점, 일기 서비스");
    }

    // Open Graph Tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', '곰투데이 소개 | 사진 한 장으로 시작하는 AI 일기');
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute('content', '곰투데이는 사진만 올리면 AI가 자동으로 다양한 시점에서 일기를 작성해주는 서비스입니다. 친구, 가족과 함께 쓰는 공유 일기장으로 소중한 순간을 기록하세요.');
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', 'https://gom.today/about');
    let ogType = document.querySelector('meta[property="og:type"]');
    if (!ogType) {
      ogType = document.createElement('meta');
      ogType.setAttribute('property', 'og:type');
      document.head.appendChild(ogType);
    }
    ogType.setAttribute('content', 'website');

    // Twitter Card Tags
    let twitterCard = document.querySelector('meta[name="twitter:card"]');
    if (!twitterCard) {
      twitterCard = document.createElement('meta');
      twitterCard.setAttribute('name', 'twitter:card');
      document.head.appendChild(twitterCard);
    }
    twitterCard.setAttribute('content', 'summary_large_image');
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (!twitterTitle) {
      twitterTitle = document.createElement('meta');
      twitterTitle.setAttribute('name', 'twitter:title');
      document.head.appendChild(twitterTitle);
    }
    twitterTitle.setAttribute('content', '곰투데이 소개 | 사진 한 장으로 시작하는 AI 일기');
    let twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (!twitterDescription) {
      twitterDescription = document.createElement('meta');
      twitterDescription.setAttribute('name', 'twitter:description');
      document.head.appendChild(twitterDescription);
    }
    twitterDescription.setAttribute('content', '곰투데이는 사진만 올리면 AI가 자동으로 다양한 시점에서 일기를 작성해주는 서비스입니다. 친구, 가족과 함께 쓰는 공유 일기장으로 소중한 순간을 기록하세요.');

    // Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', 'https://gom.today/about');
    const fetchLogo = async () => {
      const cachedLogo = localStorage.getItem("auth_logo_url");
      if (cachedLogo) {
        setLogoUrl(cachedLogo);
      }
      const {
        data
      } = supabase.storage.from("brand-assets").getPublicUrl("3rdme-logo-auth.png");
      if (data) {
        setLogoUrl(data.publicUrl);
        localStorage.setItem("auth_logo_url", data.publicUrl);
      }
    };
    fetchLogo();
  }, []);
  const features = [{
    icon: Camera,
    title: "사진만 올리면 일기 완성",
    description: "오늘의 사진만 업로드하면 누군가 자동으로 다양한 방식으로 일기를 작성해드립니다. 더 이상 일기 쓰기를 고민하지 마세요. 쉽고 재미있게 일상을 기록하세요!"
  }, {
    icon: Sparkles,
    title: "다양한 시점의 일기",
    description: "같은 사진도 여러 관점에서 바라볼 수 있습니다. 나의 핸드폰의 시점은 어떘을까요? 나의 애완견이라면? 미래에서 온 내가 오늘의 일기를 써 줄 수도 있습니다. 곰투데이는 긍정적, 회상적, 문학적 등 다양한 시점으로 일기를 작성할 수 있습니다."
  }, {
    icon: Users,
    title: "함께 쓰는 공유 일기장",
    description: "친구, 가족, 연인과 함께 또는 여러 멤버들과 공유하는 일기장을 만들 수 있습니다. 소중한 순간을 함께 기록하고 추억을 나눠 보세요!"
  }, {
    icon: BookOpen,
    title: "나만의 일기 컬렉션",
    description: "주제별, 사람별로 일기장을 나누어 관리하세요. 여행 일기, 일상 일기, 특별한 순간들을 체계적으로 보관할 수 있습니다."
  }];
  return <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pb-20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="flex items-center justify-center mb-6">
            {logoUrl && <img src={logoUrl} alt="GomToday Logo" className="h-16 md:h-20 w-auto object-contain" />}
          </div>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">누군가 써주는 나의 일기         </p>
          <p className="text-sm md:text-base text-muted-foreground/80 max-w-xl mx-auto px-4">
            매일매일의 소중한 순간을, 사진과 함께 AI가 감성적인 글로 기록해드립니다.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {features.map((feature, index) => <Card key={index} className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
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
            </Card>)}
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
            <Button onClick={() => navigate("/upload")} size="lg" className="w-full sm:w-auto rounded-full px-8">
              일기 작성하기
            </Button>
            <Button onClick={() => navigate("/diaries")} variant="outline" size="lg" className="w-full sm:w-auto rounded-full px-8">
              일기 둘러보기
            </Button>
          </div>
        </div>
      </div>
    </div>;
};
export default About;