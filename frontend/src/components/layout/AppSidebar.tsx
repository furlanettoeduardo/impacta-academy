'use client';

import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NavLink } from '@/components/layout/NavLink';

const studentItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Cursos', url: '/courses', icon: BookOpen },
];

const teacherItems = [
  { title: 'Painel Professor', url: '/teacher/dashboard', icon: LayoutDashboard },
  { title: 'Gerenciar Cursos', url: '/teacher/courses/manage', icon: BookOpen },
];

const adminItems = [
  { title: 'Painel Admin', url: '/admin/dashboard', icon: Shield },
  { title: 'Configurações', url: '/admin/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const router = useRouter();

  const renderGroup = (label: string, items: typeof studentItems) => (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/50">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  href={item.url}
                  end
                  className="hover:bg-sidebar-accent/50"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div
          className={`flex items-center gap-2 px-3 py-4 ${collapsed ? 'justify-center' : ''}`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <span
              className="text-lg font-bold text-sidebar-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Impacta
            </span>
          )}
        </div>

        {renderGroup('Aluno', studentItems)}
        {!collapsed && <Separator className="mx-3 w-auto bg-sidebar-border" />}
        {renderGroup('Professor', teacherItems)}
        {!collapsed && <Separator className="mx-3 w-auto bg-sidebar-border" />}
        {renderGroup('Administração', adminItems)}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground"
          onClick={() => router.push('/')}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
