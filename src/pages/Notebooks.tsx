import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Plus, Trash2, Users, X, Pencil } from "lucide-react";
import LoadingBar from "@/components/LoadingBar";

export default function Notebooks() {
  const [notebooks, setNotebooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVisibility, setNewVisibility] = useState<"private" | "shared" | "public">("shared");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchNotebooks();
    setupPresenceTracking();
  }, []);

  const setupPresenceTracking = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const channel = supabase.channel('online-users');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id) {
              online.add(presence.user_id);
            }
          });
        });
        setOnlineUsers(online);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((presence: any) => {
          if (presence.user_id) {
            setOnlineUsers(prev => new Set(prev).add(presence.user_id));
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach((presence: any) => {
          if (presence.user_id) {
            setOnlineUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(presence.user_id);
              return newSet;
            });
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  };

  const fetchNotebooks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("notebooks")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at");

    if (error) {
      console.error("Error fetching notebooks:", error);
      toast({
        title: "일기장 로딩 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNotebooks(data || []);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (creating) return;

    if (!newName.trim()) {
      toast({
        title: "이름을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    if (notebooks.length >= 5) {
      toast({
        title: "일기장 개수 초과",
        description: "최대 5개까지만 만들 수 있어요.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }

    const { error } = await supabase
      .from("notebooks")
      .insert({
        user_id: user.id,
        name: newName.trim(),
        visibility: newVisibility,
        is_default: false,
      });

    setCreating(false);

    if (error) {
      toast({
        title: "일기장 생성 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "일기장이 생성되었어요!",
      });
      setNewName("");
      setNewVisibility("shared");
      setIsDialogOpen(false);
      fetchNotebooks();
    }
  };

  const handleDelete = async (notebookId: string, isDefault: boolean) => {
    if (isDefault) {
      toast({
        title: "기본 일기장은 삭제할 수 없어요",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("notebooks")
      .delete()
      .eq("id", notebookId);

    if (error) {
      toast({
        title: "일기장 삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "일기장이 삭제되었어요",
      });
      fetchNotebooks();
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case "private": return "🔒 나만 보기";
      case "shared": return "👥 공유";
      case "public": return "🌍 전체 공개";
      default: return visibility;
    }
  };

  const openMemberDialog = async (notebookId: string) => {
    setSelectedNotebookId(notebookId);
    setSearchQuery("");
    setSearchResults([]);
    setMemberDialogOpen(true);
    await fetchMembers(notebookId);
  };

  const fetchMembers = async (notebookId: string) => {
    const { data: memberData } = await supabase
      .from("notebook_members")
      .select("id, user_id, role")
      .eq("notebook_id", notebookId);

    if (!memberData || memberData.length === 0) {
      setMembers([]);
      return;
    }

    // 각 멤버의 프로필 정보를 가져옴
    const memberIds = memberData.map(m => m.user_id);
    const { data: profileData } = await supabase
      .from("profiles")
      .select("user_id, name, email")
      .in("user_id", memberIds);

    // 멤버 데이터와 프로필 데이터를 결합
    const membersWithProfiles = memberData.map(member => ({
      ...member,
      profiles: profileData?.find(p => p.user_id === member.user_id) || null
    }));

    setMembers(membersWithProfiles);
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("user_id, name, email")
      .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .neq("user_id", user.id)
      .limit(5);

    // 이미 멤버인 사용자 제외
    const existingMemberIds = new Set(members.map(m => m.user_id));
    const filteredResults = (data || []).filter(profile => !existingMemberIds.has(profile.user_id));

    setSearchResults(filteredResults);
    setSearching(false);
  };

  const addMember = async (userId: string) => {
    if (!selectedNotebookId) return;

    const { error } = await supabase
      .from("notebook_members")
      .insert({
        notebook_id: selectedNotebookId,
        user_id: userId,
        role: "viewer"
      });

    if (error) {
      toast({
        title: "멤버 추가 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "멤버가 추가되었어요",
      });
      setSearchQuery("");
      setSearchResults([]);
      fetchMembers(selectedNotebookId);
    }
  };

  const removeMember = async (memberId: string) => {
    const { error } = await supabase
      .from("notebook_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      toast({
        title: "멤버 삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "멤버가 삭제되었어요",
      });
      if (selectedNotebookId) {
        fetchMembers(selectedNotebookId);
      }
    }
  };

  const startEditingName = (notebookId: string, currentName: string) => {
    setEditingNotebookId(notebookId);
    setEditingName(currentName);
  };

  const cancelEditingName = () => {
    setEditingNotebookId(null);
    setEditingName("");
  };

  const saveNotebookName = async (notebookId: string) => {
    if (!editingName.trim()) {
      toast({
        title: "이름을 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("notebooks")
      .update({ name: editingName.trim() })
      .eq("id", notebookId);

    if (error) {
      toast({
        title: "이름 변경 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "일기장 이름이 변경되었어요",
      });
      setEditingNotebookId(null);
      setEditingName("");
      fetchNotebooks();
    }
  };

  if (loading) {
    return <LoadingBar />;
  }

  return (
    <div className="min-h-screen gradient-soft p-3 sm:p-4">
      <div className="max-w-4xl mx-auto pt-4 sm:pt-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
              내 일기장 <span className="text-base sm:text-lg text-muted-foreground">({notebooks.length}/5)</span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">일기장을 관리하고 공유하세요</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={notebooks.length >= 5} className="w-full sm:w-auto text-sm sm:text-base">
                <Plus className="mr-2 h-4 w-4" />
                새 일기장
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-md mx-2 sm:mx-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">새 일기장 만들기</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  새로운 일기장을 만들어보세요. 최대 5개까지 만들 수 있어요.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">일기장 이름</Label>
                  <Input
                    id="name"
                    placeholder="예: 여행 일기"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visibility">공개 설정</Label>
                  <Select value={newVisibility} onValueChange={(v: any) => setNewVisibility(v)}>
                    <SelectTrigger id="visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">🔒 나만 보기</SelectItem>
                      <SelectItem value="shared">👥 특정 사람과 공유</SelectItem>
                      <SelectItem value="public">🌍 전체 공개</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)} 
                  className="w-full sm:w-auto text-sm sm:text-base order-2 sm:order-1"
                  disabled={creating}
                >
                  취소
                </Button>
                <Button 
                  onClick={handleCreate} 
                  className="w-full sm:w-auto text-sm sm:text-base order-1 sm:order-2"
                  disabled={creating}
                >
                  {creating ? "만드는 중..." : "만들기"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {notebooks.length >= 5 && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-3 sm:p-4 sm:pt-6">
              <p className="text-xs sm:text-sm text-amber-800">
                일기장을 최대 5개까지 만들었어요. 더 만들려면 기존 일기장을 삭제해주세요.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {notebooks.map((notebook) => (
            <Card key={notebook.id} className="shadow-sm">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 sm:mt-0.5 text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      {editingNotebookId === notebook.id ? (
                        <div className="flex gap-2 items-center">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveNotebookName(notebook.id);
                              if (e.key === "Escape") cancelEditingName();
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => saveNotebookName(notebook.id)}
                            className="h-8"
                          >
                            저장
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditingName}
                            className="h-8"
                          >
                            취소
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base sm:text-lg truncate">{notebook.name}</CardTitle>
                            {!notebook.is_default && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                                onClick={() => startEditingName(notebook.id, notebook.name)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <CardDescription className="text-xs sm:text-sm">
                            {getVisibilityLabel(notebook.visibility)}
                            {notebook.is_default && " • 기본"}
                          </CardDescription>
                        </>
                      )}
                    </div>
                  </div>
                  {!notebook.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
                      onClick={() => handleDelete(notebook.id, notebook.is_default)}
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                {!notebook.is_default && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs sm:text-sm"
                    onClick={() => openMemberDialog(notebook.id)}
                  >
                    <Users className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    멤버 관리
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {notebooks.length < 5 && (
            <Card 
              className="shadow-sm border-dashed border-2 cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors"
              onClick={() => setIsDialogOpen(true)}
            >
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-center gap-3 min-h-[80px]">
                  <Plus className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
                  <div className="text-center">
                    <CardTitle className="text-base sm:text-lg text-muted-foreground">새 일기장 만들기</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">
                      특정 멤버와의 일기장을 만드세요
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}
        </div>

        <Button 
          variant="outline" 
          onClick={() => navigate("/")} 
          className="w-full sm:w-auto rounded-full text-sm sm:text-base"
        >
          ← 홈으로 돌아가기
        </Button>
      </div>

      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-md mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">멤버 관리</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              일기장을 공유할 사용자를 관리하세요
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="add" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add">멤버 추가</TabsTrigger>
              <TabsTrigger value="current">현재 멤버 ({members.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="add" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>사용자 검색</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="이름 또는 이메일로 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                  />
                  <Button onClick={searchUsers} disabled={searching}>
                    검색
                  </Button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <Label>검색 결과</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center justify-between p-2 rounded-lg border bg-card"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => addMember(user.user_id)}
                        >
                          추가
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !searching && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  검색 결과가 없습니다
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="current" className="space-y-4 mt-4">
              {members.length > 0 ? (
                <div className="space-y-2">
                  <Label>멤버 목록</Label>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {members.map((member: any) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <div className="relative">
                            <div className={`w-2 h-2 rounded-full ${
                              onlineUsers.has(member.user_id) ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                            {onlineUsers.has(member.user_id) && (
                              <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{member.profiles?.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.profiles?.email} • {onlineUsers.has(member.user_id) ? '온라인' : '오프라인'}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeMember(member.id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  아직 추가된 멤버가 없습니다
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setMemberDialogOpen(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="w-full sm:w-auto"
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
