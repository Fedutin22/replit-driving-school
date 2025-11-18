import { 
  Home, 
  BookOpen, 
  FileQuestion, 
  ClipboardList, 
  Calendar, 
  CreditCard, 
  Award, 
  Users, 
  BarChart3, 
  Settings,
  GraduationCap,
  FileText
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const studentItems = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "My Courses", url: "/courses", icon: BookOpen },
    { title: "Tests", url: "/tests", icon: FileQuestion },
    { title: "Schedule", url: "/schedule", icon: Calendar },
    { title: "Payments", url: "/payments", icon: CreditCard },
    { title: "Certificates", url: "/certificates", icon: Award },
  ];

  const instructorItems = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "My Schedule", url: "/instructor/schedule", icon: Calendar },
    { title: "My Courses", url: "/instructor/courses", icon: BookOpen },
    { title: "Attendance", url: "/instructor/attendance", icon: ClipboardList },
    { title: "Question Bank", url: "/question-categories", icon: FileQuestion },
    { title: "Test Templates", url: "/test-templates", icon: FileText },
  ];

  const adminItems = [
    { title: "Dashboard", url: "/admin", icon: BarChart3 },
    { title: "Users", url: "/admin/users", icon: Users },
    { title: "Enrollments", url: "/admin/enrollments", icon: ClipboardList },
    { title: "Courses", url: "/admin/courses", icon: BookOpen },
    { title: "Question Bank", url: "/question-categories", icon: FileQuestion },
    { title: "Test Templates", url: "/admin/test-templates", icon: FileText },
    { title: "Schedule", url: "/admin/schedule", icon: Calendar },
    { title: "Payments", url: "/admin/payments", icon: CreditCard },
    { title: "Certificates", url: "/admin/certificates", icon: Award },
    { title: "Reports", url: "/admin/reports", icon: BarChart3 },
    { title: "Audit Log", url: "/admin/audit-log", icon: Settings },
  ];

  const getMenuItems = () => {
    if (user?.role === "admin") return adminItems;
    if (user?.role === "instructor") return [...studentItems, ...instructorItems];
    return studentItems;
  };

  const menuItems = getMenuItems();

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case "admin":
        return "bg-primary text-primary-foreground";
      case "instructor":
        return "bg-sidebar-accent text-sidebar-accent-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Driving School</span>
            <span className="text-xs text-muted-foreground">Management</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
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

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 rounded-md border border-sidebar-border bg-sidebar p-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || ""} />
            <AvatarFallback>
              {user?.firstName?.charAt(0) || "U"}
              {user?.lastName?.charAt(0) || ""}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">
              {user?.firstName} {user?.lastName}
            </p>
            <Badge variant="secondary" className={`text-xs mt-1 ${getRoleBadgeColor()}`} data-testid="badge-user-role">
              {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)}
            </Badge>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
