import { useState } from "react";
import { useListUsers, useUpdateUser } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, ShieldCheck, Stethoscope, User, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

const roleIcons = {
  admin: ShieldCheck,
  doctor: Stethoscope,
  patient: User,
};

const roleColors = {
  admin: "bg-purple-100 text-purple-700",
  doctor: "bg-blue-100 text-blue-700",
  patient: "bg-green-100 text-green-700",
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const { data, isLoading, refetch } = useListUsers({ search: search || undefined, role: roleFilter !== "all" ? roleFilter as any : undefined });
  const updateUser = useUpdateUser();
  const { toast } = useToast();

  const handleToggleStatus = (id: number, currentStatus: string) => {
    updateUser.mutate(
      { id, data: { status: currentStatus === "active" ? "suspended" : "active" } },
      {
        onSuccess: () => {
          toast({ title: "User updated" });
          refetch();
        },
        onError: () => toast({ title: "Failed to update user", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="doctor">Doctor</SelectItem>
            <SelectItem value="patient">Patient</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Joined</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.users ?? []).length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No users found</td></tr>
                )}
                {(data?.users ?? []).map((user) => {
                  const RoleIcon = roleIcons[user.role] ?? User;
                  return (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${roleColors[user.role] ?? "bg-gray-100 text-gray-600"}`}>
                          <RoleIcon className="h-3 w-3" />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{user.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        {user.status === "active" ? (
                          <span className="flex items-center gap-1 text-xs text-green-700">
                            <CheckCircle className="h-3.5 w-3.5" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-700">
                            <XCircle className="h-3.5 w-3.5" /> Suspended
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          disabled={updateUser.isPending}
                        >
                          {user.status === "active" ? "Suspend" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
