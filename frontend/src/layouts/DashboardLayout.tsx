import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/sidebar/AppSidebar";
import { SiteHeader } from "@/components/header/SiteHeader";
import { Outlet, useParams } from "react-router-dom";
import { useGetDashboard } from "@/api/getDashboard";
import { useState } from "react";

export default function DashboardLayout() {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const { dashboard, loading } = useGetDashboard(dashboardId ?? "");

  const [isSplitViewOpen, setIsSplitViewOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null,
  );

  const handleAddContent = () => {
    setIsSplitViewOpen(true);
    setSelectedContentId(null);
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          dashboard={loading ? null : dashboard}
          onAddContent={handleAddContent}
          isOwner={dashboard?.isOwner ?? false}
        />
        <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
          <Outlet
            context={{
              isSplitViewOpen,
              setIsSplitViewOpen,
              selectedContentId,
              setSelectedContentId,
              isOwner: dashboard?.isOwner ?? false,
            }}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
