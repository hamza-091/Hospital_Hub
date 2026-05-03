import { useState } from "react";
import { useListMedicines, useCreateMedicine } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Pill, Package } from "lucide-react";
import { formatPKR } from "@/lib/currency";

export default function AdminMedicines() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isLoading, refetch } = useListMedicines({ search: search || undefined });
  const createMed = useCreateMedicine();
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      name: "",
      genericName: "",
      manufacturer: "",
      category: "",
      price: "",
      stockQuantity: "",
      expiryDate: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createMed.mutate(
      {
        data: {
          name: values.name,
          genericName: values.genericName || undefined,
          manufacturer: values.manufacturer || undefined,
          category: values.category || undefined,
          price: values.price ? Number(values.price) : undefined,
          stockQuantity: values.stockQuantity ? Number(values.stockQuantity) : 0,
          expiryDate: values.expiryDate || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Medicine added" });
          setOpen(false);
          form.reset();
          refetch();
        },
        onError: (e) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
      }
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search medicines..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Medicine</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Medicine</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Name *</Label>
                  <Input required {...form.register("name")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Generic Name</Label>
                  <Input {...form.register("genericName")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input {...form.register("category")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Manufacturer</Label>
                  <Input {...form.register("manufacturer")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit Price (PKR)</Label>
                  <Input type="number" step="0.01" {...form.register("price")} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Stock Quantity</Label>
                  <Input type="number" {...form.register("stockQuantity")} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Expiry Date</Label>
                  <Input type="date" {...form.register("expiryDate")} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMed.isPending}>
                {createMed.isPending ? "Adding..." : "Add Medicine"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Manufacturer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stock</th>
                </tr>
              </thead>
              <tbody>
                {(data?.medicines ?? []).length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No medicines found</td></tr>
                )}
                {(data?.medicines ?? []).map((med) => (
                  <tr key={med.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Pill className="h-3.5 w-3.5 text-primary shrink-0" />
                        <div>
                          <p className="font-medium">{med.name}</p>
                          {med.genericName && <p className="text-xs text-muted-foreground">{med.genericName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{med.category ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{med.manufacturer ?? "-"}</td>
                    <td className="px-4 py-3 font-medium">{med.price ? formatPKR(med.price) : "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        (med.stockQuantity ?? 0) > 50 ? "bg-green-100 text-green-700" :
                        (med.stockQuantity ?? 0) > 10 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        <Package className="inline h-3 w-3 mr-1" />
                        {med.stockQuantity ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
