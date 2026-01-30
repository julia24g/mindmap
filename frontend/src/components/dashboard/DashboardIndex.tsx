import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetDashboards } from "@/api/getDashboards";
import { CreateDashboardDialog } from "@/components/dashboard/CreateDashboardDialog";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { NetworkIcon } from "lucide-react";

export default function DashboardIndexPage() {
  const navigate = useNavigate();

  const { dashboards, loading, error, refetch } = useGetDashboards();

  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && dashboards && dashboards.length === 0) {
      setDialogOpen(true);
    }
  }, [loading, dashboards]);

  const newestDashboardId = useMemo(() => {
    if (!dashboards || dashboards.length === 0) return null;
    const newest = dashboards.reduce((a, b) =>
      Number(b.id) > Number(a.id) ? b : a,
    );
    return String(newest.id);
  }, [dashboards]);

  useEffect(() => {
    if (!loading && newestDashboardId) {
      navigate(`/dashboard/${newestDashboardId}`, { replace: true });
    }
  }, [loading, newestDashboardId, navigate]);

  if (loading) return null;
  if (error) return <div className="p-6">Error loading dashboards.</div>;

  if (!dashboards || dashboards.length === 0) {
    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NetworkIcon />
            </EmptyMedia>
            <EmptyTitle>No dashboards yet</EmptyTitle>
            <EmptyDescription>
              Create your first dashboard to start building your graph.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        <div className="mt-6 flex justify-center">
          <Button variant="default" onClick={() => setDialogOpen(true)}>
            Create Dashboard
          </Button>
        </div>
        <CreateDashboardDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          showTrigger={false}
          onCreated={async (newId) => {
            await refetch();
            navigate(`/dashboard/${newId}`, { replace: true });
          }}
        />
      </div>
    );
  }

  return null;
}
