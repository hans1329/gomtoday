import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, Heart, MessageCircle, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NotificationsSheet({ open, onOpenChange }: NotificationsSheetProps) {
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [likes, setLikes] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 친구 요청 가져오기
    const { data: requests } = await supabase
      .from("friend_requests" as any)
      .select(`
        *,
        from_profile:profiles!friend_requests_from_user_id_fkey(name, profile_photo_url)
      `)
      .eq("to_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (requests) setFriendRequests(requests);

    // 내 일기에 대한 좋아요 가져오기
    const { data: myDiaries } = await supabase
      .from("diaries")
      .select("id")
      .eq("user_id", user.id);

    if (myDiaries) {
      const diaryIds = myDiaries.map(d => d.id);
      
      const { data: likesData } = await supabase
        .from("diary_likes")
        .select(`
          *,
          profile:profiles!diary_likes_user_id_fkey(name, profile_photo_url),
          diary:diaries!diary_likes_diary_id_fkey(title, content)
        `)
        .in("diary_id", diaryIds)
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (likesData) setLikes(likesData);

      // 내 일기에 대한 댓글 가져오기
      const { data: commentsData } = await supabase
        .from("diary_comments")
        .select(`
          *,
          profile:profiles!diary_comments_user_id_fkey(name, profile_photo_url),
          diary:diaries!diary_comments_diary_id_fkey(title, content)
        `)
        .in("diary_id", diaryIds)
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (commentsData) setComments(commentsData);
    }

    setLoading(false);
  };

  const handleAcceptRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("friend_requests" as any)
      .update({ status: "accepted" } as any)
      .eq("id", requestId);

    if (error) {
      toast({
        title: "친구 요청 수락 실패",
        variant: "destructive",
      });
    } else {
      toast({
        title: "친구 요청을 수락했습니다!",
      });
      fetchNotifications();
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
      fetchNotifications();
    }
  };

  const totalNotifications = friendRequests.length + likes.length + comments.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>알림 ({totalNotifications})</SheetTitle>
          <SheetDescription>
            친구 요청, 좋아요, 댓글 알림을 확인하세요
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          <div className="space-y-6">
            {/* 친구 요청 */}
            {friendRequests.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  일기친구 요청 ({friendRequests.length})
                </h3>
                {friendRequests.map((request: any) => (
                  <div key={request.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={request.from_profile?.profile_photo_url} />
                      <AvatarFallback>
                        {request.from_profile?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-sm font-medium">{request.from_profile?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                        </p>
                      </div>
                      <div className="flex gap-2">
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
                ))}
              </div>
            )}

            {/* 좋아요 알림 */}
            {likes.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  좋아요 ({likes.length})
                </h3>
                {likes.map((like: any) => (
                  <button
                    key={like.id}
                    onClick={() => {
                      navigate(`/diary/${like.diary_id}`);
                      onOpenChange(false);
                    }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors w-full text-left"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={like.profile?.profile_photo_url} />
                      <AvatarFallback>
                        {like.profile?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{like.profile?.name}</span>
                        {" "}님이 회원님의 일기를 좋아합니다
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {like.diary?.title || like.diary?.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(like.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 댓글 알림 */}
            {comments.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  댓글 ({comments.length})
                </h3>
                {comments.map((comment: any) => (
                  <button
                    key={comment.id}
                    onClick={() => {
                      navigate(`/diary/${comment.diary_id}`);
                      onOpenChange(false);
                    }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors w-full text-left"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={comment.profile?.profile_photo_url} />
                      <AvatarFallback>
                        {comment.profile?.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{comment.profile?.name}</span>
                        {" "}님이 댓글을 남겼습니다
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {comment.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {totalNotifications === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">새로운 알림이 없습니다</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
