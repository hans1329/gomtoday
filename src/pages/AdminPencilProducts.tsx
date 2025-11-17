import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil, Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface PencilProduct {
  id: string;
  name: string;
  pencil_count: number;
  price: number;
  display_order: number;
  is_active: boolean;
}

export default function AdminPencilProducts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<PencilProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PencilProduct | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    pencil_count: 0,
    price: 0,
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("pencil_products")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "오류",
        description: "상품 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (product?: PencilProduct) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        pencil_count: product.pencil_count,
        price: product.price,
        display_order: product.display_order,
        is_active: product.is_active,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        pencil_count: 0,
        price: 0,
        display_order: products.length + 1,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from("pencil_products")
          .update(formData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast({ title: "성공", description: "상품이 수정되었습니다." });
      } else {
        const { error } = await supabase
          .from("pencil_products")
          .insert([formData]);

        if (error) throw error;
        toast({ title: "성공", description: "상품이 추가되었습니다." });
      }

      setDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "오류",
        description: "상품 저장에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 상품을 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("pencil_products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "성공", description: "상품이 삭제되었습니다." });
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "오류",
        description: "상품 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen gradient-soft">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Pencil className="h-8 w-8" />
              연필 상품 관리
            </h1>
            <p className="text-muted-foreground mt-1">
              판매할 연필 상품을 관리합니다
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="rounded-full">
            <Plus className="h-4 w-4 mr-2" />
            상품 추가
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">로딩 중...</div>
        ) : (
          <div className="grid gap-4">
            {products.map((product) => (
              <Card key={product.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold">{product.name}</h3>
                        {!product.is_active && (
                          <span className="text-xs px-2 py-1 bg-muted rounded-full">
                            비활성
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>연필: {product.pencil_count}개</span>
                        <span>가격: ₩{product.price.toLocaleString()}</span>
                        <span>순서: {product.display_order}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenDialog(product)}
                        className="rounded-full"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                        className="rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "상품 수정" : "상품 추가"}
            </DialogTitle>
            <DialogDescription>
              연필 상품 정보를 입력하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>상품명</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="예: 연필 10개"
              />
            </div>
            <div>
              <Label>연필 개수</Label>
              <Input
                type="number"
                value={formData.pencil_count}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pencil_count: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label>가격 (원)</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label>표시 순서</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    display_order: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>활성화</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-full"
            >
              취소
            </Button>
            <Button onClick={handleSave} className="rounded-full">
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
