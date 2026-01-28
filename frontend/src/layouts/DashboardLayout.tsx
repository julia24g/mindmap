import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/sidebar/AppSidebar";
import { SiteHeader } from "@/components/header/SiteHeader";
import { Outlet, useParams } from "react-router-dom";
import { useGetDashboard } from "@/api/getDashboard";
import { useAuthContext } from "@/contexts/AuthContext";
import { useState } from "react";

export default function DashboardLayout() {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const { currentUser } = useAuthContext();
  const { dashboard, loading } = useGetDashboard(dashboardId ?? "");

  const isOwner = !!(
    currentUser &&
    dashboard &&
    currentUser.uid === dashboard.userId
  );

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
          isOwner={isOwner}
        />
        <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
          <Outlet
            context={{
              isSplitViewOpen,
              setIsSplitViewOpen,
              selectedContentId,
              setSelectedContentId,
              isOwner,
            }}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
