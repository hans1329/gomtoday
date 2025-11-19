import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LoadingBar from "@/components/LoadingBar";
import { useToast } from "@/hooks/use-toast";
import { Check, X, UserX } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default function Friends() {
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchFriendRequests();
    }
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(user.id);
  };

  const fetchFriendRequests = async () => {
    if (!currentUserId) return;

    // 캐시된 데이터 확인
    const cacheKey = `friends_${currentUserId}`;
    const cacheTimeKey = `friends_time_${currentUserId}`;
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);
    const cacheAge = cachedTime ? Date.now() - parseInt(cachedTime) : Infinity;
    const CACHE_DURATION = 5 * 60 * 1000; // 5분

    // 캐시가 유효하면 먼저 보여주기
    if (cachedData && cacheAge < CACHE_DURATION) {
      try {
        const parsed = JSON.parse(cachedData);
        setReceivedRequests(parsed.received || []);
        setSentRequests(parsed.sent || []);
        setFriends(parsed.friends || []);
        setLoading(false);
        return;
      } catch (e) {
        console.error('Cache parse error:', e);
      }
    }

    setLoading(true);

    // 받은 요청
    const { data: received } = await supabase
      .from("friend_requests" as any)
      .select(`
        *,
        from_profile:profiles!friend_requests_from_user_id_fkey(user_id, name, profile_photo_url)
      `)
      .eq("to_user_id", currentUserId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (received) setReceivedRequests(received);

    // 보낸 요청
    const { data: sent } = await supabase
      .from("friend_requests" as any)
      .select(`
        *,
        to_profile:profiles!friend_requests_to_user_id_fkey(user_id, name, profile_photo_url)
      `)
      .eq("from_user_id", currentUserId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (sent) setSentRequests(sent);

    // 친구 목록 (수락된 요청)
    const { data: acceptedFriends } = await supabase
      .from("friend_requests" as any)
      .select(`
        *,
        from_profile:profiles!friend_requests_from_user_id_fkey(user_id, name, profile_photo_url),
        to_profile:profiles!friend_requests_to_user_id_fkey(user_id, name, profile_photo_url)
      `)
      .or(`from_user_id.eq.${currentUserId},to_user_id.eq.${currentUserId}`)
      .eq("status", "accepted")
      .order("updated_at", { ascending: false });

    let friendsList: any[] = [];
    if (acceptedFriends) {
      friendsList = acceptedFriends.map((req: any) => {
        const isSender = req.from_user_id === currentUserId;
        return {
          id: req.id,
          friend: isSender ? req.to_profile : req.from_profile,
          since: req.updated_at
        };
      });
      setFriends(friendsList);
    }

    // 데이터 캐싱
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        received: received || [],
        sent: sent || [],
        friends: friendsList
      }));
      localStorage.setItem(cacheTimeKey, Date.now().toString());
    } catch (e) {
      console.error('Cache save error:', e);
    }

    setLoading(false);
  };

  const handleAcceptRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests" as any)
      .update({ status: "accepted", updated_at: new Date().toISOString() } as any)
      .eq("id", requestId);

    if (error) {
      toast({
        title: "친구 요청 수락 실패",
        variant: "destructive",
      });
    } else {
      toast({
        title: "일기친구가 되었습니다!",
      });
      fetchFriendRequests();
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests" as any)
      .delete()
      .eq("id", requestId);

    if (error) {
      toast({
        title: "친구 요청 거절 실패",
        variant: "destructive",
      });
    } else {
      toast({
        title: "친구 요청을 거절했습니다",
      });
      fetchFriendRequests();
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests" as any)
      .delete()
      .eq("id", requestId);

    if (error) {
      toast({
        title: "요청 취소 실패",
        variant: "destructive",
      });
    } else {
      toast({
        title: "친구 요청을 취소했습니다",
      });
      fetchFriendRequests();
    }
  };

  const handleRemoveFriend = async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests" as any)
      .delete()
      .eq("id", requestId);

    if (error) {
      toast({
        title: "친구 삭제 실패",
        variant: "destructive",
      });
    } else {
      toast({
        title: "일기친구를 삭제했습니다",
      });
      fetchFriendRequests();
    }
  };

  return (

    <div className="min-h-screen gradient-soft">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">일기친구</h1>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends">
              친구 ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="received">
              받은 요청 ({receivedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sent">
              보낸 요청 ({sentRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* 친구 목록 */}
          <TabsContent value="friends" className="space-y-3">
            {friends.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  아직 일기친구가 없습니다
                </CardContent>
              </Card>
            ) : (
              friends.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => navigate(`/user/${item.friend.user_id}`)}
                        className="flex items-center gap-3 hover:opacity-70 transition-opacity flex-1"
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={item.friend.profile_photo_url} />
                          <AvatarFallback>
                            {item.friend.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="font-medium">{item.friend.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.since), "yyyy.MM.dd", { locale: ko })} 부터
                          </p>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFriend(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* 받은 요청 */}
          <TabsContent value="received" className="space-y-3">
            {receivedRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  받은 친구 요청이 없습니다
                </CardContent>
              </Card>
            ) : (
              receivedRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => navigate(`/user/${request.from_profile.user_id}`)}
                        className="hover:opacity-70 transition-opacity"
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={request.from_profile.profile_photo_url} />
                          <AvatarFallback>
                            {request.from_profile.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                      <div className="flex-1">
                        <p className="font-medium">{request.from_profile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptRequest(request.id)}
                            className="rounded-full flex-1"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            수락
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectRequest(request.id)}
                            className="rounded-full flex-1"
                          >
                            <X className="h-3 w-3 mr-1" />
                            거절
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* 보낸 요청 */}
          <TabsContent value="sent" className="space-y-3">
            {sentRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  보낸 친구 요청이 없습니다
                </CardContent>
              </Card>
            ) : (
              sentRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => navigate(`/user/${request.to_profile.user_id}`)}
                        className="flex items-center gap-3 hover:opacity-70 transition-opacity flex-1"
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={request.to_profile.profile_photo_url} />
                          <AvatarFallback>
                            {request.to_profile.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="font-medium">{request.to_profile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(request.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                          </p>
                        </div>
                      </button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelRequest(request.id)}
                        className="rounded-full"
                      >
                        취소
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
