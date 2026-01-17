import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock, Clock } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useGetUserGraphDates } from "@/api/getGraphDates";
import SharePopup from "./SharePopup";
import AddContent from "./AddContent";

interface MenuBarProps {
  refetch: () => void;
}

export default function MenuBar({ refetch }: MenuBarProps) {
  const { currentUser } = useAuthContext();
  const { graphDates } = useGetUserGraphDates(currentUser?.uid || "");

  const isPrivate = true;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatFullDate = (dateString: string | null) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const lastEditedShort = graphDates?.updatedAt
    ? formatDate(graphDates.updatedAt)
    : "Unknown";
  const lastEditedFull = graphDates?.updatedAt
    ? formatFullDate(graphDates.updatedAt)
    : "Unknown";
  const createdFull = graphDates?.createdAt
    ? formatFullDate(graphDates.createdAt)
    : "Unknown";

  return (
    <div className="flex items-center justify-between w-full px-4 py-3">
      {/* Left side - Breadcrumb and Add Content */}
      <div className="flex items-center gap-4">
        <p>Home</p>
        <AddContent onContentAdded={() => refetch()} />
      </div>

      {/* Right side - Status indicators and Share button */}
      <div className="flex items-center gap-4">
        <TooltipProvider>
          {/* Privacy Status */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm cursor-default">
                <Lock className="h-4 w-4" />
                <span>{isPrivate ? "Private" : "Public"}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>This page is {isPrivate ? "private" : "public"}</p>
            </TooltipContent>
          </Tooltip>

          {/* Last Edited */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm cursor-default">
                <Clock className="h-4 w-4" />
                <span>Edited {lastEditedShort}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p>Last edited {lastEditedFull}</p>
                <p>Created {createdFull}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Share Button */}
        <SharePopup />
      </div>
    </div>
  );
}
