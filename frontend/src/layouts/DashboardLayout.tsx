import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/sidebar/AppSidebar";
import { SiteHeader } from "@/components/sidebar/SiteHeader";
import { Outlet, useParams } from "react-router-dom";
import { useGetDashboard } from "@/api/getDashboard";
import { useAuthContext } from "@/contexts/AuthContext";

export default function DashboardLayout() {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const { currentUser } = useAuthContext();
  const { dashboard, loading } = useGetDashboard(
    currentUser?.uid ?? "",
    dashboardId ?? "",
  );

  return (
    <SidebarProvider>
      <AppSidebar variant="sidebar" />
      <SidebarInset>
        <SiteHeader dashboard={loading ? null : dashboard} />
        <div className="flex flex-1 min-w-0 min-h-0 overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
