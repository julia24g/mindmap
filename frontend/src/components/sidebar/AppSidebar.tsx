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
import { NavLink } from "react-router-dom";

export default function AppSidebar({
  variant = "sidebar",
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { currentUser } = useAuthContext();
  const { dashboards, loading, error } = useGetDashboards(
    currentUser?.uid ?? "",
  );

  const items = dashboards.map((dashboard) => ({
    title: dashboard.name,
    url: `/dashboard/${dashboard.id}`,
  }));

  return (
    <Sidebar variant={variant} {...props}>
      <SidebarHeader>MindMap</SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboards</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive ? "font-medium" : undefined
                      }
                    >
                      {item.title}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
