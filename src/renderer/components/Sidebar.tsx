import {
  Calendar,
  Home,
  Inbox,
  Library,
  LogOut,
  Search,
  Settings,
  User2,
  ChevronUp,
  LogIn,
  Download,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useAuth } from '@/src/shared/AuthContext';

// Menu items.
const items = [
  {
    title: 'Home',
    url: '#/home',
    icon: Home,
  },
  {
    title: 'Library',
    url: '#/library',
    icon: Library,
  },
  {
    title: 'Settings',
    url: '#/settings',
    icon: Settings,
  },
];

export function AppSidebar() {
  const { currentUser, logout, initialized } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '#/login';
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <>
      <Sidebar>
        <div className="app-region-drag h-10 right-0 top-0 left-0"></div>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Application</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {initialized && currentUser ? (
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton>
                      <User2 /> {currentUser.email || 'User'}
                      <ChevronUp className="ml-auto" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="top"
                    className="w-[--radix-popper-anchor-width]"
                  >
                    <DropdownMenuItem asChild>
                      <a href="#/settings">
                        <span>Settings</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="#/account">
                        <span>Account</span>
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ) : (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#/login">
                    <LogIn />
                    <span>Login</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  );
}
