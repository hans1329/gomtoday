import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface DiaryCardProps {
  diary: {
    id: string;
    content: string;
    created_at: string;
    emoji?: string | null;
    photos?: { photo_url: string }[];
  };
  onClick: () => void;
  showTime?: boolean;
  imageSize?: "sm" | "md";
}

export default function DiaryCard({ 
  diary, 
  onClick, 
  showTime = true,
  imageSize = "md" 
}: DiaryCardProps) {
  const sizeClasses = imageSize === "md" 
    ? "w-20 h-20 md:w-32 md:h-32" 
    : "w-20 h-20";
  
  const emojiSizeClasses = imageSize === "md"
    ? "text-3xl"
    : "text-2xl";

  const photoUrl = diary.photos && diary.photos.length > 0 ? diary.photos[0].photo_url : null;

  return (
    <Card
      className="shadow-medium hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* 썸네일 또는 이모티콘 */}
          <div className={`flex-shrink-0 ${sizeClasses} rounded-lg overflow-hidden bg-muted relative flex items-center justify-center`}>
            {photoUrl ? (
              <>
                <img
                  src={photoUrl}
                  alt="일기 사진"
                  className="w-full h-full object-cover"
                />
                {diary.emoji && (
                  <div className="absolute bottom-1 right-1 bg-background/90 rounded-full w-7 h-7 flex items-center justify-center text-base shadow-sm">
                    {diary.emoji}
                  </div>
                )}
              </>
            ) : (
              diary.emoji && (
                <div className={emojiSizeClasses}>
                  {diary.emoji}
                </div>
              )
            )}
          </div>

          {/* 내용 */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {showTime 
                    ? format(new Date(diary.created_at), "yyyy년 M월 d일 (E) a h:mm", { locale: ko })
                    : format(new Date(diary.created_at), "yyyy년 M월 d일 (E)", { locale: ko })
                  }
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {diary.content}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
