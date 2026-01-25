import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

type DashboardMeta = {
  id: string;
  name: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export function SiteHeader({
  dashboard,
}: {
  dashboard?: DashboardMeta | null;
}) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatFullDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const lastEditedShort = dashboard?.updatedAt
    ? formatDate(dashboard.updatedAt)
    : "Unknown";
  const lastEditedFull = dashboard?.updatedAt
    ? formatFullDate(dashboard.updatedAt)
    : "Unknown";
  const createdFull = dashboard?.createdAt
    ? formatFullDate(dashboard.createdAt)
    : "Unknown";

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        <div className="flex flex-col">
          <h1 className="text-base font-medium">
            {dashboard?.name ?? "Dashboards"}
          </h1>
          <div className="text-xs opacity-70">
            Created {createdFull} · Last edited{" "}
            <span title={lastEditedFull}>{lastEditedShort}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
