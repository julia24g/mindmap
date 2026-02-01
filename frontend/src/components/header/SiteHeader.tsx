import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Lock } from "lucide-react";
import { useContext } from "react";
import ContentDialogContext from "@/contexts/ContentDialogContext";
import SharePopup from "./SharePopup";
import { Dashboard } from "@/types/dashboard";
import { formatDate, formatFullDate } from "@/util/dateFormat";

export function SiteHeader({
  dashboard,
  onAddContent,
  isOwner,
}: {
  dashboard?: Dashboard | null;
  onAddContent?: () => void;
  isOwner?: boolean;
}) {
  const ctx = useContext(ContentDialogContext);
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
          <h1 className="text-base font-medium flex items-center">
            {dashboard?.name ?? "Dashboards"}
            {isOwner && dashboard?.visibility === "PUBLIC" ? (
              <Badge className="ml-2 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Public
              </Badge>
            ) : null}
          </h1>
          <div className="text-xs opacity-70">
            Created {createdFull} · Last edited{" "}
            <span title={lastEditedFull}>{lastEditedShort}</span>
          </div>
        </div>
      </div>
      {!isOwner ? (
        <div>
          <Badge variant="secondary">
            <Lock data-icon="inline-start" />
            View only
          </Badge>
        </div>
      ) : null}
      {isOwner ? <SharePopup dashboard={dashboard} isOwner={isOwner} /> : null}
      {isOwner ? (
        <div>
          <Button
            data-icon="inline-end"
            onClick={() => {
              if (onAddContent) {
                onAddContent();
              }
              if (ctx && ctx.openCreateDialog) ctx.openCreateDialog();
            }}
          >
            Add Content <Plus />
          </Button>
        </div>
      ) : null}
    </header>
  );
}
