import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera } from "lucide-react";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setName(data.name || "");
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/profile.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from("photos")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast({
        title: "업로드 실패",
        description: uploadError.message,
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("photos")
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ profile_photo_url: publicUrl })
      .eq("user_id", user.id);

    setUploading(false);

    if (updateError) {
      toast({
        title: "프로필 업데이트 실패",
        description: updateError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "프로필 사진 업데이트 완료!",
      });
      fetchProfile();
    }
  };

  const handleUpdateName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ name })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "업데이트 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "프로필 업데이트 완료!",
      });
      fetchProfile();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-soft p-4">
      <div className="max-w-2xl mx-auto pt-8 space-y-6">
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>프로필 설정</CardTitle>
            <CardDescription>
              프로필 사진을 등록하면 AI가 더 개인화된 일기를 작성할 수 있어요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={profile?.profile_photo_url} />
                  <AvatarFallback className="text-2xl gradient-warm text-white">
                    {name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="photo-upload"
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors shadow-soft"
                >
                  <Camera className="w-5 h-5" />
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
              {uploading && <p className="text-sm text-muted-foreground">업로드 중...</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
              />
            </div>

            <Button onClick={handleUpdateName} className="w-full">
              저장
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}