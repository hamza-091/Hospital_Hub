import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  UserRound,
  Calendar,
  Pill,
  Receipt,
  FileText,
  LogOut,
  Stethoscope
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export function Layout({ children, title }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const adminNav = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Users", url: "/admin/users", icon: Users },
    { title: "Doctors", url: "/admin/doctors", icon: UserRound },
    { title: "Appointments", url: "/admin/appointments", icon: Calendar },
    { title: "Medicines", url: "/admin/medicines", icon: Pill },
    { title: "Invoices", url: "/admin/invoices", icon: Receipt },
  ];

  const doctorNav = [
    { title: "Dashboard", url: "/doctor", icon: LayoutDashboard },
    { title: "Appointments", url: "/doctor/appointments", icon: Calendar },
    { title: "Medical Records", url: "/doctor/records", icon: FileText },
    { title: "Prescriptions", url: "/doctor/prescriptions", icon: Pill },
  ];

  const patientNav = [
    { title: "Dashboard", url: "/patient", icon: LayoutDashboard },
    { title: "Book Appointment", url: "/patient/book", icon: Stethoscope },
    { title: "My Appointments", url: "/patient/appointments", icon: Calendar },
    { title: "Medical Records", url: "/patient/records", icon: FileText },
    { title: "Prescriptions", url: "/patient/prescriptions", icon: Pill },
    { title: "Invoices", url: "/patient/invoices", icon: Receipt },
  ];

  let navItems = [];
  if (user?.role === "admin") navItems = adminNav;
  if (user?.role === "doctor") navItems = doctorNav;
  if (user?.role === "patient") navItems = patientNav;

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-background">
        <Sidebar>
          <SidebarHeader className="border-b p-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">
                H
              </div>
              <span className="font-semibold text-lg tracking-tight">HMS</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url || (item.url !== "/admin" && item.url !== "/doctor" && item.url !== "/patient" && location.startsWith(item.url))}
                      >
                        <Link href={item.url} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user?.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none">{user?.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} title="Log out">
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 border-b flex items-center justify-between px-6 bg-card shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              {title && <h1 className="text-lg font-semibold">{title}</h1>}
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
