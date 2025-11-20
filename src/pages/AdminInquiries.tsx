import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Trash2 } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Inquiry {
  id: string;
  user_id: string | null;
  title: string;
  email: string;
  content: string;
  status: string;
  created_at: string;
}

export default function AdminInquiries() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inquiryToDelete, setInquiryToDelete] = useState<string | null>(null);

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

    fetchInquiries();
  };

  const fetchInquiries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inquiries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "문의 목록 조회 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setInquiries(data || []);
    }
    setLoading(false);
  };

  const handleStatusChange = async (inquiryId: string, newStatus: string) => {
    const { error } = await supabase
      .from("inquiries")
      .update({ status: newStatus })
      .eq("id", inquiryId);

    if (error) {
      toast({
        title: "상태 변경 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "상태 변경 완료",
        description: "문의 상태가 변경되었습니다.",
      });
      fetchInquiries();
    }
  };

  const handleDelete = async () => {
    if (!inquiryToDelete) return;

    const { error } = await supabase
      .from("inquiries")
      .delete()
      .eq("id", inquiryToDelete);

    if (error) {
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "삭제 완료",
        description: "문의가 삭제되었습니다.",
      });
      fetchInquiries();
      if (selectedInquiry?.id === inquiryToDelete) {
        setSelectedInquiry(null);
      }
    }
    setDeleteDialogOpen(false);
    setInquiryToDelete(null);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; className: string } } = {
      pending: { label: "대기중", className: "bg-yellow-100 text-yellow-800" },
      in_progress: { label: "처리중", className: "bg-blue-100 text-blue-800" },
      completed: { label: "완료", className: "bg-green-100 text-green-800" },
    };
    const statusInfo = statusMap[status] || statusMap.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">문의 관리</h1>
              <p className="text-muted-foreground">사용자 문의를 확인하고 관리합니다</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                문의 목록
              </CardTitle>
              <CardDescription>총 {inquiries.length}건의 문의</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제목</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>날짜</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inquiries.map((inquiry) => (
                      <TableRow
                        key={inquiry.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedInquiry(inquiry)}
                      >
                        <TableCell className="font-medium">{inquiry.title}</TableCell>
                        <TableCell>{inquiry.email}</TableCell>
                        <TableCell>{getStatusBadge(inquiry.status)}</TableCell>
                        <TableCell>
                          {new Date(inquiry.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInquiryToDelete(inquiry.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>문의 상세</CardTitle>
              <CardDescription>
                {selectedInquiry ? "문의 내용을 확인하고 상태를 변경하세요" : "문의를 선택하세요"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedInquiry ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">제목</label>
                    <p className="mt-1 text-lg font-medium">{selectedInquiry.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">이메일</label>
                    <p className="mt-1">{selectedInquiry.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">문의 내용</label>
                    <p className="mt-1 whitespace-pre-wrap bg-muted p-4 rounded-lg">
                      {selectedInquiry.content}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">등록일</label>
                    <p className="mt-1">
                      {new Date(selectedInquiry.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      상태 변경
                    </label>
                    <Select
                      value={selectedInquiry.status}
                      onValueChange={(value) => handleStatusChange(selectedInquiry.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">대기중</SelectItem>
                        <SelectItem value="in_progress">처리중</SelectItem>
                        <SelectItem value="completed">완료</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  문의를 선택하면 상세 내용이 표시됩니다
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>문의 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 문의를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
