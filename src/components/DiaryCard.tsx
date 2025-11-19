import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";

interface DiaryCardProps {
  diary: {
    id: string;
    content: string;
    created_at: string;
    title?: string | null;
    emoji?: string | null;
    weather?: string | null;
    perspective?: string | null;
    photos?: { photo_url: string }[];
    user_id?: string;
    author_name?: string | null;
    author_photo?: string | null;
  };
  onClick: () => void;
  showTime?: boolean;
  imageSize?: "sm" | "md";
  currentUserId?: string;
}

export default function DiaryCard({ 
  diary, 
  onClick, 
  showTime = true,
  imageSize = "md",
  currentUserId
}: DiaryCardProps) {
  const isMobile = useIsMobile();
  
  const sizeClasses = imageSize === "md" 
    ? "w-20 h-20 md:w-48 md:h-48" 
    : "w-20 h-20";
  
  const emojiSizeClasses = imageSize === "md"
    ? "text-3xl"
    : "text-2xl";

  const photoUrl = diary.photos && diary.photos.length > 0 ? diary.photos[0].photo_url : null;

  const weatherEmojis: { [key: string]: string } = {
    'sunny': '☀️',
    'partly_cloudy': '⛅',
    'cloudy': '☁️',
    'rainy': '🌧️',
    'stormy': '⛈️',
    'snowy': '🌨️'
  };

  const perspectiveLabels: { [key: string]: string } = {
    'camera': '📱 핸드폰',
    'pet': '🐾 애완동물',
    'friend': '👥 친구',
    'family': '👨‍👩‍👧 가족',
    'stranger': '🚶 낯선 사람',
    'old_man': '👴 동네 꼰대',
    'future': '🔮 미래의 나'
  };

  return (
    <div
      className="shadow-medium hover:shadow-lg transition-shadow cursor-pointer group bg-card rounded-lg border p-4"
      onClick={onClick}
    >
        <div className={`flex gap-4 ${isMobile ? 'flex-col' : ''}`}>
          {/* 썸네일 또는 이모티콘 */}
          <div className={`flex-shrink-0 ${isMobile ? 'w-full h-48' : sizeClasses} rounded-lg overflow-hidden bg-muted relative flex items-center justify-center`}>
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
          <div className={`flex-1 min-w-0 space-y-2 ${isMobile ? 'w-full' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {diary.title && (
                  <h3 className="text-base font-semibold mb-1 line-clamp-1">
                    {diary.title}
                  </h3>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>
                    {showTime 
                      ? format(new Date(diary.created_at), "yyyy년 M월 d일 (E) a h:mm", { locale: ko })
                      : format(new Date(diary.created_at), "yyyy년 M월 d일 (E)", { locale: ko })
                    }
                  </span>
                  {diary.weather && (
                    <span className="text-sm">
                      {weatherEmojis[diary.weather] || diary.weather}
                    </span>
                  )}
                </p>
                {currentUserId && diary.user_id !== currentUserId && (
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={diary.author_photo || undefined} />
                      <AvatarFallback className="text-xs">
                        {diary.author_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-xs text-muted-foreground">
                      by {diary.author_name || "Unknown"}
                    </p>
                  </div>
                )}
                {currentUserId && diary.user_id === currentUserId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    by me
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed font-medium">
              {diary.content}
            </p>
          </div>
        </div>
      </div>
    );
  }
