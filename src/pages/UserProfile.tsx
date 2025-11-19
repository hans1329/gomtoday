import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import LoadingBar from "@/components/LoadingBar";
import { UserPlus, UserCheck, MapPin, Calendar, Droplet } from "lucide-react";

export default function UserProfile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friendRequestStatus, setFriendRequestStatus] = useState<"none" | "pending" | "accepted">("none");
  const [requesting, setRequesting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (userId && currentUserId) {
      if (userId === currentUserId) {
        // 본인 프로필은 /profile 페이지로 리다이렉트
        navigate("/profile");
        return;
      }
      fetchProfile();
      checkFriendRequestStatus();
    }
  }, [userId, currentUserId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(user.id);
  };

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "프로필을 불러올 수 없습니다",
        variant: "destructive",
      });
      navigate(-1);
      return;
    }

    setProfile(data);
    setLoading(false);
  };

  const checkFriendRequestStatus = async () => {
    if (!currentUserId || !userId) return;

    // 친구 요청 상태 확인 (양방향)
    const { data } = await supabase
      .from("friend_requests" as any)
      .select("*")
      .or(`and(from_user_id.eq.${currentUserId},to_user_id.eq.${userId}),and(from_user_id.eq.${userId},to_user_id.eq.${currentUserId})`)
      .maybeSingle();

    if (data) {
      setFriendRequestStatus((data as any).status);
    }
  };

  const handleFriendRequest = async () => {
    if (!currentUserId || !userId || requesting) return;

    setRequesting(true);
    
    const { error } = await supabase
      .from("friend_requests" as any)
      .insert({
        from_user_id: currentUserId,
        to_user_id: userId,
        status: "pending"
      } as any);

    if (error) {
      console.error("Error sending friend request:", error);
      toast({
        title: "친구 요청 실패",
        description: error.message,
        variant: "destructive",
      });
      setRequesting(false);
    } else {
      setFriendRequestStatus("pending");
      toast({
        title: "일기친구 요청을 보냈습니다!",
      });
      setRequesting(false);
      // 친구 페이지로 이동
      setTimeout(() => {
        navigate("/friends");
      }, 500);
    }
  };

  if (loading) {
    return <LoadingBar />;
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen gradient-soft">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Card className="shadow-medium">
          <CardContent className="p-6 space-y-6">
            {/* 프로필 헤더 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile.profile_photo_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {profile.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">{profile.name || "이름 없음"}</h1>
                {profile.bio && (
                  <p className="text-sm text-muted-foreground max-w-md">{profile.bio}</p>
                )}
              </div>

              {/* 일기친구 요청 버튼 */}
              {friendRequestStatus === "none" && (
                <Button
                  onClick={handleFriendRequest}
                  disabled={requesting}
                  className="rounded-full"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  일기친구 요청
                </Button>
              )}
              
              {friendRequestStatus === "pending" && (
                <Button
                  disabled
                  variant="outline"
                  className="rounded-full"
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  요청 대기 중
                </Button>
              )}
              
              {friendRequestStatus === "accepted" && (
                <Button
                  disabled
                  variant="outline"
                  className="rounded-full"
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  일기친구
                </Button>
              )}
            </div>

            {/* 프로필 정보 */}
            <div className="space-y-3 pt-4 border-t">
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground">MBTI</span>
                  <span className="text-sm">{profile.mbti || '-'}</span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Droplet className="h-3.5 w-3.5" />
                    혈액형
                  </span>
                  <span className="text-sm">{profile.blood_type ? `${profile.blood_type}형` : '-'}</span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    생일
                  </span>
                  <span className="text-sm">{profile.birthday || '-'}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground">성별</span>
                  <span className="text-sm">
                    {profile.gender === 'male' ? '남성' : profile.gender === 'female' ? '여성' : profile.gender || '-'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    위치
                  </span>
                  <span className="text-sm">{profile.location || '-'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
