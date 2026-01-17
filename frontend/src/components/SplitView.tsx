import { useGetContent } from "@/api/getContent";
import { useAuthContext } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import ContentProperty from "./ContentProperty";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote, useEditorChange } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";

interface SplitViewProps {
  contentId: string | null;
  onClose: () => void;
}

export default function SplitView({ contentId, onClose }: SplitViewProps) {
  const editor = useCreateBlockNote();
  const { currentUser } = useAuthContext();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  const { content, loading, error } = useGetContent(
    contentId || "",
    currentUser?.uid || "",
  );

  useEffect(() => {
    if (contentId) {
      setShouldRender(true);
      // Small delay to trigger animation
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [contentId]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`w-180 border shadow-lg bg-background h-full flex flex-col transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-lg font-semibold">
            {content?.title || "Content Details"}
          </h1>
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
                  propertyValue={new Date(content.created_at).toLocaleString()}
                />
              )}
            </>
          )}
        </div>
        <Separator />
        <BlockNoteView editor={editor} />
      </div>
    </div>
  );
}
