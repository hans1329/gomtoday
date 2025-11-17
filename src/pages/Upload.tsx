import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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
import { Upload as UploadIcon, Loader2, ArrowLeft, Trash2, ChevronUp, ChevronDown, CalendarIcon, UserPlus, X, PenLine, Pencil } from "lucide-react";
import { format } from "date-fns";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
export default function Upload() {
  const { id } = useParams();
  const isEditMode = !!id;
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [emotion, setEmotion] = useState("happy");
  const [length, setLength] = useState("medium");
  const [perspective, setPerspective] = useState("camera");
  const [weather, setWeather] = useState("sunny");
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
  const [currentUser, setCurrentUser] = useState<{id: string, name: string, profile_photo_url?: string} | null>(null);
  const [friends, setFriends] = useState<Array<{id: string, name: string, profile_photo_url?: string}>>([]);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedEmoji, setGeneratedEmoji] = useState("");
  const [currentDiaryId, setCurrentDiaryId] = useState<string | null>(null);
  const [confirmGenerateDialogOpen, setConfirmGenerateDialogOpen] = useState(false);
  const [pencilCount, setPencilCount] = useState(0);
  const [generationCost, setGenerationCost] = useState(0);
  const [regenerationCost, setRegenerationCost] = useState(0);
  const [confirmRegenerateDialogOpen, setConfirmRegenerateDialogOpen] = useState(false);
  const [writeCost, setWriteCost] = useState(0);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    loadCurrentUser();
    fetchPencilInfo();
    if (isEditMode) {
      loadDiaryData();
      fetchNotebooks();
    } else {
      fetchNotebooks();
      checkDraftDiary();
    }
  }, [id]);

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
      profile_photo_url: profile?.profile_photo_url
    };
    setCurrentUser(userData);
    // 디폴트로 현재 사용자를 등장인물에 추가
    setParticipants([userData]);
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

    // 일기 다시 생성 비용 가져오기
    const { data: regenerationSetting } = await supabase
      .from("pencil_settings")
      .select("setting_value")
      .eq("setting_key", "diary_regeneration_cost")
      .single();

    if (regenerationSetting) {
      setRegenerationCost(regenerationSetting.setting_value);
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

    setPencilCount(pencilCount - generationCost);
    handleGenerateDiary();
  };

  // 임시 저장된 일기 확인
  const checkDraftDiary = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 일기장에 연결되지 않은 일기 중 가장 최근 것 찾기
    const { data: diaries } = await supabase
      .from("diaries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!diaries || diaries.length === 0) return;

    // 일기장에 연결되지 않은 일기 찾기
    for (const diary of diaries) {
      const { data: notebooks } = await supabase
        .from("diary_notebooks")
        .select("*")
        .eq("diary_id", diary.id)
        .maybeSingle();

      if (!notebooks) {
        // 임시 저장된 일기 발견
        setCurrentDiaryId(diary.id);
        setContent(diary.content || "");
        setTitle(diary.title || "");
        setGeneratedContent(diary.content || "");
        setGeneratedTitle(diary.title || "");
        setGeneratedEmoji(diary.emoji || "");
        setIsGenerated(true);
        setEmotion(diary.tone || "happy");
        setLength(diary.length || "medium");
        setWeather(diary.weather || "sunny");
        setPerspective(diary.perspective || "camera");
        setSelectedDate(new Date(diary.created_at || new Date()));
        
        if (diary.participants) {
          setParticipants(diary.participants as Array<{id: string, name: string, profile_photo_url?: string}>);
        }

        // 연결된 사진들 불러오기
        const { data: photos } = await supabase
          .from("photos")
          .select("*")
          .eq("diary_id", diary.id)
          .order("display_order");

        if (photos && photos.length > 0) {
          setExistingPhotos(photos);
          setPreviewUrls(photos.map(p => p.photo_url));
        }

        toast({
          title: "임시 저장된 일기가 있어요",
          description: "계속 작성하거나 수정할 수 있어요."
        });
        
        break;
      }
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

    // 일기 친구 목록 가져오기
    await fetchFriends(user.id);
  };

  const fetchFriends = async (userId: string) => {
    // 친구 요청이 수락된 사용자들 가져오기
    const { data: acceptedRequests } = await supabase
      .from("friend_requests")
      .select(`
        from_user_id,
        to_user_id,
        from_profile:profiles!friend_requests_from_user_id_fkey(user_id, name, profile_photo_url),
        to_profile:profiles!friend_requests_to_user_id_fkey(user_id, name, profile_photo_url)
      `)
      .eq("status", "accepted")
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

    if (acceptedRequests) {
      const friendsList = acceptedRequests
        .map((req: any) => {
          // 현재 사용자가 from_user면 to_user가 친구, 반대도 마찬가지
          const isSender = req.from_user_id === userId;
          const friendProfile = isSender ? req.to_profile : req.from_profile;
          
          return {
            id: friendProfile?.user_id,
            name: friendProfile?.name || "사용자",
            profile_photo_url: friendProfile?.profile_photo_url
          };
        })
        .filter((friend: any) => friend.id && !participants.some(p => p.id === friend.id)); // ID가 있고 이미 추가되지 않은 친구만

      setFriends(friendsList);
    }
  };

  const addParticipant = (member: {id: string, name: string, profile_photo_url?: string}) => {
    if (!participants.some(p => p.id === member.id)) {
      setParticipants([...participants, member]);
    }
    setShowMemberDialog(false);
  };

  const removeParticipant = (memberId: string) => {
    setParticipants(participants.filter(p => p.id !== memberId));
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
        setUploadProgress(20 + ((i + 1) / selectedFiles.length) * 30);
      }

      setUploadStatus("AI가 일기를 작성하고 있어요...");
      setUploadProgress(60);

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

      setUploadProgress(80);
      setUploadStatus("일기를 임시 저장하고 있어요...");

      // 임시 일기 생성 (일기장 연결 없이)
      const {
        data: diaryData,
        error: diaryError
      } = await supabase.from("diaries").insert({
        user_id: user.id,
        content: aiResponse.content,
        title: aiResponse.title,
        emoji: aiResponse.emoji,
        tone: emotion,
        length,
        weather,
        perspective,
        participants: participants,
        created_at: selectedDate.toISOString()
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
      setGeneratedContent(aiResponse.content);
      setGeneratedTitle(aiResponse.title);
      setGeneratedEmoji(aiResponse.emoji);
      setContent(aiResponse.content);
      setTitle(aiResponse.title);
      setCurrentDiaryId(diaryData.id);
      setIsGenerated(true);
      
      toast({
        title: "일기가 생성되었어요!",
        description: "내용을 확인하고 수정하세요."
      });
    } catch (error: any) {
      console.error("일기 생성 실패:", error);
      toast({
        title: "일기 생성 실패",
        description: error.message || "다시 시도해주세요.",
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

      // 일기 내용 업데이트 (사용자가 수정한 경우)
      const {
        error: updateError
      } = await supabase.from("diaries").update({
        content: content,
        title: title,
        emoji: generatedEmoji,
        participants: participants
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
      navigate(`/diary/${currentDiaryId}`);
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
        navigate(`/diary/${id}`);
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
        
        setUploadStatus("AI가 일기를 작성하고 있어요...");
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
        
        // 작성 완료 후 상세 페이지로 이동
        setTimeout(() => {
          navigate(`/diary/${diaryData.id}`);
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
    if (pencilCount < regenerationCost) {
      toast({
        title: "연필이 부족해요",
        description: `일기 다시 생성에는 연필 ${regenerationCost}개가 필요합니다. (현재: ${pencilCount}개)`,
        variant: "destructive",
      });
      return;
    }
    setConfirmRegenerateDialogOpen(true);
  };

  // 연필 차감 후 다시 생성
  const handleConfirmRegenerate = async () => {
    setConfirmRegenerateDialogOpen(false);
    
    // 연필 차감
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: deductError } = await supabase
      .from("profiles")
      .update({ pencil_count: pencilCount - regenerationCost })
      .eq("user_id", user.id);

    if (deductError) {
      toast({
        title: "연필 차감 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
      return;
    }

    setPencilCount(pencilCount - regenerationCost);
    handleRegenerate();
  };

  // 일기 다시 생성하기
  const handleRegenerate = async () => {
    const diaryId = id || currentDiaryId;
    if (!isGenerated || !diaryId) return;
    
    setUploading(true);
    setUploadProgress(10);
    setUploadStatus("사진 분석 준비 중...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // 기존 사진 URL들 가져오기 (저장된 사진만 사용)
      if (existingPhotos.length === 0) {
        toast({
          title: "저장된 사진이 필요해요",
          description: "일기를 다시 생성하려면 먼저 저장해주세요.",
          variant: "destructive"
        });
        setUploading(false);
        return;
      }

      const photoUrls = existingPhotos.map(p => p.photo_url);

      setUploadStatus("AI가 일기를 다시 작성하고 있어요...");
      setUploadProgress(50);

      const { data: aiResponse, error: aiError } = await supabase.functions.invoke("analyze-photo", {
        body: {
          photoUrls: photoUrls,
          emotion,
          length,
          perspective
        }
      });

      if (aiError) throw aiError;

      setUploadProgress(90);
      setUploadStatus("일기를 업데이트하고 있어요...");

      // 일기 내용 업데이트
      const { error: updateError } = await supabase
        .from("diaries")
        .update({
          content: aiResponse.content,
          title: aiResponse.title,
          emoji: aiResponse.emoji,
          tone: emotion,
          length,
          perspective
        })
        .eq("id", diaryId);

      if (updateError) throw updateError;

      setContent(aiResponse.content);
      setTitle(aiResponse.title);
      setUploadProgress(100);

      toast({
        title: "일기를 다시 생성했어요!",
        description: "내용을 확인하고 수정하세요."
      });
    } catch (error: any) {
      console.error("일기 재생성 실패:", error);
      toast({
        title: "일기 재생성 실패",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus("");
    }
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
              : "오늘을 대표하는 사진을 업로드하면 누군가가 자동으로 일기를 작성해드려요!"
            }
          </p>
        </div>
        
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
                <PopoverContent className="w-auto p-0" align="start">
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
              <Label className="px-2">사진 선택 (3~6장)</Label>
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
                  <p className="text-sm text-muted-foreground">클릭하여 1~6장의 사진선택</p>
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
                  <SelectItem value="sunny">☀️ 맑음</SelectItem>
                  <SelectItem value="partly_cloudy">⛅ 구름 조금</SelectItem>
                  <SelectItem value="cloudy">☁️ 흐림</SelectItem>
                  <SelectItem value="rainy">🌧️ 비</SelectItem>
                  <SelectItem value="stormy">⛈️ 천둥번개</SelectItem>
                  <SelectItem value="snowy">🌨️ 눈</SelectItem>
                </SelectContent>
              </Select>
            </div>

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

            {!isEditMode && (
              <div className="space-y-2">
                <Label className="px-2">시점 선택</Label>
                <Select value={perspective} onValueChange={setPerspective}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="camera">내 핸드폰의 시점</SelectItem>
                    <SelectItem value="pet">애완동물</SelectItem>
                    <SelectItem value="friend">친구</SelectItem>
                    <SelectItem value="family">가족</SelectItem>
                    <SelectItem value="stranger">낯선 사람</SelectItem>
                    <SelectItem value="old_man">동네 꼰대 아저씨</SelectItem>
                    <SelectItem value="future">미래의 나</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {!isEditMode && !isGenerated && (
              <div className="pt-4">
                <Button
                  onClick={handleGenerateClick}
                  disabled={selectedFiles.length < 1 || uploading}
                  className="w-full h-14 text-lg font-semibold"
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

            {(isEditMode || isGenerated) && (
              <>
                <div className="border-t pt-6 mt-6" />

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
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="일기 내용을 입력하세요"
                    className="min-h-[200px]"
                  />
                </div>

                <div className="border-t pt-6 mt-6" />
              </>
            )}

            {isGenerated && (
              <div className="flex items-center justify-end mb-4">
                <Button
                  onClick={handleRegenerateClick}
                  disabled={uploading || (existingPhotos.length === 0 && previewUrls.length === 0)}
                  variant="outline"
                  size="sm"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      재생성 중...
                    </>
                  ) : (
                    <>
                      <PenLine className="mr-2 h-4 w-4" />
                      다시 생성하기
                    </>
                  )}
                </Button>
              </div>
            )}

            {(isEditMode || isGenerated) && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-2">
                    <Label>등장인물</Label>
                    <span className="text-xs text-muted-foreground">멤버에게 알립니다!</span>
                  </div>
                  <TooltipProvider>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[48px] items-center">
                      {participants.map((p) => (
                        <div key={p.id} className="relative group">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative">
                                <Avatar className="h-10 w-10 cursor-pointer border-2 border-border">
                                  <AvatarImage src={p.profile_photo_url} />
                                  <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <button
                                  onClick={() => removeParticipant(p.id)}
                                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{p.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 rounded-full p-0"
                        onClick={async () => {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (user) {
                            await fetchFriends(user.id);
                            setShowMemberDialog(true);
                          }
                        }}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TooltipProvider>
                </div>

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
                            {notebook.is_default && " 기본"}
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

                <Button 
                  onClick={isEditMode ? handleUpload : handleSave} 
                  disabled={loading || !content.trim() || !selectedNotebook} 
                  className="w-full h-12"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? "일기 수정 중..." : "일기 저장 중..."}
                    </>
                  ) : (
                    isEditMode ? "일기 수정하기" : "일기 저장하기"
                  )}
                </Button>
              </>
            )}
        </div>
        <div className="h-20" />
      </div>

      {/* 일기 생성 연필 차감 확인 대화상자 */}
      <AlertDialog open={confirmGenerateDialogOpen} onOpenChange={setConfirmGenerateDialogOpen}>
        <AlertDialogContent className="mx-4 max-w-sm rounded-lg">
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
        <AlertDialogContent className="mx-4 max-w-sm rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              일기를 다시 생성하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription>
              일기 다시 생성에는 연필 {regenerationCost}개가 차감됩니다.
              <div className="mt-2 p-3 rounded-lg bg-muted">
                <p className="text-sm">
                  현재 연필: <span className="font-bold">{pencilCount}개</span>
                  {" → "}
                  <span className="font-bold">{pencilCount - regenerationCost}개</span>
                </p>
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

      <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>등장인물 추가</DialogTitle>
            <DialogDescription>
              일기 친구를 선택하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {friends.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                추가할 수 있는 일기 친구가 없습니다
              </p>
            ) : (
              friends.map((friend) => (
                <Button
                  key={friend.id}
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => addParticipant(friend)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={friend.profile_photo_url} />
                    <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {friend.name}
                </Button>
              ))
            )}
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowMemberDialog(false)}
              className="w-full sm:w-auto"
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}