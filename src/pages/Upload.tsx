import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, Loader2, ArrowLeft, Trash2, ChevronUp, ChevronDown, CalendarIcon, X, PenLine, Pencil, Plus } from "lucide-react";
import { format } from "date-fns";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ko } from "date-fns/locale";
import { cn, optimizeImage } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import RichTextEditor from "@/components/RichTextEditor";
export default function Upload() {
  const { id } = useParams();
  const isEditMode = !!id;
  const contentSectionRef = useRef<HTMLDivElement>(null);
  const [writeMode, setWriteMode] = useState<"ai" | "manual">("ai");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [emotion, setEmotion] = useState("happy");
  const [length, setLength] = useState("medium");
  const [perspective, setPerspective] = useState("my_view");
  const [weather, setWeather] = useState("unknown");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Array<{id: string, name: string, profile_photo_url?: string}>>([]);
  const [friends, setFriends] = useState<Array<{id: string, name: string, profile_photo_url?: string}>>([]);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [currentUser, setCurrentUser] = useState<{id: string, name: string, profile_photo_url?: string} | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedEmoji, setGeneratedEmoji] = useState("");
  const [currentDiaryId, setCurrentDiaryId] = useState<string | null>(null);
  const [confirmGenerateDialogOpen, setConfirmGenerateDialogOpen] = useState(false);
  const [pencilCount, setPencilCount] = useState(0);
  const [generationCost, setGenerationCost] = useState(0);
  const [confirmRegenerateDialogOpen, setConfirmRegenerateDialogOpen] = useState(false);
  const [confirmCancelDialogOpen, setConfirmCancelDialogOpen] = useState(false);
  const [writeCost, setWriteCost] = useState(0);
  const [perspectives, setPerspectives] = useState<Array<{
    perspective_key: string;
    label: string;
    emoji: string | null;
    is_new: boolean;
  }>>([]);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    loadCurrentUser();
    fetchPencilInfo();
    fetchFriends();
    fetchPerspectives();
    if (isEditMode) {
      loadDiaryData();
      fetchNotebooks();
    } else {
      fetchNotebooks();
      checkDraftDiary();
    }
  }, [id]);

  // 일기장 선택 시 해당 일기장의 멤버를 자동으로 로드
  useEffect(() => {
    if (selectedNotebook && currentUser) {
      fetchNotebookMembers(selectedNotebook);
    }
  }, [selectedNotebook, currentUser]);

  // 직접입력 모드에서 날짜 변경 시 해당 날짜의 일기 확인
  useEffect(() => {
    if (!isEditMode && writeMode === "manual" && currentUser) {
      checkExistingDiaryForDate();
    }
  }, [selectedDate, writeMode, isEditMode, currentUser]);

  // currentUser가 로드된 후 일기 데이터 다시 처리
  useEffect(() => {
    if (currentUser && isEditMode) {
      loadDiaryData();
    }
  }, [currentUser]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, profile_photo_url")
      .eq("user_id", user.id)
      .single();

    const userData = {
      id: user.id,
      name: profile?.name || "나",
      profile_photo_url: profile?.profile_photo_url ? `${profile.profile_photo_url}?t=${Date.now()}` : undefined
    };
    setCurrentUser(userData);
    // 디폴트로 현재 사용자를 등장인물에 추가
    setParticipants([userData]);
  };

  // 시점 목록 가져오기
  const fetchPerspectives = async () => {
    const { data } = await supabase
      .from("perspectives")
      .select("perspective_key, label, emoji, is_new")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (data) {
      setPerspectives(data);
    }
  };

  // 연필 정보 가져오기
  const fetchPencilInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 사용자의 연필 개수 가져오기
    const { data: profile } = await supabase
      .from("profiles")
      .select("pencil_count")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      setPencilCount(profile.pencil_count);
    }

    // 일기 생성 비용 가져오기
    const { data: generationSetting } = await supabase
      .from("pencil_settings")
      .select("setting_value")
      .eq("setting_key", "diary_generation_cost")
      .single();

    if (generationSetting) {
      setGenerationCost(generationSetting.setting_value);
    }

    // 일기 작성 비용 가져오기
    const { data: writeSetting } = await supabase
      .from("pencil_settings")
      .select("setting_value")
      .eq("setting_key", "diary_write_cost")
      .single();

    if (writeSetting) {
      setWriteCost(writeSetting.setting_value);
    }
  };

  // 일기 생성하기 확인
  const handleGenerateClick = () => {
    if (pencilCount < generationCost) {
      toast({
        title: "연필이 부족해요",
        description: `일기 생성에는 연필 ${generationCost}개가 필요합니다. (현재: ${pencilCount}개)`,
        variant: "destructive",
      });
      return;
    }
    setConfirmGenerateDialogOpen(true);
  };

  // 연필 차감 후 일기 생성
  const handleConfirmGenerate = async () => {
    setConfirmGenerateDialogOpen(false);
    
    // 연필 차감
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: deductError } = await supabase
      .from("profiles")
      .update({ pencil_count: pencilCount - generationCost })
      .eq("user_id", user.id);

    if (deductError) {
      toast({
        title: "연필 차감 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 연필 개수 업데이트 이벤트 발생
    window.dispatchEvent(new CustomEvent('pencil-updated'));

    setPencilCount(pencilCount - generationCost);
    handleGenerateDiary();
  };

  // 임시 저장된 일기 확인
  const checkDraftDiary = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 일기장에 연결되지 않고 status가 draft인 일기 중 가장 최근 것 찾기
    const { data: diaries } = await supabase
      .from("diaries")
      .select(`
        *,
        diary_notebooks(notebook_id)
      `)
      .eq("user_id", user.id)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!diaries || diaries.length === 0) return;

    // 가장 최근의 임시 저장 일기 사용
    const draftDiary = diaries[0];

    if (draftDiary) {
      // 임시 저장된 일기 발견
      setCurrentDiaryId(draftDiary.id);
      setContent(draftDiary.content || "");
      setTitle(draftDiary.title || "");
      setGeneratedContent(draftDiary.content || "");
      setGeneratedTitle(draftDiary.title || "");
      setGeneratedEmoji(draftDiary.emoji || "");
      setIsGenerated(true);
      setEmotion(draftDiary.tone || "happy");
      setLength(draftDiary.length || "medium");
      setWeather(draftDiary.weather || "sunny");
      setPerspective(draftDiary.perspective || "camera");
      setSelectedDate(new Date(draftDiary.created_at || new Date()));
      
      if (draftDiary.participants) {
        setParticipants(draftDiary.participants as Array<{id: string, name: string, profile_photo_url?: string}>);
      }

      // 연결된 사진들 불러오기
      const { data: photos } = await supabase
        .from("photos")
        .select("*")
        .eq("diary_id", draftDiary.id)
        .order("display_order");

      if (photos && photos.length > 0) {
        setExistingPhotos(photos);
        setPreviewUrls(photos.map(p => p.photo_url));
      }

      toast({
        title: "임시 저장된 일기가 있어요",
        description: "계속 작성하거나 수정할 수 있어요."
      });
    }
  };

  // 직접입력 모드에서 선택한 날짜의 일기가 있는지 확인
  const checkExistingDiaryForDate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: existingDiary } = await supabase
      .from("diaries")
      .select(`
        *,
        photos!photos_diary_id_fkey (
          id,
          photo_url,
          display_order
        ),
        diary_notebooks (
          notebook_id
        )
      `)
      .eq("user_id", user.id)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .maybeSingle();

    if (existingDiary) {
      // 해당 날짜에 일기가 이미 있으면 수정 모드로 전환
      setCurrentDiaryId(existingDiary.id);
      setContent(existingDiary.content || "");
      setTitle(existingDiary.title || "");
      setEmotion(existingDiary.tone || "happy");
      setWeather(existingDiary.weather || "sunny");
      
      // 등장인물 로드 (현재 사용자 포함)
      if (existingDiary.participants && Array.isArray(existingDiary.participants)) {
        const loadedParticipants = existingDiary.participants as Array<{id: string, name: string, profile_photo_url?: string}>;
        
        // 현재 사용자가 등장인물에 없으면 추가
        const hasCurrentUser = loadedParticipants.some(p => p.id === user.id);
        if (!hasCurrentUser && currentUser) {
          setParticipants([currentUser, ...loadedParticipants]);
        } else if (loadedParticipants.length > 0) {
          setParticipants(loadedParticipants);
        } else if (currentUser) {
          setParticipants([currentUser]);
        }
      } else if (currentUser) {
        setParticipants([currentUser]);
      }

      if (existingDiary.photos && existingDiary.photos.length > 0) {
        setExistingPhotos(existingDiary.photos);
        setPreviewUrls(existingDiary.photos.map((p: any) => p.photo_url));
      } else {
        setExistingPhotos([]);
        setPreviewUrls([]);
      }

      const notebookIds = existingDiary.diary_notebooks?.map((dn: any) => dn.notebook_id) || [];
      setSelectedNotebook(notebookIds[0] || null);

      toast({
        title: "이 날짜의 일기가 있어요",
        description: "수정 모드로 전환됩니다."
      });
    } else {
      // 해당 날짜에 일기가 없으면 초기화 (등장인물은 유지)
      setCurrentDiaryId(null);
      setContent("");
      setTitle("");
      setExistingPhotos([]);
      setPreviewUrls([]);
    }
  };

  const loadDiaryData = async () => {
    if (!id) return;
    
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: diary, error } = await supabase
      .from("diaries")
      .select(`
        *,
        photos!photos_diary_id_fkey (
          id,
          photo_url,
          display_order
        ),
        diary_notebooks (
          notebook_id
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !diary) {
      toast({
        title: "일기를 찾을 수 없습니다",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    // 기존 데이터로 초기화
    setEmotion(diary.tone || "happy");
    setLength(diary.length || "medium");
    setWeather(diary.weather || "sunny");
    setExistingPhotos(diary.photos || []);
    setPreviewUrls((diary.photos || []).map((p: any) => p.photo_url));
    setContent(diary.content || "");
    setTitle(diary.title || "");
    setSelectedDate(new Date(diary.created_at));
    
    // 선택된 일기장 설정 (첫 번째 일기장만)
    const notebookIds = diary.diary_notebooks?.map((dn: any) => dn.notebook_id) || [];
    setSelectedNotebook(notebookIds[0] || null);
    
    // 등장인물 로드
    if (diary.participants && Array.isArray(diary.participants)) {
      const loadedParticipants = diary.participants as Array<{id: string, name: string, profile_photo_url?: string}>;
      
      // 현재 사용자가 등장인물에 없으면 추가
      const hasCurrentUser = loadedParticipants.some(p => p.id === user.id);
      if (!hasCurrentUser && currentUser) {
        setParticipants([currentUser, ...loadedParticipants]);
      } else if (loadedParticipants.length > 0) {
        setParticipants(loadedParticipants);
      } else if (currentUser) {
        setParticipants([currentUser]);
      }
    } else if (currentUser) {
      // participants가 없으면 현재 사용자만 추가
      setParticipants([currentUser]);
    }
    
    setLoading(false);
  };

  const fetchNotebooks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notebooks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (data) {
      // visibility가 private인 일기장을 제일 위로 정렬
      const sorted = [...data].sort((a, b) => {
        const aIsPrivate = a.visibility === "private";
        const bIsPrivate = b.visibility === "private";
        
        if (aIsPrivate && !bIsPrivate) return -1;
        if (!aIsPrivate && bIsPrivate) return 1;
        return 0;
      });
      
      setNotebooks(sorted);
      
      // private 일기장을 기본으로 선택 (edit 모드가 아닐 때만)
      if (!isEditMode) {
        const privateNotebook = sorted.find(nb => nb.visibility === "private");
        if (privateNotebook) {
          setSelectedNotebook(privateNotebook.id);
        }
      }
    }
  };

  const fetchFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        from_user_id,
        to_user_id,
        from_profile:profiles!friend_requests_from_user_id_fkey(user_id, name, profile_photo_url),
        to_profile:profiles!friend_requests_to_user_id_fkey(user_id, name, profile_photo_url)
      `)
      .eq('status', 'accepted')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

    if (error) {
      console.error('Error fetching friends:', error);
      return;
    }

    const friendsList = data?.map((fr: any) => {
      const isSender = fr.from_user_id === user.id;
      const profile = isSender ? fr.to_profile : fr.from_profile;
      return {
        id: profile.user_id,
        name: profile.name || '이름 없음',
        profile_photo_url: profile.profile_photo_url ? `${profile.profile_photo_url}?t=${Date.now()}` : undefined
      };
    }) || [];

    setFriends(friendsList);
  };

  // 일기장의 멤버를 가져오는 함수
  const fetchNotebookMembers = async (notebookId: string) => {
    if (!currentUser) return;

    const { data: members } = await supabase
      .from("notebook_members")
      .select("user_id")
      .eq("notebook_id", notebookId);

    if (members && members.length > 0) {
      const userIds = members.map(m => m.user_id);
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, profile_photo_url")
        .in("user_id", userIds);

      const membersList = profiles?.map((profile: any) => ({
        id: profile.user_id,
        name: profile.name || "사용자",
        profile_photo_url: profile.profile_photo_url ? `${profile.profile_photo_url}?t=${Date.now()}` : undefined
      })) || [];

      // 현재 사용자가 포함되어 있지 않으면 추가
      const hasCurrentUser = membersList.some((m: any) => m.id === currentUser.id);
      if (!hasCurrentUser) {
        setParticipants([currentUser, ...membersList]);
      } else {
        setParticipants(membersList);
      }
    } else {
      // 멤버가 없으면 현재 사용자만 표시
      setParticipants([currentUser]);
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = [...selectedFiles, ...files];
    
    if (newFiles.length > 6) {
      toast({
        title: "사진이 너무 많아요",
        description: "최대 6장까지만 선택할 수 있어요.",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newFiles.map(file => URL.createObjectURL(file)));
  };

  const movePhoto = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...selectedFiles];
    const newUrls = [...previewUrls];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newFiles.length) return;
    
    [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
    [newUrls[index], newUrls[targetIndex]] = [newUrls[targetIndex], newUrls[index]];
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  const removePhoto = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    const newExisting = existingPhotos.filter((_, i) => i !== index);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
    setExistingPhotos(newExisting);
  };
  const cancelUpload = () => {
    setUploading(false);
    setUploadProgress(0);
    setUploadStatus("");
  };

  // 일기 생성 함수 (AI 분석 및 임시 저장)
  const handleGenerateDiary = async () => {
    if (uploading || isGenerated) return;

    if (selectedFiles.length < 1) {
      toast({
        title: "사진이 필요해요",
        description: "최소 1장의 사진을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setUploadStatus("사진 업로드 준비 중...");

    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      setUploadStatus("사진 업로드 중...");
      setUploadProgress(20);

      const photoUrls: string[] = [];
      const photoIds: string[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // 이미지 최적화 (리사이즈 + WebP 변환)
        const optimizedFile = await optimizeImage(file);
        
        const fileExt = 'webp'; // 항상 webp로 저장
        const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;
        
        // Convert to base64
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]); // Remove data:image/xxx;base64, prefix
          };
          reader.readAsDataURL(optimizedFile);
        });
        
        const {
          error: uploadError
        } = await supabase.storage.from("photos").upload(fileName, optimizedFile);
        if (uploadError) throw uploadError;
        const {
          data: {
            publicUrl
          }
        } = supabase.storage.from("photos").getPublicUrl(fileName);
        
        // Insert photo with base64 in metadata
        const { data: photoData, error: photoError } = await supabase
          .from("photos")
          .insert({
            user_id: user.id,
            photo_url: publicUrl,
            metadata: {
              base64: base64Data,
              mimeType: file.type || 'image/jpeg'
            }
          })
          .select()
          .single();
        
        if (photoError) throw photoError;
        
        photoUrls.push(publicUrl);
        photoIds.push(photoData.id);
        setUploadProgress(20 + ((i + 1) / selectedFiles.length) * 30);
      }

      setUploadStatus("누군가 일기를 작성하고 있어요...");
      setUploadProgress(60);

      const {
        data: aiResponse,
        error: aiError
      } = await supabase.functions.invoke("analyze-photo", {
        body: {
          photoIds,
          photoUrls: photoUrls,
          emotion,
          length,
          perspective,
          participants: participants,
          userId: user.id
        }
      });
      if (aiError) throw aiError;

      setUploadProgress(80);
      setUploadStatus("일기를 임시 저장하고 있어요...");

      // 임시 일기 생성 (일기장 연결 없이, status는 draft)
      const {
        data: diaryData,
        error: diaryError
      } = await supabase.from("diaries").insert({
        user_id: user.id,
        content: aiResponse.diary,
        title: aiResponse.title,
        emoji: aiResponse.emoji,
        tone: emotion,
        length,
        weather,
        perspective,
        participants: participants,
        created_at: selectedDate.toISOString(),
        status: 'draft'
      }).select().single();
      if (diaryError) throw diaryError;

      // 사진을 일기에 연결
      for (let i = 0; i < photoUrls.length; i++) {
        await supabase.from("photos").insert({
          user_id: user.id,
          photo_url: photoUrls[i],
          diary_id: diaryData.id,
          display_order: i
        });
      }

      setUploadProgress(100);
      
      // 텍스트를 HTML로 변환 (줄바꿈 처리)
      const htmlContent = aiResponse.diary
        .split('\n\n')
        .map((paragraph: string) => `<p>${paragraph.trim().replace(/\n/g, '<br>')}</p>`)
        .join('');
      
      setGeneratedContent(htmlContent);
      setGeneratedTitle(aiResponse.title);
      setGeneratedEmoji(aiResponse.emoji);
      setContent(htmlContent);
      setTitle(aiResponse.title);
      setCurrentDiaryId(diaryData.id);
      setIsGenerated(true);
      
      // 일기 내용 섹션으로 스크롤
      setTimeout(() => {
        contentSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
      
      toast({
        title: "일기가 생성되었어요!",
        description: "내용을 확인하고 수정하세요."
      });
    } catch (error: any) {
      console.error("일기 생성 실패:", error);
      
      // 연필 환불
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: refundError } = await supabase
          .from("profiles")
          .update({ pencil_count: pencilCount + generationCost })
          .eq("user_id", user.id);
        
        if (!refundError) {
          setPencilCount(pencilCount + generationCost);
          window.dispatchEvent(new CustomEvent('pencil-updated'));
        }
      }
      
      toast({
        title: "일기 생성 실패",
        description: error.message || "다시 시도해주세요. (연필이 환불되었습니다)",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus("");
    }
  };

  // 최종 저장 함수 (일기장 연결 및 알림)
  const handleSave = async () => {
    if (!currentDiaryId || !selectedNotebook) {
      toast({
        title: "일기장을 선택해주세요",
        variant: "destructive"
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "일기 내용을 입력해주세요",
        variant: "destructive"
      });
      return;
    }

    // 연필 체크
    if (pencilCount < writeCost) {
      toast({
        title: "연필이 부족해요",
        description: `일기 저장에는 연필 ${writeCost}개가 필요합니다. (현재: ${pencilCount}개)`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // 연필 차감
      const { error: deductError } = await supabase
        .from("profiles")
        .update({ pencil_count: pencilCount - writeCost })
        .eq("user_id", user.id);

      if (deductError) throw deductError;

      setPencilCount(pencilCount - writeCost);
      
      // 연필 개수 업데이트 이벤트 발생
      window.dispatchEvent(new CustomEvent('pencil-updated'));

      // 일기 내용 업데이트 및 상태를 published로 변경
      const {
        error: updateError
      } = await supabase.from("diaries").update({
        content: content,
        title: title,
        emoji: generatedEmoji,
        participants: participants,
        status: 'published'
      }).eq("id", currentDiaryId);
      if (updateError) throw updateError;

      // 일기장에 연결
      await supabase
        .from("diary_notebooks")
        .insert({
          diary_id: currentDiaryId,
          notebook_id: selectedNotebook
        });

      // 등장인물에게 알림 전송
      const mentionedUsers = participants.filter(p => p.id !== user.id);
      if (mentionedUsers.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", user.id)
          .single();
        
        const authorName = profileData?.name || "사용자";
        
        for (const participant of mentionedUsers) {
          await supabase.from("notifications").insert({
            user_id: participant.id,
            type: "diary_mention",
            title: "일기에 등장했어요!",
            message: `${authorName}님의 일기에 회원님이 등장했어요`,
            link: `/diary/${currentDiaryId}`,
            metadata: {
              diary_id: currentDiaryId,
              from_user_id: user.id,
              from_user_name: authorName
            }
          });
        }
      }

      toast({
        title: "일기가 저장되었어요!",
        description: `연필 ${writeCost}개가 차감되었습니다.`,
      });
      
      // 홈 화면 캐시 무효화
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('home_data_') || key.startsWith('diaries_')) {
          localStorage.removeItem(key);
        }
      });
      
      navigate("/");
    } catch (error: any) {
      console.error("일기 저장 실패:", error);
      toast({
        title: "일기 저장 실패",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 직접 입력 모드 저장 함수
  const handleSaveManual = async () => {
    if (!selectedNotebook) {
      toast({
        title: "일기장을 선택해주세요",
        variant: "destructive"
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "일기 내용을 입력해주세요",
        variant: "destructive"
      });
      return;
    }

    // 연필 체크
    if (pencilCount < writeCost) {
      toast({
        title: "연필이 부족해요",
        description: `일기 저장에는 연필 ${writeCost}개가 필요합니다. (현재: ${pencilCount}개)`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // 연필 차감
      const { error: deductError } = await supabase
        .from("profiles")
        .update({ pencil_count: pencilCount - writeCost })
        .eq("user_id", user.id);

      if (deductError) throw deductError;

      setPencilCount(pencilCount - writeCost);
      
      // 연필 개수 업데이트 이벤트 발생
      window.dispatchEvent(new CustomEvent('pencil-updated'));

      // 사진 업로드 (있는 경우)
      const photoUrls: string[] = [];
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;
          const {
            error: uploadError
          } = await supabase.storage.from("photos").upload(fileName, file);
          if (uploadError) throw uploadError;
          const {
            data: {
              publicUrl
            }
          } = supabase.storage.from("photos").getPublicUrl(fileName);
          photoUrls.push(publicUrl);
        }
      }

      // 일기 생성 또는 수정
      let diaryData;
      if (currentDiaryId) {
        // 기존 일기 수정
        const { data: updatedDiary, error: updateError } = await supabase
          .from("diaries")
          .update({
            content: content,
            title: title || "제목 없음",
            emoji: generatedEmoji || "📝",
            tone: emotion,
            weather,
            perspective: null,
            participants: participants,
            status: 'published'
          })
          .eq("id", currentDiaryId)
          .select()
          .single();

        if (updateError) throw updateError;
        diaryData = updatedDiary;
      } else {
        // 새 일기 생성
        const { data: newDiary, error: insertError } = await supabase
          .from("diaries")
          .insert({
            user_id: user.id,
            content: content,
            title: title || "제목 없음",
            emoji: generatedEmoji || "📝",
            tone: emotion,
            weather,
            perspective: null,
            participants: participants,
            created_at: selectedDate.toISOString(),
            status: 'published'
          })
          .select()
          .single();

        if (insertError) throw insertError;
        diaryData = newDiary;
      }

      // 사진 연결
      for (let i = 0; i < photoUrls.length; i++) {
        const {
          error: photoError
        } = await supabase.from("photos").insert({
          user_id: user.id,
          photo_url: photoUrls[i],
          diary_id: diaryData.id,
          display_order: i
        });
        if (photoError) throw photoError;
      }

      // 일기장에 연결
      await supabase
        .from("diary_notebooks")
        .insert({
          diary_id: diaryData.id,
          notebook_id: selectedNotebook
        });

      // 등장인물에게 알림 전송
      const mentionedUsers = participants.filter(p => p.id !== user.id);
      if (mentionedUsers.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", user.id)
          .single();
        
        const authorName = profileData?.name || "사용자";
        
        for (const participant of mentionedUsers) {
          await supabase.from("notifications").insert({
            user_id: participant.id,
            type: "diary_mention",
            title: "일기에 등장했어요!",
            message: `${authorName}님의 일기에 회원님이 등장했어요`,
            link: `/diary/${diaryData.id}`,
            metadata: {
              diary_id: diaryData.id,
              from_user_id: user.id,
              from_user_name: authorName
            }
          });
        }
      }

      toast({
        title: "일기가 저장되었어요!",
        description: `연필 ${writeCost}개가 차감되었습니다.`,
      });
      
      // 홈 화면 캐시 무효화
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('home_data_') || key.startsWith('diaries_')) {
          localStorage.removeItem(key);
        }
      });
      
      navigate("/");
    } catch (error: any) {
      console.error("일기 저장 실패:", error);
      toast({
        title: "일기 저장 실패",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (uploading) return;

    const totalPhotos = (existingPhotos.length || 0) + selectedFiles.length;
    
    if (totalPhotos < 1) {
      toast({
        title: "사진이 필요해요",
        description: "최소 1장의 사진을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }
    
    setUploading(true);
    setUploadProgress(10);
    setUploadStatus("사진 업로드 준비 중...");
    
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    
    try {
      let diaryId = id;
      
      if (isEditMode) {
        // 편집 모드: 일기 업데이트
        if (!content.trim()) {
          toast({
            title: "내용을 입력해주세요",
            variant: "destructive",
          });
          setUploading(false);
          return;
        }

        if (!selectedNotebook) {
          toast({
            title: "일기장을 선택해주세요",
            variant: "destructive",
          });
          setUploading(false);
          return;
        }

        setUploadStatus("일기 업데이트 중...");
        setUploadProgress(20);
        
        const { error: updateError } = await supabase
          .from("diaries")
          .update({
            tone: emotion,
            length,
            weather,
            content: content.trim(),
            title: title.trim() || "무제",
            emoji: generatedEmoji,
            perspective,
            participants: participants
          })
          .eq("id", id);
        
        if (updateError) throw updateError;

        // 일기장 연결 업데이트
        setUploadProgress(40);
        await supabase
          .from("diary_notebooks")
          .delete()
          .eq("diary_id", id);

        await supabase
          .from("diary_notebooks")
          .insert({
            diary_id: id,
            notebook_id: selectedNotebook
          });
        
        // 새로운 사진만 업로드
        if (selectedFiles.length > 0) {
          setUploadStatus("사진 업로드 중...");
          setUploadProgress(60);
          
          for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;
            const {
              error: uploadError
            } = await supabase.storage.from("photos").upload(fileName, file);
            if (uploadError) throw uploadError;
            const {
              data: {
                publicUrl
              }
            } = supabase.storage.from("photos").getPublicUrl(fileName);
            const {
              error: photoError
            } = await supabase.from("photos").insert({
              user_id: user.id,
              photo_url: publicUrl,
              diary_id: id,
              display_order: existingPhotos.length + i
            });
            if (photoError) throw photoError;
            setUploadProgress(60 + ((i + 1) / selectedFiles.length) * 30);
          }
        }
        
        setUploadProgress(100);
        
        // 등장인물에게 알림 전송
        const mentionedUsers = participants.filter(p => p.id !== user.id);
        if (mentionedUsers.length > 0) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("name")
            .eq("user_id", user.id)
            .single();
          
          const authorName = profileData?.name || "사용자";
          
          for (const participant of mentionedUsers) {
            await supabase.from("notifications").insert({
              user_id: participant.id,
              type: "diary_mention",
              title: "일기에 등장했어요!",
              message: `${authorName}님의 일기에 회원님이 등장했어요`,
              link: `/diary/${id}`,
              metadata: {
                diary_id: id,
                from_user_id: user.id,
                from_user_name: authorName
              }
            });
          }
        }
        
        toast({
          title: "일기가 수정되었어요!",
        });
        
        // 홈 화면 캐시 무효화
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('home_data_') || key.startsWith('diaries_')) {
            localStorage.removeItem(key);
          }
        });
        
        navigate("/");
      } else {
        // 새로 작성 모드
        setUploadStatus("일기 생성 중...");
        setUploadProgress(20);
        
        const {
          data: diaryData,
          error: diaryError
        } = await supabase.from("diaries").insert({
          user_id: user.id,
          content: "",
          tone: emotion,
          length,
          weather,
          perspective,
          participants: participants,
          created_at: selectedDate.toISOString()
        }).select().single();
        if (diaryError) throw diaryError;
        
        diaryId = diaryData.id;
        
        setUploadStatus("사진 업로드 중...");
        setUploadProgress(30);
        
        const photoUrls: string[] = [];
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;
          const {
            error: uploadError
          } = await supabase.storage.from("photos").upload(fileName, file);
          if (uploadError) throw uploadError;
          const {
            data: {
              publicUrl
            }
          } = supabase.storage.from("photos").getPublicUrl(fileName);
          const {
            error: photoError
          } = await supabase.from("photos").insert({
            user_id: user.id,
            photo_url: publicUrl,
            diary_id: diaryData.id,
            display_order: i
          });
          if (photoError) throw photoError;
          photoUrls.push(publicUrl);
          setUploadProgress(30 + ((i + 1) / selectedFiles.length) * 30);
        }
        
        setUploadStatus("누군가 일기를 작성하고 있어요...");
        setUploadProgress(70);
        
        const {
          data: aiResponse,
          error: aiError
        } = await supabase.functions.invoke("analyze-photo", {
          body: {
            photoUrls: photoUrls,
            emotion,
            length,
            perspective
          }
        });
        if (aiError) throw aiError;
        
        setUploadProgress(90);
        setUploadStatus("일기를 저장하고 있어요...");
        
        const {
          error: updateError
        } = await supabase.from("diaries").update({
          content: aiResponse.content,
          title: aiResponse.title,
          emoji: aiResponse.emoji
        }).eq("id", diaryData.id);
        if (updateError) throw updateError;
        
        // 선택한 일기장에 연결
        if (selectedNotebook) {
          await supabase
            .from("diary_notebooks")
            .insert({
              diary_id: diaryData.id,
              notebook_id: selectedNotebook
            });
        }
        
        setUploadProgress(100);
        
        // 등장인물에게 알림 전송
        const mentionedUsers = participants.filter(p => p.id !== user.id);
        if (mentionedUsers.length > 0) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("name")
            .eq("user_id", user.id)
            .single();
          
          const authorName = profileData?.name || "사용자";
          
          for (const participant of mentionedUsers) {
            await supabase.from("notifications").insert({
              user_id: participant.id,
              type: "diary_mention",
              title: "일기에 등장했어요!",
              message: `${authorName}님의 일기에 회원님이 등장했어요`,
              link: `/diary/${diaryData.id}`,
              metadata: {
                diary_id: diaryData.id,
                from_user_id: user.id,
                from_user_name: authorName
              }
            });
          }
        }
        
        // 홈 화면 캐시 무효화
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('home_data_') || key.startsWith('diaries_')) {
            localStorage.removeItem(key);
          }
        });
        
        // 작성 완료 후 홈으로 이동
        setTimeout(() => {
          navigate("/");
        }, 500);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: isEditMode ? "수정 실패" : "업로드 실패",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus("");
    }
  };

  // 다시 생성하기 확인
  const handleRegenerateClick = () => {
    setConfirmRegenerateDialogOpen(true);
  };

  // 초기화 및 리셋
  const handleConfirmRegenerate = async () => {
    setConfirmRegenerateDialogOpen(false);
    
    // 임시 일기 삭제
    if (currentDiaryId) {
      const { error: deletePhotosError } = await supabase
        .from("photos")
        .delete()
        .eq("diary_id", currentDiaryId);

      const { error: deleteDiaryError } = await supabase
        .from("diaries")
        .delete()
        .eq("id", currentDiaryId);

      if (deletePhotosError || deleteDiaryError) {
        console.error("임시 일기 삭제 실패:", deletePhotosError || deleteDiaryError);
      }
    }
    
    // 초기 상태로 리셋
    setIsGenerated(false);
    setCurrentDiaryId(null);
    setContent("");
    setTitle("");
    setGeneratedContent("");
    setGeneratedTitle("");
    setGeneratedEmoji("");
    setSelectedFiles([]);
    setPreviewUrls([]);
    setExistingPhotos([]);
    
    toast({
      title: "초기화되었습니다",
      description: "새로운 일기를 작성할 수 있습니다.",
    });
  };

  
  if (loading) {
    return (
      <div className="min-h-screen gradient-soft flex items-center justify-center">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <p className="text-muted-foreground">일기를 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  return <div className="min-h-screen gradient-soft">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{isEditMode ? "일기 수정" : "일기 작성"}</h1>
          <p className="text-muted-foreground text-sm">
            {isEditMode 
              ? "사진과 감정, 길이를 수정할 수 있어요"
              : writeMode === "ai" 
                ? "오늘의 사진으로 누군가 일기를 작성합니다!"
                : "오늘의 일기를 자유롭게 작성해보세요"
            }
          </p>
        </div>

        {!isEditMode && !isGenerated && (
          <div className="flex gap-2 p-1 bg-muted rounded-full">
            <Button
              variant={writeMode === "ai" ? "default" : "ghost"}
              className={cn(
                "flex-1 rounded-full transition-all",
                writeMode === "ai"
                  ? ""
                  : "bg-transparent hover:bg-transparent [@media(hover:hover)]:hover:bg-accent/50"
              )}
              onClick={() => setWriteMode("ai")}
              onTouchEnd={(e) => e.currentTarget.blur()}
            >
              누군가 작성
            </Button>
            <Button
              variant={writeMode === "manual" ? "default" : "ghost"}
              className={cn(
                "flex-1 rounded-full transition-all",
                writeMode === "manual"
                  ? ""
                  : "bg-transparent hover:bg-transparent [@media(hover:hover)]:hover:bg-accent/50"
              )}
              onClick={() => setWriteMode("manual")}
              onTouchEnd={(e) => e.currentTarget.blur()}
            >
              직접 입력
            </Button>
          </div>
        )}
        
        <div className="space-y-6">
            <div className="space-y-2">
              <Label className="px-2">일기 날짜</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: ko }) : <span>날짜 선택</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background shadow-lg" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setDatePickerOpen(false);
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="px-2">사진 선택</Label>
              {previewUrls.length > 0 ? <div className="space-y-3">
                  <div className="space-y-2">
                    {previewUrls.map((url, index) => <div key={index} className="relative flex items-center gap-3 p-3 rounded-lg border-2 border-border bg-card">
                        <div className="relative flex-shrink-0 w-28 h-20 rounded overflow-hidden bg-muted">
                          <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-contain" />
                          <div className="absolute top-1 left-1 bg-primary/90 text-primary-foreground rounded px-1.5 py-0.5 text-xs font-medium">
                            {index + 1}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute bottom-0.5 left-0.5 h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removePhoto(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" style={{ filter: 'drop-shadow(0 1px 0 white) drop-shadow(1px 0 0 white) drop-shadow(0 -1px 0 white) drop-shadow(-1px 0 0 white)' }} />
                          </Button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground">사진 {index + 1}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          {index > 0 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => movePhoto(index, 'up')}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                          )}
                          {index < previewUrls.length - 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => movePhoto(index, 'down')}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>)}
                  </div>
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <Button variant="default" size="default" className="w-full" asChild>
                        <span>사진 추가</span>
                      </Button>
                      <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                    </label>
                    <Button variant="outline" size="sm" onClick={() => {
                      setSelectedFiles([]);
                      setPreviewUrls([]);
                    }}>
                      전체 삭제
                    </Button>
                  </div>
                </div> : <label className="flex flex-col items-center justify-center aspect-[4/3] rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer transition-colors">
                  <UploadIcon className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">오늘의 사진 선택 (1~6 장)</p>
                  <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                </label>}
            </div>

            <div className="space-y-2">
              <Label className="px-2">감정 선택</Label>
              <Select value={emotion} onValueChange={setEmotion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="happy">기쁨 😄</SelectItem>
                  <SelectItem value="sad">슬픔 😭</SelectItem>
                  <SelectItem value="angry">화남 😠</SelectItem>
                  <SelectItem value="calm">평온 😇</SelectItem>
                  <SelectItem value="excited">신남 🎉</SelectItem>
                  <SelectItem value="anxious">불안 😰</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="px-2">날씨 선택</Label>
              <Select value={weather} onValueChange={setWeather}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="unknown">❓ 모름</SelectItem>
                  <SelectItem value="sunny">☀️ 맑음</SelectItem>
                  <SelectItem value="partly_cloudy">⛅ 구름 조금</SelectItem>
                  <SelectItem value="cloudy">☁️ 흐림</SelectItem>
                  <SelectItem value="rainy">🌧️ 비</SelectItem>
                  <SelectItem value="stormy">⛈️ 천둥번개</SelectItem>
                  <SelectItem value="snowy">🌨️ 눈</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {writeMode === "ai" && (
              <div className="space-y-2">
                <Label className="px-2">길이 선택</Label>
                <Select value={length} onValueChange={setLength}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">짧게 (5-7문장)</SelectItem>
                    <SelectItem value="medium">중간 (8-10문장)</SelectItem>
                    <SelectItem value="long">길게 (11-15문장)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {!isEditMode && writeMode === "ai" && (
              <div className="space-y-2">
                <Label className="px-2">시점 선택</Label>
                <Select value={perspective} onValueChange={setPerspective}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {perspectives.map((p) => (
                      <SelectItem key={p.perspective_key} value={p.perspective_key}>
                        <div className="flex items-center gap-2">
                          {p.emoji && <span>{p.emoji}</span>}
                          <span>{p.label}</span>
                          {p.is_new && (
                            <Badge variant="default" className="text-xs px-1.5 py-0">
                              NEW
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!isEditMode && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <Label>등장인물</Label>
                  <span className="text-xs text-muted-foreground">일기의 주인공들</span>
                </div>
                <div className="flex flex-wrap gap-2 px-2">
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={p.profile_photo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {p.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{p.name || "Unknown"}</span>
                      {p.id !== currentUser?.id && (
                        <button
                          onClick={() => setParticipants(participants.filter(participant => participant.id !== p.id))}
                          className="ml-1 hover:bg-destructive/10 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowFriendsList(!showFriendsList)}
                      className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 px-3 py-1.5 rounded-full transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-xs">추가</span>
                    </button>
                    {showFriendsList && (
                      <div className="absolute z-50 left-0 top-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto min-w-[200px]">
                        {friends.filter(f => !participants.some(p => p.id === f.id)).length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground text-center">
                            추가할 친구가 없습니다
                          </div>
                        ) : (
                          friends
                            .filter(f => !participants.some(p => p.id === f.id))
                            .map(friend => (
                              <button
                                key={friend.id}
                                type="button"
                                onClick={() => {
                                  setParticipants([...participants, friend]);
                                  setShowFriendsList(false);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2"
                              >
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={friend.profile_photo_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {friend.name?.charAt(0) || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{friend.name}</span>
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!isEditMode && !isGenerated && writeMode === "ai" && (
              <div className="pt-4">
                <Button
                  onClick={handleGenerateClick}
                  disabled={selectedFiles.length < 1 || uploading}
                  className="w-full h-14 text-sm font-semibold"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      일기 생성 중...
                    </>
                  ) : (
                    <>
                      <PenLine className="mr-2 h-5 w-5" />
                      일기 생성하기
                    </>
                  )}
                </Button>
              </div>
            )}

            {!isEditMode && !isGenerated && writeMode === "manual" && (
              <>
                <div className="border-t my-6" />

                <div className="space-y-2">
                  <Label htmlFor="title" className="px-2">일기 제목</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="일기 제목을 입력하세요"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content" className="px-2">일기 내용</Label>
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="오늘 있었던 일을 자유롭게 작성해보세요"
                  />
                </div>

                <div className="border-t pt-6 mt-6" />
              </>
            )}

            {(isEditMode || isGenerated) && (
              <>
                <div className="border-t pt-6 mt-6" ref={contentSectionRef} />

                <div className="space-y-2">
                  <Label htmlFor="title" className="px-2">일기 제목</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="일기 제목을 입력하세요"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content" className="px-2">일기 내용</Label>
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="일기 내용을 입력하세요"
                  />
                </div>

                <div className="border-t pt-6 mt-6" />
              </>
            )}

            {isGenerated && (
              <div className="flex items-center justify-end mb-4">
                <Button
                  onClick={handleRegenerateClick}
                  disabled={uploading}
                  variant="outline"
                  size="sm"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      초기화 중...
                    </>
                  ) : (
                    <>
                      <PenLine className="mr-2 h-4 w-4" />
                      처음부터 다시
                    </>
                  )}
                </Button>
              </div>
            )}

            {(isEditMode || isGenerated || (writeMode === "manual" && !isGenerated)) && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="px-2">일기장 선택</Label>
                    <Select value={selectedNotebook || undefined} onValueChange={setSelectedNotebook}>
                      <SelectTrigger>
                        <SelectValue placeholder="일기장을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {notebooks.map((notebook) => (
                          <SelectItem key={notebook.id} value={notebook.id}>
                            {notebook.name} ({notebook.visibility === 'public' ? '공개' : '비공개'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="px-2">이모티콘 선택</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal group hover:bg-accent"
                        >
                          <span className="text-2xl mr-2">{generatedEmoji || "📝"}</span>
                          <span className="text-sm text-muted-foreground group-hover:text-white">이모티콘 변경</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0 bg-background z-50 max-h-[400px] overflow-y-auto pointer-events-auto" align="start">
                        <div className="p-4 space-y-4">
                          <div>
                            <p className="text-sm font-medium mb-2 sticky top-0 bg-background py-1">감정</p>
                            <div className="grid grid-cols-6 gap-2">
                              {["😊", "😢", "😠", "😴", "😍", "😎", "🤔", "😱", "🥳", "😌", "🤗", "😏", "😆", "😂", "🤣", "😅", "😇", "🙃", "😉", "😋", "😛", "😝", "🤪", "🤭"].map((emoji) => (
                                <Button
                                  key={emoji}
                                  variant="ghost"
                                  className="h-10 w-10 p-0 text-2xl hover:bg-accent"
                                  onClick={() => setGeneratedEmoji(emoji)}
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2 sticky top-0 bg-background py-1">음식</p>
                            <div className="grid grid-cols-6 gap-2">
                              {["🍕", "🍔", "🍟", "🌭", "🍿", "🧈", "🥐", "🥖", "🥨", "🥯", "🧇", "🥞", "🧀", "🍖", "🍗", "🥩", "🥓", "🍔", "🍟", "🍕", "🌮", "🌯", "🥙", "🧆", "🥚", "🍳", "🥘", "🍲", "🥣", "🥗", "🍿", "🧈", "🧂", "🥫", "🍱", "🍘", "🍙", "🍚", "🍛", "🍜", "🍝", "🍠", "🍢", "🍣", "🍤", "🍥", "🥮", "🍡", "🥟", "🥠", "🥡", "🦀", "🦞", "🦐", "🦑", "🦪"].map((emoji) => (
                                <Button
                                  key={emoji}
                                  variant="ghost"
                                  className="h-10 w-10 p-0 text-2xl hover:bg-accent"
                                  onClick={() => setGeneratedEmoji(emoji)}
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2 sticky top-0 bg-background py-1">음료</p>
                            <div className="grid grid-cols-6 gap-2">
                              {["☕", "🍵", "🧃", "🥤", "🧋", "🍶", "🍾", "🍷", "🍸", "🍹", "🍺", "🍻", "🥂", "🥃", "🧉", "🧊"].map((emoji) => (
                                <Button
                                  key={emoji}
                                  variant="ghost"
                                  className="h-10 w-10 p-0 text-2xl hover:bg-accent"
                                  onClick={() => setGeneratedEmoji(emoji)}
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2 sticky top-0 bg-background py-1">과일</p>
                            <div className="grid grid-cols-6 gap-2">
                              {["🍎", "🍏", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑"].map((emoji) => (
                                <Button
                                  key={emoji}
                                  variant="ghost"
                                  className="h-10 w-10 p-0 text-2xl hover:bg-accent"
                                  onClick={() => setGeneratedEmoji(emoji)}
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2 sticky top-0 bg-background py-1">활동</p>
                            <div className="grid grid-cols-6 gap-2">
                              {["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🏹", "🎣", "🤿", "🥊", "🥋", "🎽", "🛹", "🛼", "🛷", "⛸️", "🥌", "🎿", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "🤺", "⛹️", "🤾", "🏌️", "🏇", "🧘", "🏄", "🏊", "🤽", "🚣", "🧗", "🚵", "🚴", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🎗️"].map((emoji) => (
                                <Button
                                  key={emoji}
                                  variant="ghost"
                                  className="h-10 w-10 p-0 text-2xl hover:bg-accent"
                                  onClick={() => setGeneratedEmoji(emoji)}
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2 sticky top-0 bg-background py-1">여행</p>
                            <div className="grid grid-cols-6 gap-2">
                              {["✈️", "🛫", "🛬", "🪂", "💺", "🚁", "🚟", "🚠", "🚡", "🛰️", "🚀", "🛸", "🚂", "🚃", "🚄", "🚅", "🚆", "🚇", "🚈", "🚉", "🚊", "🚝", "🚞", "🚋", "🚌", "🚍", "🚎", "🚐", "🚑", "🚒", "🚓", "🚔", "🚕", "🚖", "🚗", "🚘", "🚙", "🛻", "🚚", "🚛", "🚜", "🏎️", "🏍️", "🛵", "🦽", "🦼", "🛺", "🚲", "🛴", "🛹", "🛼", "🚏", "🛣️", "🛤️", "🛢️", "⛽", "🛞", "🚨", "🚥", "🚦", "🛑", "🚧", "⚓", "🛟", "⛵", "🛶", "🚤", "🛳️", "⛴️", "🛥️", "🚢", "🗿", "⛲", "⛱️", "🏖️", "🏝️", "🏜️", "🌋", "⛰️", "🏔️", "🗻", "🏕️", "⛺", "🛖", "🏠", "🏡", "🏘️", "🏚️", "🏗️", "🏭", "🏢", "🏬", "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "💒", "🏛️", "⛪", "🕌", "🕍", "🛕", "🕋", "⛩️", "🛤️", "🗼", "🗽", "⛲", "⛱️", "🎠", "🎡", "🎢", "💈", "🎪"].map((emoji) => (
                                <Button
                                  key={emoji}
                                  variant="ghost"
                                  className="h-10 w-10 p-0 text-2xl hover:bg-accent"
                                  onClick={() => setGeneratedEmoji(emoji)}
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2 sticky top-0 bg-background py-1">날씨</p>
                            <div className="grid grid-cols-6 gap-2">
                              {["☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🌬️", "💨", "🌪️", "🌫️", "🌈", "🌅", "🌄", "🌠", "🌌", "⭐", "🌟", "✨", "⚡", "🔥", "💧", "🌊"].map((emoji) => (
                                <Button
                                  key={emoji}
                                  variant="ghost"
                                  className="h-10 w-10 p-0 text-2xl hover:bg-accent"
                                  onClick={() => setGeneratedEmoji(emoji)}
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2 sticky top-0 bg-background py-1">동물</p>
                            <div className="grid grid-cols-6 gap-2">
                              {["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🪳", "🦟", "🦗", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🦣", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🦬", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐈‍⬛", "🪶", "🐓", "🦃", "🦤", "🦚", "🦜", "🦢", "🦩", "🕊️", "🐇", "🦝", "🦨", "🦡", "🦫", "🦦", "🦥", "🐁", "🐀", "🐿️", "🦔"].map((emoji) => (
                                <Button
                                  key={emoji}
                                  variant="ghost"
                                  className="h-10 w-10 p-0 text-2xl hover:bg-accent"
                                  onClick={() => setGeneratedEmoji(emoji)}
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2 sticky top-0 bg-background py-1">자연</p>
                            <div className="grid grid-cols-6 gap-2">
                              {["🌺", "🌻", "🌷", "🌹", "🥀", "🏵️", "🌸", "💐", "🌼", "🌱", "🪴", "🌲", "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃", "🪹", "🪺", "🍄"].map((emoji) => (
                                <Button
                                  key={emoji}
                                  variant="ghost"
                                  className="h-10 w-10 p-0 text-2xl hover:bg-accent"
                                  onClick={() => setGeneratedEmoji(emoji)}
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-2 sticky top-0 bg-background py-1">물건/기타</p>
                            <div className="grid grid-cols-6 gap-2">
                              {["📚", "📖", "📝", "✏️", "✒️", "🖊️", "🖋️", "🖍️", "📕", "📗", "📘", "📙", "📔", "📒", "📓", "📃", "📄", "📰", "🗞️", "📑", "🔖", "🏷️", "💰", "🪙", "💴", "💵", "💶", "💷", "💸", "💳", "🧾", "💹", "📧", "📨", "📩", "📤", "📥", "📦", "📫", "📪", "📬", "📭", "📮", "🗳️", "✉️", "📧", "💌", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🪫", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "🪙", "💰", "💳", "💎", "⚖️", "🪜", "🧰", "🪛", "🔧", "🔨", "⚒️", "🛠️", "⛏️", "🪚", "🔩", "⚙️", "🪤", "🧱", "⛓️", "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡️", "⚔️", "🛡️", "🎵", "🎶", "🎼", "🎹", "🥁", "🪘", "🎷", "🎺", "🪗", "🎸", "🪕", "🎻", "🎬", "🎮", "👾", "🎯", "🎲", "🎰", "🎳", "🎗️", "🎟️", "🎫", "🎖️", "🏆", "🏅", "🥇", "🥈", "🥉", "💕", "💖", "💗", "💘", "💝", "💞", "💟", "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "❤️‍🔥", "❤️‍🩹", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "🎂", "🎁", "🎈", "🎉", "🎊", "🎀", "🪅", "🪆"].map((emoji) => (
                                <Button
                                  key={emoji}
                                  variant="ghost"
                                  className="h-10 w-10 p-0 text-2xl hover:bg-accent"
                                  onClick={() => setGeneratedEmoji(emoji)}
                                >
                                  {emoji}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* 등장인물 - '나만의 일기장'이 아닐 때만 표시 */}
                {(() => {
                  if (!selectedNotebook) return false;
                  const selectedNotebookData = notebooks.find(nb => nb.id === selectedNotebook);
                  if (!selectedNotebookData) return false;
                  const isMyPrivateNotebook = selectedNotebookData.visibility === 'private' && selectedNotebookData.is_default === true;
                  return !isMyPrivateNotebook;
                })() && (
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center gap-2 px-2">
                      <Label>등장인물</Label>
                      <span className="text-xs text-muted-foreground">멤버에게 알립니다!</span>
                    </div>
                    <TooltipProvider>
                      <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[48px] items-center">
                        {participants.map((p) => (
                          <Tooltip key={p.id}>
                            <TooltipTrigger asChild>
                              <Avatar className="h-10 w-10 cursor-pointer border-2 border-border">
                                <AvatarImage src={p.profile_photo_url} />
                                <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{p.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </TooltipProvider>
                  </div>
                )}

                <Button 
                  onClick={isEditMode ? handleUpload : (writeMode === "manual" && !isGenerated ? handleSaveManual : handleSave)} 
                  disabled={loading || !content.trim() || !selectedNotebook} 
                  className="w-full h-12"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? "일기 수정 중..." : "일기 저장 중..."}
                    </>
                  ) : (
                    isEditMode ? "일기 수정하기" : "일기 등록하기"
                  )}
                </Button>
                
                <Button 
                  onClick={() => setConfirmCancelDialogOpen(true)} 
                  variant="outline"
                  disabled={loading}
                  className="w-full h-12"
                >
                  작성 취소
                </Button>
              </>
            )}
        </div>
        <div className="h-20" />
      </div>

      {/* 일기 생성 연필 차감 확인 대화상자 */}
      <AlertDialog open={confirmGenerateDialogOpen} onOpenChange={setConfirmGenerateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              일기를 생성하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription>
              일기 생성에는 연필 {generationCost}개가 차감됩니다.
              <div className="mt-2 p-3 rounded-lg bg-muted">
                <p className="text-sm">
                  현재 연필: <span className="font-bold">{pencilCount}개</span>
                  {" → "}
                  <span className="font-bold">{pencilCount - generationCost}개</span>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-full">
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmGenerate}
              className="rounded-full"
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 일기 다시 생성 연필 차감 확인 대화상자 */}
      <AlertDialog open={confirmRegenerateDialogOpen} onOpenChange={setConfirmRegenerateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>처음부터 다시 시작하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>다음 내용이 모두 초기화됩니다:</p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                  <li>선택한 모든 사진</li>
                  <li>작성된 제목과 내용</li>
                  <li>생성된 이모지</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-full">
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRegenerate}
              className="rounded-full"
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={uploading} onOpenChange={() => {}}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>일기 작성 중</DialogTitle>
            <DialogDescription>
              {uploadStatus}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div 
                className="h-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 transition-all duration-500 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">{uploadProgress}%</p>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={cancelUpload} className="w-full sm:w-auto">
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* 작성 취소 확인 대화상자 */}
      <AlertDialog open={confirmCancelDialogOpen} onOpenChange={setConfirmCancelDialogOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>작성 취소</AlertDialogTitle>
            <AlertDialogDescription>
              작성 중인 내용이 모두 삭제됩니다. 정말 취소하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">아니오</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                // 임시 일기 삭제
                if (currentDiaryId) {
                  const { error: deletePhotosError } = await supabase
                    .from("photos")
                    .delete()
                    .eq("diary_id", currentDiaryId);

                  const { error: deleteDiaryError } = await supabase
                    .from("diaries")
                    .delete()
                    .eq("id", currentDiaryId);

                  if (deletePhotosError || deleteDiaryError) {
                    console.error("임시 일기 삭제 실패:", deletePhotosError || deleteDiaryError);
                  }
                }

                // 초기화
                setIsGenerated(false);
                setCurrentDiaryId(null);
                setContent("");
                setTitle("");
                setGeneratedContent("");
                setGeneratedTitle("");
                setGeneratedEmoji("");
                setSelectedFiles([]);
                setPreviewUrls([]);
                setExistingPhotos([]);
                
                // 메인으로 이동
                navigate("/");
              }}
              className="w-full sm:w-auto"
            >
              네, 취소합니다
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}