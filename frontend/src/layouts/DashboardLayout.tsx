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
  const { dashboard, loading } = useGetDashboard(
    currentUser?.uid ?? "",
    dashboardId ?? "",
  );

  const [isSplitViewOpen, setIsSplitViewOpen] = useState(false);

  // Handler to notify Dashboard to reset selectedContentId
  const [addContentTrigger, setAddContentTrigger] = useState(0);
  const handleAddContent = () => {
    setIsSplitViewOpen(true);
    setAddContentTrigger((prev) => prev + 1); // increment to trigger effect in Dashboard
  };

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader
          dashboard={loading ? null : dashboard}
          onAddContent={handleAddContent}
        />
        <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
          <Outlet
            context={{ isSplitViewOpen, setIsSplitViewOpen, addContentTrigger }}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
