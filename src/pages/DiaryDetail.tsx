import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Edit, Heart, MessageCircle, Send } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function DiaryDetail() {
  const { id } = useParams();
  const [diary, setDiary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchDiary();
    fetchCurrentUser();
  }, [id]);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchDiary = async () => {
    const { data, error } = await supabase
      .from("diaries")
      .select(`
        *,
        photos!photos_diary_id_fkey (
          id,
          photo_url,
          display_order
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching diary:", error);
    }

    if (data) {
      setDiary(data);
      fetchLikes();
      fetchComments();
    }
    setLoading(false);
  };

  const fetchLikes = async () => {
    const { data } = await supabase
      .from("diary_likes")
      .select("*")
      .eq("diary_id", id);
    
    if (data) {
      setLikes(data);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLiked(data.some(like => like.user_id === user.id));
      }
    }
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from("diary_comments")
      .select(`
        *,
        profiles:user_id (
          name,
          profile_photo_url
        )
      `)
      .eq("diary_id", id)
      .order("created_at", { ascending: true });
    
    if (data) {
      setComments(data);
    }
  };

  const handleLike = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        variant: "destructive",
      });
      return;
    }

    if (isLiked) {
      await supabase
        .from("diary_likes")
        .delete()
        .eq("diary_id", id)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("diary_likes")
        .insert({
          diary_id: id,
          user_id: user.id,
        });
    }
    
    fetchLikes();
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "로그인이 필요합니다",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("diary_comments")
      .insert({
        diary_id: id,
        user_id: user.id,
        content: newComment.trim(),
      });

    if (error) {
      toast({
        title: "댓글 작성 실패",
        variant: "destructive",
      });
    } else {
      setNewComment("");
      fetchComments();
    }
  };

  const handleEdit = () => {
    navigate(`/upload/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-soft">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!diary) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-soft">
        <div className="text-center">
          <p className="mb-4">일기를 찾을 수 없습니다.</p>
          <Button onClick={() => navigate("/")}>홈으로</Button>
        </div>
      </div>
    );
  }

  const sortedPhotos = diary.photos?.sort((a: any, b: any) => a.display_order - b.display_order) || [];

  return (
    <div className="min-h-screen gradient-soft">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Card className="shadow-medium overflow-hidden">
          <CardContent className="p-0">
            {/* Photos Carousel */}
            {sortedPhotos.length > 0 && (
              <div className="aspect-[4/3] bg-muted relative">
                <Carousel className="w-full h-full">
                  <CarouselContent>
                    {sortedPhotos.map((photo: any, index: number) => (
                      <CarouselItem key={photo.id}>
                        <div className="relative w-full h-full aspect-[4/3]">
                          <img
                            src={photo.photo_url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {sortedPhotos.length > 1 && (
                    <>
                      <CarouselPrevious className="left-2" />
                      <CarouselNext className="right-2" />
                    </>
                  )}
                </Carousel>
              </div>
            )}

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {format(new Date(diary.created_at), "yyyy년 M월 d일 (EEE) HH:mm", { locale: ko })}
                </div>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </Button>
              </div>
              
              <div className="prose prose-sm max-w-none text-sm text-muted-foreground/80">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {diary.content}
                </p>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-3 pt-4 border-t">
                {diary.emoji && (
                  <span className="text-3xl">{diary.emoji}</span>
                )}
              </div>

              {/* Likes and Comments */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    className={`gap-2 ${isLiked ? "text-red-500" : ""}`}
                  >
                    <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
                    <span>{likes.length}</span>
                  </Button>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageCircle className="h-5 w-5" />
                    <span>{comments.length}</span>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {comment.profiles?.name || "익명"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), "yyyy.MM.dd HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/90">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comment Input */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="댓글을 입력하세요..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCommentSubmit();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleCommentSubmit}
                    disabled={!newComment.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
