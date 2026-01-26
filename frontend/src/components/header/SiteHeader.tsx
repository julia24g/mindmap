import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Popover, PopoverTrigger } from "@radix-ui/react-popover";
import SharePopup from "./SharePopup";
import { formatDate, formatFullDate } from "@/util/dateFormat";

type DashboardMeta = {
  id: string;
  name: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export function SiteHeader({
  dashboard,
  onAddContent,
}: {
  dashboard?: DashboardMeta | null;
  onAddContent?: () => void;
}) {
  // ...existing code...

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
      <div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost">Share</Button>
          </PopoverTrigger>
          <SharePopup />
        </Popover>
      </div>
      <div>
        <Button
          data-icon="inline-end"
          onClick={() => {
            if (onAddContent) {
              onAddContent();
            }
          }}
        >
          Add Content <Plus />
        </Button>
      </div>
    </header>
  );
}
