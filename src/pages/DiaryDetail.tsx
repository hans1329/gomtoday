import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Edit, Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function DiaryDetail() {
  const { id } = useParams();
  const [diary, setDiary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isLikingRef = useRef(false);
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
        ),
        photo:photos!diaries_photo_id_fkey (
          id,
          photo_url
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching diary:", error);
    }

    if (data) {
      // 오래된 방식과 새 방식 모두 처리
      let allPhotos = [];
      
      if (data.photos && data.photos.length > 0) {
        allPhotos = data.photos.sort((a: any, b: any) => a.display_order - b.display_order);
      } else if (data.photo) {
        allPhotos = [data.photo];
      }
      
      setDiary({
        ...data,
        photos: allPhotos
      });
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
    if (isLikingRef.current) return;
    isLikingRef.current = true;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      isLikingRef.current = false;
      toast({
        title: "로그인이 필요합니다",
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    const wasLiked = isLiked;
    const previousLikes = [...likes];
    
    if (wasLiked) {
      setIsLiked(false);
      setLikes(likes.filter(like => like.user_id !== user.id));
    } else {
      setIsLiked(true);
      setLikes([...likes, { user_id: user.id, diary_id: id }]);
    }
    
    try {
      if (wasLiked) {
        const { error } = await supabase
          .from("diary_likes")
          .delete()
          .eq("diary_id", id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("diary_likes")
          .insert({
            diary_id: id,
            user_id: user.id,
          });
        // 409 에러는 이미 좋아요가 존재하는 것이므로 무시
        if (error && error.code !== '23505') throw error;
      }
    } catch (error: any) {
      // Rollback on error
      setIsLiked(wasLiked);
      setLikes(previousLikes);
      toast({
        title: "오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        isLikingRef.current = false;
      }, 300); // 300ms 디바운스
    }
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

  const handleDelete = async () => {
    if (deleting) return;
    
    setDeleting(true);
    try {
      // 일기에 연결된 사진들 먼저 삭제
      const { data: photos } = await supabase
        .from("photos")
        .select("photo_url")
        .eq("diary_id", id);

      if (photos) {
        for (const photo of photos) {
          const fileName = photo.photo_url.split("/").slice(-2).join("/");
          await supabase.storage.from("photos").remove([fileName]);
        }
      }

      // 사진 레코드 삭제
      await supabase.from("photos").delete().eq("diary_id", id);

      // 댓글 삭제
      await supabase.from("diary_comments").delete().eq("diary_id", id);

      // 좋아요 삭제
      await supabase.from("diary_likes").delete().eq("diary_id", id);

      // 일기장 연결 삭제
      await supabase.from("diary_notebooks").delete().eq("diary_id", id);

      // 일기 삭제
      const { error } = await supabase
        .from("diaries")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "일기가 삭제되었습니다",
      });

      navigate("/");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
      setDeleting(false);
    }
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
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  {format(new Date(diary.created_at), "yyyy년 M월 d일 (EEE) a h:mm", { locale: ko })}
                </div>
                {diary.emoji && (
                  <span className="text-2xl">{diary.emoji}</span>
                )}
              </div>
              
              {diary.title && (
                <h2 className="text-xl font-bold text-foreground">
                  {diary.title}
                </h2>
              )}
              
              <div className="prose prose-sm max-w-none text-sm text-muted-foreground/80">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {diary.content}
                </p>
              </div>

              {/* Edit/Delete Buttons */}
              <div className="flex gap-2 pt-2 sm:justify-end">
                <Button variant="outline" size="sm" onClick={handleEdit} className="flex-1 sm:flex-none">
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setDeleteDialogOpen(true)}
                  className="flex-1 sm:flex-none text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              </div>

              {/* Likes and Comments */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    className={`gap-2 ${isLiked ? "text-red-500" : ""}`}
                  >
                    <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
                    <span>{likes.length}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground cursor-default hover:bg-transparent"
                  >
                    <MessageCircle className="h-5 w-5" />
                    <span>{comments.length}</span>
                  </Button>
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
                <div className="relative">
                  <Textarea
                    placeholder="댓글을 입력하세요..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] resize-none pr-12"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCommentSubmit();
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCommentSubmit}
                    disabled={!newComment.trim()}
                    className="absolute bottom-2 right-2 h-8 w-8"
                  >
                    <Send className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[calc(100%-1rem)] sm:max-w-lg mx-2 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">일기를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              이 작업은 되돌릴 수 없습니다. 일기와 관련된 모든 사진, 댓글, 좋아요가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              className="w-full sm:w-auto text-sm sm:text-base order-2 sm:order-1"
              disabled={deleting}
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="w-full sm:w-auto text-sm sm:text-base order-1 sm:order-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
