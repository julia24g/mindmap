import { useGetContent } from "@/api/getContent";
import { useAuthContext } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import ContentProperty from "@/components/graph/ContentProperty";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";

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

  // Only call onClose after transition ends
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
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <Input
              placeholder="New content"
              className="
                h-auto text-3xl! font-bold
                border-0 bg-transparent shadow-none
                px-0 py-2
                focus-visible:ring-0 focus-visible:ring-offset-0
                placeholder:text-muted-foreground/30
              "
              value={mode === "create" ? "" : content?.title}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="space-y-6">
            {content && (
              <>
                {content.type && (
                  <ContentProperty
                    propertyTitle="Type"
                    propertyValue={content.type}
                  />
                )}
                {content.created_at && (
                  <ContentProperty
                    propertyTitle="Created At"
                    propertyValue={new Date(
                      content.created_at,
                    ).toLocaleString()}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
