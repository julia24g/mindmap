import { useGetContent } from "@/api/getContent";
import { useForm, SubmitHandler } from "react-hook-form";
import { useAuthContext } from "@/contexts/AuthContext";
import { ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { useAddContent } from "@/api/addContent";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/shadcn/style.css";
import { ContentTypeBadge } from "./ContentTypeBadge";
import { formatFullDate } from "../../util/dateFormat";
import { Separator } from "@/components/ui/separator";
import { BlockNoteView } from "@blocknote/shadcn";
import { useParams } from "react-router-dom";
import blockNoteTransform from "@/util/blockNoteTransform";

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
  interface IFormInput {
    title: string;
    type?: string;
  }

  const { handleSubmit, setValue, reset, watch } = useForm<IFormInput>({
    defaultValues: { title: "", type: undefined },
  });
  const titleRef = useRef<HTMLHeadingElement>(null);
  const editor = useCreateBlockNote();
  const { currentUser } = useAuthContext();
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const { addContent, loading: addLoading } = useAddContent(
    currentUser?.uid ?? "",
    dashboardId ?? "",
  );

  const [isVisible, setIsVisible] = useState(false);

  const { content, loading, error } = useGetContent(
    mode === "create" ? "" : contentId || "",
    currentUser?.uid || "",
  );

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      if (mode !== "create" && content) {
        reset({ title: content.title || "", type: content.type });
      } else {
        reset({ title: "", type: undefined });
      }
    } else {
      setIsVisible(false);
    }
  }, [open, content, mode]);

  const handleTransitionEnd = () => {
    if (!isVisible && !open) {
      onClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    const notes = editor.document;
    const currentTitle = data.title?.trim();
    const transformedNotes = blockNoteTransform(notes);
    if (!currentUser?.uid || !currentTitle) return;
    await addContent({
      variables: {
        firebaseUid: currentUser.uid,
        dashboardId: dashboardId || "",
        title: currentTitle,
        type: data.type,
        notes: transformedNotes,
      },
    });
    onClose();
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-full sm:w-120 z-30 shadow-sm bg-background flex flex-col transition-transform duration-300 ease-in-out ${
        isVisible ? "translate-x-0" : "translate-x-full"
      }`}
      style={{ maxWidth: "100vw" }}
      onTransitionEnd={handleTransitionEnd}
    >
      <form
        className="flex flex-col h-full"
        autoComplete="off"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="h-12 px-4 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
            aria-label="Close panel"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
          <Button type="submit" size="sm" disabled={addLoading}>
            {addLoading ? "Saving..." : "Save"}
          </Button>
        </div>
        <div className="px-12 pt-8 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2
                ref={titleRef}
                contentEditable
                suppressContentEditableWarning
                className="
                  text-3xl font-semibold
                  outline-none
                  empty:before:content-['New_content']
                  empty:before:text-muted-foreground/30
                "
                onBlur={(e) => setValue("title", e.currentTarget.innerText)}
              >
                {watch("title")}
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
                  value={watch("type")}
                  onChange={(v) => setValue("type", v)}
                />
              </div>
            </div>
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
