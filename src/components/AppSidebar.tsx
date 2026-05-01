import { LayoutDashboard, Users, Calendar, Dumbbell, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Pacientes", url: "/patients", icon: Users },
  { title: "Turnos", url: "/appointments", icon: Calendar },
  { title: "Ejercicios", url: "/exercises", icon: Dumbbell },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { profile, signOut } = useAuth();

  const initials = profile?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "TO";

  const isActive = (url: string) => {
    if (url === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-5 py-6 border-b border-sidebar-border">
        {!collapsed ? (
          <div>
            <p className="font-serif text-xl font-semibold text-foreground tracking-tight">RehabOT</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground mt-0.5">Clínica · Terapia Ocupacional</p>
          </div>
        ) : (
          <p className="font-serif text-lg font-semibold text-foreground text-center">R</p>
        )}
      </SidebarHeader>

      <SidebarContent className="px-3 py-5">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="px-3 mb-3 text-[10px] tracking-[0.14em] uppercase text-muted-foreground font-medium">
              Trabajo
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink
                        to={item.url}
                        className={`relative flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] transition-colors ${
                          active
                            ? "border-l-[3px] border-l-primary text-foreground font-semibold bg-transparent"
                            : "text-sidebar-foreground font-normal hover:bg-sidebar-accent/60 border-l-[3px] border-l-transparent"
                        }`}
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2 : 1.5} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-5 border-t border-sidebar-border">
        {!collapsed && profile && (
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarFallback className="bg-primary/8 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile.full_name}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {profile.specialty || "T. Ocupacional"}
              </p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={signOut}
          className="w-full justify-start text-muted-foreground hover:text-destructive text-[13px]"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Cerrar sesión</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
