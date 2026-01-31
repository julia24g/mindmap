import {
  PopoverContent,
  PopoverTrigger,
  Popover,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dashboard } from "@/types/dashboard";
import { usePublishDashboard } from "@/api/publishDashboard";
import { useUnpublishDashboard } from "@/api/unpublishDashboard";
import { Share, Copy } from "lucide-react";
import { toast } from "sonner";
import { Field, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function SharePopup({
  dashboard,
  isOwner,
}: {
  dashboard?: Dashboard | null;
  isOwner?: boolean;
}) {
  const { publishDashboard, loading: publishLoading } = usePublishDashboard();
  const { unpublishDashboard, loading: unpublishLoading } =
    useUnpublishDashboard();

  const isPublic = dashboard?.visibility === "PUBLIC";

  const publicUrl =
    isPublic && dashboard?.publicSlug
      ? `https://mindmap-sand.vercel.app/public/dashboard/${dashboard.publicSlug}`
      : "";

  const handleCopy = async () => {
    if (!publicUrl) return;

    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Copied link", { position: "top-center" });
    } catch (e) {
      console.error(e);
      toast.error("Could not copy link", { position: "top-center" });
    }
  };

  const handleClick = async () => {
    if (!dashboard || !isOwner) return;
    try {
      if (isPublic) {
        await unpublishDashboard({ variables: { dashboardId: dashboard.id } });
        toast("Dashboard unpublished", { position: "top-center" });
      } else {
        await publishDashboard({ variables: { dashboardId: dashboard.id } });
        toast.success("Dashboard published successfully", {
          position: "top-center",
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost">
          <Share />
          Share
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-100">
        <PopoverHeader>
          <PopoverTitle>Share dashboard</PopoverTitle>
          <PopoverDescription>
            Publishing generates a public, read-only link for sharing.
          </PopoverDescription>
        </PopoverHeader>
        {isPublic && dashboard?.publicSlug && (
          <Field>
            <div className="relative">
              <Input
                readOnly
                value={publicUrl}
                className="pr-10"
                onFocus={(e) => e.currentTarget.select()}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={handleCopy}
                aria-label="Copy public URL"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <FieldDescription>
              Content details, private notes, and editing remain private.
            </FieldDescription>
          </Field>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleClick}
          disabled={
            !isOwner || !dashboard || publishLoading || unpublishLoading
          }
        >
          {isPublic ? "Unpublish" : "Publish"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
