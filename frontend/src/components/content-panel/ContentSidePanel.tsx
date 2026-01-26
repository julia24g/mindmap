import { useGetContent } from "@/api/getContent";
import { useAuthContext } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/shadcn/style.css";
import { ContentTypeBadge } from "./ContentTypeBadge";
import { formatFullDate } from "../../util/dateFormat";
import { Separator } from "@/components/ui/separator";
import { BlockNoteView } from "@blocknote/shadcn";

interface ContentSidePanelProps {
  open: boolean;
  contentId: string | null;
  onClose: () => void;
  mode?: "view" | "create";
}

export default function ContentSidePanel({
  open,
  contentId,
  onClose,
  mode,
}: ContentSidePanelProps) {
  const editor = useCreateBlockNote();
  const { currentUser } = useAuthContext();

  const [isVisible, setIsVisible] = useState(false);

  const { content, loading, error } = useGetContent(
    mode === "create" ? "" : contentId || "",
    currentUser?.uid || "",
  );

  useEffect(() => {
    if (open) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  const handleTransitionEnd = () => {
    if (!isVisible && !open) {
      onClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-full sm:w-120 z-30 shadow-sm bg-background flex flex-col transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-x-0" : "translate-x-full"
      }`}
      style={{ maxWidth: "100vw" }}
      onTransitionEnd={handleTransitionEnd}
    >
      <form className="flex flex-col h-full" autoComplete="off">
        <div className="px-12 pt-12 pb-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2
                contentEditable
                suppressContentEditableWarning
                className="
              text-3xl font-semibold
              outline-none
              empty:before:content-['New_content']
              empty:before:text-muted-foreground/30
            "
              >
                {mode === "create" ? "" : content?.title}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Created{" "}
                  {content?.created_at
                    ? formatFullDate(content.created_at)
                    : formatFullDate(new Date().toISOString())}
                </span>
                <span className="opacity-50">•</span>
                <ContentTypeBadge
                  value={content?.type}
                  onChange={(value) => {
                    // persist
                  }}
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Separator />
        <div className="flex-1 overflow-auto px-12 py-8">
          <BlockNoteView editor={editor} />
        </div>
      </form>
    </div>
  );
}
