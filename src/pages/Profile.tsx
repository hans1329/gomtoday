import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import LoadingBar from "@/components/LoadingBar";
import { Camera } from "lucide-react";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [mbti, setMbti] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");
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
      setBio(data.bio || "");
      setMbti(data.mbti || "");
      setBloodType(data.blood_type || "");
      setBirthday(data.birthday || "");
      setGender(data.gender || "");
      setLocation(data.location || "");
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
      // Header에 프로필 업데이트 알림
      window.dispatchEvent(new Event('profile-updated'));
    }
  };

  const handleUpdateProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ 
        name,
        bio,
        mbti: mbti || null,
        blood_type: bloodType || null,
        birthday: birthday || null,
        gender: gender || null,
        location: location || null
      })
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
      // Header에 프로필 업데이트 알림
      window.dispatchEvent(new Event('profile-updated'));
    }
  };

  if (loading) {
    return <LoadingBar />;
  }

  return (
    <div className="min-h-screen gradient-soft p-2 sm:p-4">
      <div className="max-w-2xl mx-auto pt-4 sm:pt-8">
        <div className="space-y-6">
          {/* 프로필 사진과 이름 */}
          <div className="flex flex-col items-center gap-3">
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
            
            <div className="w-full max-w-sm">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="text-center text-lg font-semibold"
              />
            </div>
          </div>

          {/* 프로필 정보 */}
          <div className="space-y-4 px-2">
            <div className="space-y-2">
              <Label htmlFor="bio" className="pl-2">나에 대한 한마디</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => {
                  if (e.target.value.length <= 200) {
                    setBio(e.target.value);
                  }
                }}
                placeholder="나를 표현하는 한마디를 입력하세요"
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/200
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mbti" className="pl-2">MBTI</Label>
                <Select value={mbti} onValueChange={setMbti}>
                  <SelectTrigger id="mbti">
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="ISTJ">ISTJ</SelectItem>
                    <SelectItem value="ISFJ">ISFJ</SelectItem>
                    <SelectItem value="INFJ">INFJ</SelectItem>
                    <SelectItem value="INTJ">INTJ</SelectItem>
                    <SelectItem value="ISTP">ISTP</SelectItem>
                    <SelectItem value="ISFP">ISFP</SelectItem>
                    <SelectItem value="INFP">INFP</SelectItem>
                    <SelectItem value="INTP">INTP</SelectItem>
                    <SelectItem value="ESTP">ESTP</SelectItem>
                    <SelectItem value="ESFP">ESFP</SelectItem>
                    <SelectItem value="ENFP">ENFP</SelectItem>
                    <SelectItem value="ENTP">ENTP</SelectItem>
                    <SelectItem value="ESTJ">ESTJ</SelectItem>
                    <SelectItem value="ESFJ">ESFJ</SelectItem>
                    <SelectItem value="ENFJ">ENFJ</SelectItem>
                    <SelectItem value="ENTJ">ENTJ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bloodType" className="pl-2">혈액형</Label>
                <Select value={bloodType} onValueChange={setBloodType}>
                  <SelectTrigger id="bloodType">
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="A">A형</SelectItem>
                    <SelectItem value="B">B형</SelectItem>
                    <SelectItem value="AB">AB형</SelectItem>
                    <SelectItem value="O">O형</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthday" className="pl-2">생일</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender" className="pl-2">성별</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="선택하세요" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="남성">남성</SelectItem>
                    <SelectItem value="여성">여성</SelectItem>
                    <SelectItem value="기타">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="pl-2">위치</Label>
              <Input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="예: 서울특별시"
              />
            </div>

            <Button onClick={handleUpdateProfile} className="w-full">
              저장
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}