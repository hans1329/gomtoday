import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Gift, Copy, Check, Users } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Invitation {
  id: string;
  invitation_code: string;
  used: boolean;
  used_at: string | null;
  created_at: string;
}

export default function Invitations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitationCount, setInvitationCount] = useState(6);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    await fetchInvitationCount();
    await fetchInvitations();
  };

  const fetchInvitationCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("invitation_count")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      setInvitationCount(profile.invitation_count);
    }
  };

  const fetchInvitations = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("inviter_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("초대장 로드 에러:", error);
      toast({
        title: "초대장 로드 실패",
        description: "초대장 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } else {
      setInvitations(data || []);
    }
    setLoading(false);
  };

  const generateInvitationCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const createInvitation = async () => {
    if (invitationCount <= 0) {
      toast({
        title: "초대장 부족",
        description: "남은 초대장이 없습니다.",
        variant: "destructive",
      });
      return;
    }

    if (isCreating) return;

    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const invitationCode = generateInvitationCode();

      const { error: insertError } = await supabase
        .from("invitations")
        .insert({
          inviter_id: user.id,
          invitation_code: invitationCode,
        });

      if (insertError) {
        console.error("초대장 생성 에러:", insertError);
        toast({
          title: "초대장 생성 실패",
          description: "초대장을 생성하는데 실패했습니다.",
          variant: "destructive",
        });
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ invitation_count: invitationCount - 1 })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("초대장 개수 업데이트 에러:", updateError);
      }

      toast({
        title: "초대장 생성 완료",
        description: "새로운 초대장이 생성되었습니다.",
      });

      fetchInvitationCount();
      fetchInvitations();
    } finally {
      setIsCreating(false);
    }
  };

  const copyInvitationLink = async (code: string) => {
    const invitationLink = `${window.location.origin}/auth?invitation=${code}`;
    
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopiedCode(code);
      toast({
        title: "복사 완료",
        description: "초대 링크가 클립보드에 복사되었습니다.",
      });
      
      setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
    } catch (error) {
      console.error("클립보드 복사 에러:", error);
      toast({
        title: "복사 실패",
        description: "초대 링크 복사에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const usedInvitations = invitations.filter(i => i.used);
  const unusedInvitations = invitations.filter(i => !i.used);

  return (
    <div className="min-h-screen gradient-soft">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Gift className="h-8 w-8" />
              친구 초대
            </h1>
            <p className="text-muted-foreground mt-1">
              친구를 초대하고 연필을 받으세요
            </p>
          </div>
        </div>

        {/* 초대장 개수 및 생성 */}
        <Card className="shadow-medium mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                남은 초대장
              </span>
              <span className="text-2xl font-bold text-primary">{invitationCount}개</span>
            </CardTitle>
            <CardDescription>
              친구가 초대 링크로 가입하면 서로 연필 보너스를 받습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={createInvitation}
              disabled={invitationCount <= 0 || isCreating}
              className="w-full rounded-full"
              size="lg"
            >
              <Gift className="mr-2 h-5 w-5" />
              {isCreating ? "생성 중..." : "새 초대장 만들기"}
            </Button>
          </CardContent>
        </Card>

        {/* 사용 가능한 초대장 */}
        {unusedInvitations.length > 0 && (
          <Card className="shadow-medium mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                사용 가능한 초대장
              </CardTitle>
              <CardDescription>
                아래 링크를 친구에게 공유하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {unusedInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-xl bg-background/50"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-mono truncate text-muted-foreground">
                      {window.location.origin}/auth?invitation={invitation.invitation_code}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      생성일: {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyInvitationLink(invitation.invitation_code)}
                    className="shrink-0 rounded-full"
                  >
                    {copiedCode === invitation.invitation_code ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 사용된 초대장 */}
        {usedInvitations.length > 0 && (
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-muted-foreground" />
                사용 완료된 초대장
              </CardTitle>
              <CardDescription>
                친구가 가입한 초대장 목록입니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {usedInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-xl bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="text-sm font-mono text-muted-foreground line-through">
                      {invitation.invitation_code}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      사용일: {invitation.used_at ? new Date(invitation.used_at).toLocaleDateString() : "-"}
                    </p>
                  </div>
                  <Check className="h-5 w-5 text-green-600" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
