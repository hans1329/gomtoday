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
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [bio, setBio] = useState("");
  const [mbti, setMbti] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
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

    // 캐시된 데이터 확인
    const cacheKey = `profile_${user.id}`;
    const cacheTimeKey = `profile_time_${user.id}`;
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);
    const cacheAge = cachedTime ? Date.now() - parseInt(cachedTime) : Infinity;
    const CACHE_DURATION = 5 * 60 * 1000; // 5분

    // 캐시가 유효하면 먼저 보여주기
    if (cachedData && cacheAge < CACHE_DURATION) {
      try {
        const parsed = JSON.parse(cachedData);
        setProfile(parsed);
        setName(parsed.name === parsed.email ? "" : parsed.name || "");
        setBio(parsed.bio || "");
        setMbti(parsed.mbti || "");
        setBloodType(parsed.blood_type || "");
        setBirthday(parsed.birthday || "");
        setGender(parsed.gender || "");
        setLocation(parsed.location || "");
        setLoading(false);
        return;
      } catch (e) {
        console.error('Cache parse error:', e);
      }
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("프로필 로드 에러:", error);
      toast({
        title: "프로필 로드 실패",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (data) {
      setProfile(data);
      setName(data.name === data.email ? "" : data.name || "");
      setBio(data.bio || "");
      setMbti(data.mbti || "");
      setBloodType(data.blood_type || "");
      setBirthday(data.birthday || "");
      setGender(data.gender || "");
      setLocation(data.location || "");

      // 데이터 캐싱
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(cacheTimeKey, Date.now().toString());
      } catch (e) {
        console.error('Cache save error:', e);
      }
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
      .upsert({ 
        user_id: user.id,
        profile_photo_url: publicUrl 
      }, {
        onConflict: 'user_id'
      });

    setUploading(false);

    if (updateError) {
      toast({
        title: "프로필 업데이트 실패",
        description: updateError.message,
        variant: "destructive",
      });
    } else {
      // 로컬 상태 즉시 업데이트 (타임스탬프 추가하여 브라우저 캐시 방지)
      const timestampedUrl = `${publicUrl}?t=${Date.now()}`;
      setProfile((prev: any) => ({
        ...prev,
        profile_photo_url: timestampedUrl
      }));
      
      // 캐시 업데이트
      const cacheKey = `profile_${user.id}`;
      const cacheTimeKey = `profile_time_${user.id}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          parsed.profile_photo_url = timestampedUrl;
          localStorage.setItem(cacheKey, JSON.stringify(parsed));
          localStorage.setItem(cacheTimeKey, Date.now().toString());
        } catch (e) {
          console.error('Cache update error:', e);
        }
      }
      
      toast({
        title: "프로필 사진 업데이트 완료!",
      });
      
      // Header에 프로필 업데이트 알림
      window.dispatchEvent(new Event('profile-updated'));
    }
  };

  const handleUpdateProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .upsert({ 
        user_id: user.id,
        name,
        bio,
        mbti: mbti || null,
        blood_type: bloodType || null,
        birthday: birthday || null,
        gender: gender || null,
        location: location || null
      }, {
        onConflict: 'user_id'
      });

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
      // 일기 페이지로 이동
      setTimeout(() => {
        navigate("/");
      }, 500);
    }
  };

  if (loading) {
    return <LoadingBar />;
  }

  return (
    <div className="min-h-screen gradient-soft overflow-x-hidden">
      <div className="max-w-2xl mx-auto px-4 py-4 sm:py-8">
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
            
            <div className="w-full max-w-xs">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setIsNameFocused(true)}
                onBlur={() => setIsNameFocused(name.trim() !== "" ? true : false)}
                placeholder={isNameFocused ? "" : "이름을 입력해주세요"}
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