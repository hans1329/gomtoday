import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Pencil } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface PencilSetting {
  id: string;
  setting_key: string;
  setting_value: number;
  description: string | null;
}

export default function AdminPencilSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PencilSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      toast({
        title: "접근 권한 없음",
        description: "관리자만 접근할 수 있습니다.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    fetchSettings();
  };

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pencil_settings")
      .select("*")
      .order("setting_key");

    if (error) {
      console.error("설정 로드 에러:", error);
      toast({
        title: "설정 로드 실패",
        description: "연필 설정을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } else {
      setSettings(data || []);
    }
    setLoading(false);
  };

  const handleSettingChange = (settingKey: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setSettings(prev =>
      prev.map(s =>
        s.setting_key === settingKey
          ? { ...s, setting_value: numValue }
          : s
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    
    for (const setting of settings) {
      const { error } = await supabase
        .from("pencil_settings")
        .update({ setting_value: setting.setting_value })
        .eq("id", setting.id);

      if (error) {
        console.error("설정 저장 에러:", error);
        toast({
          title: "저장 실패",
          description: `${setting.description || setting.setting_key} 저장에 실패했습니다.`,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
    }

    toast({
      title: "저장 완료",
      description: "연필 설정이 저장되었습니다.",
    });
    setSaving(false);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

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
              <Pencil className="h-8 w-8" />
              연필 설정
            </h1>
            <p className="text-muted-foreground mt-1">
              연필 지급 및 차감 항목을 관리합니다
            </p>
          </div>
        </div>

        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>연필 시스템 설정</CardTitle>
            <CardDescription>
              각 항목별 연필 개수를 설정할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settings.map((setting) => (
              <div key={setting.id} className="space-y-2">
                <Label htmlFor={setting.setting_key} className="text-base font-medium pl-1">
                  {setting.description || setting.setting_key}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={setting.setting_key}
                    type="number"
                    min="0"
                    value={setting.setting_value}
                    onChange={(e) => handleSettingChange(setting.setting_key, e.target.value)}
                    className="max-w-[200px]"
                  />
                  <span className="text-sm text-muted-foreground">개</span>
                </div>
                {setting.setting_key === "signup_initial_pencils" && (
                  <p className="text-sm text-muted-foreground pl-1">
                    새로 가입한 사용자에게 지급되는 초기 연필 개수입니다.
                  </p>
                )}
                {setting.setting_key === "diary_write_cost" && (
                  <p className="text-sm text-muted-foreground pl-1">
                    일기를 작성할 때마다 차감되는 연필 개수입니다.
                  </p>
                )}
                {setting.setting_key === "photo_upload_cost" && (
                  <p className="text-sm text-muted-foreground pl-1">
                    사진을 업로드할 때마다 차감되는 연필 개수입니다.
                  </p>
                )}
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="rounded-full"
              >
                {saving ? (
                  <>저장 중...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    저장
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
