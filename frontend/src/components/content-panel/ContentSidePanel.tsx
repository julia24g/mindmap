import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

import { useEffect, useRef, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useParams } from "react-router-dom";
import { ChevronsRight } from "lucide-react";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";

import { useGetContent } from "@/api/getContent";
import { useAddContent } from "@/api/addContent";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { ContentTypeBadge } from "./ContentTypeBadge";
import { formatFullDate } from "../../util/dateFormat";
import blockNoteTransform from "@/util/blockNoteTransform";
import { loadEditorFromNotes } from "@/util/loadEditorFromNotes";

type Mode = "view" | "create";

interface ContentSidePanelProps {
  open: boolean;
  contentId: string | null;
  onClose: () => void;
  mode?: Mode;
}

interface FormValues {
  title: string;
  type?: string;
}

const PANEL_CLASSES =
  "fixed top-0 right-0 h-full w-full sm:w-120 z-30 shadow-sm bg-background flex flex-col transition-transform duration-300 ease-in-out";

export default function ContentSidePanel({
  open,
  contentId,
  onClose,
  mode = "view",
}: ContentSidePanelProps) {
  const { dashboardId } = useParams<{ dashboardId: string }>();

  const editor = useCreateBlockNote();
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [isVisible, setIsVisible] = useState(false);

  const {
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { isDirty },
  } = useForm<FormValues>({
    defaultValues: { title: "", type: undefined },
  });

  const dashboardIdSafe = dashboardId ?? "";
  const selectedContentId = mode === "create" ? "" : (contentId ?? "");

  const { addContent, loading: addLoading } = useAddContent(dashboardIdSafe);

  const { content } = useGetContent(selectedContentId);

  const title = watch("title");
  const type = watch("type");

  // -----------------------------
  // Effects
  // -----------------------------

  // Sync panel visibility + form values on open/mode/content change
  useEffect(() => {
    if (!open) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    if (mode === "create") {
      reset({ title: "", type: undefined });
      return;
    }

    // view mode
    reset({
      title: content?.title ?? "",
      type: content?.type ?? undefined,
    });
  }, [open, mode, content?.id, reset, content?.title, content?.type]);

  // Sync BlockNote document when opening / switching selected content
  useEffect(() => {
    if (!open) return;

    // Create mode: always start empty
    if (mode === "create") {
      loadEditorFromNotes(editor, null);
      return;
    }

    loadEditorFromNotes(editor, content?.notesJSON);
  }, [open, mode, content?.id, content?.notesJSON, editor]);

  // -----------------------------
  // Handlers
  // -----------------------------

  const closePanel = () => setIsVisible(false);

  const handleTransitionEnd = () => {
    // Call parent close only after slide-out finishes (prevents snap)
    if (!isVisible && !open) onClose();
  };

  const handleTitleBlur = (e: React.FocusEvent<HTMLHeadingElement>) => {
    setValue("title", e.currentTarget.innerText, { shouldDirty: true });
  };

  const onSubmit: SubmitHandler<FormValues> = async ({ title, type }) => {
    const trimmedTitle = title?.trim();
    if (!trimmedTitle) return;

    const transformedNotes = blockNoteTransform(editor.document);

    await addContent({
      variables: {
        dashboardId: dashboardIdSafe,
        title: trimmedTitle,
        type,
        notesText: transformedNotes,
        notesJSON: JSON.stringify(editor.document),
      },
    });

    onClose();
  };

  // -----------------------------
  // Derived UI
  // -----------------------------

  const createdAtISO = content?.created_at ?? new Date().toISOString(); // create mode fallback

  return (
    <div
      className={`${PANEL_CLASSES} ${
        isVisible ? "translate-x-0" : "translate-x-full"
      }`}
      style={{ maxWidth: "100vw" }}
      onTransitionEnd={handleTransitionEnd}
    >
      <form
        className="flex h-full flex-col"
        autoComplete="off"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* Header */}
        <div className="flex h-12 items-center justify-between px-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={closePanel}
            className="h-8 w-8"
            aria-label="Close panel"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>

          <Button type="submit" size="sm" disabled={addLoading}>
            {addLoading ? "Saving..." : "Save"}
          </Button>
        </div>

        {/* Title + Meta */}
        <div className="px-12 pb-6 pt-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2
                ref={titleRef}
                contentEditable
                suppressContentEditableWarning
                className="
                  text-3xl font-semibold outline-none
                  empty:before:content-['New_content']
                  empty:before:text-muted-foreground/30
                "
                onBlur={handleTitleBlur}
              >
                {title}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Created {formatFullDate(createdAtISO)}</span>
                <span className="opacity-50">•</span>
                <ContentTypeBadge
                  value={type}
                  onChange={(v) => setValue("type", v, { shouldDirty: true })}
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Editor */}
        <div className="flex-1 overflow-auto px-12 py-8">
          <BlockNoteView editor={editor} />
        </div>
      </form>
    </div>
  );
}
