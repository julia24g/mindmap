"use client";

import * as React from "react";
import { useGetDashboards } from "@/api/getDashboards";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { CreateDashboardDialog } from "@/components/dashboard/CreateDashboardDialog";
import { ChevronRight, FolderPlus, Brain } from "lucide-react";

export default function AppSidebar({
  variant = "inset",
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { currentUser } = useAuthContext();
  const { dashboards, refetch } = useGetDashboards(currentUser?.uid ?? "");

  const items = dashboards.map((dashboard) => ({
    title: dashboard.name,
    url: `/dashboard/${dashboard.id}`,
  }));

  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Sidebar variant={variant} className="w-65" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 ${isActive ? "font-semibold" : ""}`
                }
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Brain className="size-4" />
                </div>

                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">MindMap</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <Collapsible
          key="dashboards"
          title="Dashboards"
          defaultOpen
          className="group/collapsible"
        >
          <SidebarGroup>
            <SidebarGroupLabel className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm">
              <CollapsibleTrigger className="flex w-full items-center gap-2">
                <span>Dashboards</span>{" "}
                <ChevronRight className="h-4 w-4 ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* New Dashboard action */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setDialogOpen(true)}
                      className="flex items-center gap-2"
                    >
                      <FolderPlus className="h-4 w-4" />
                      New Dashboard
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={({ isActive }) =>
                            isActive ? "font-medium" : ""
                          }
                        >
                          {item.title}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
      <SidebarRail />
      <CreateDashboardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        showTrigger={false}
        refetchDashboards={refetch}
      />
    </Sidebar>
  );
}
