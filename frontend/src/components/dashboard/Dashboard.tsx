import { useMemo, useCallback, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toReactFlowFormat } from "@/util/graphTransform";
import { useGetGraph } from "@/api/getGraph";
import { NetworkIcon } from "lucide-react";
import Layout from "@/components/graph/Layout";
import { DialogDemo } from "@/components/content-panel/Dialog";
import { useContentDialog } from "@/contexts/ContentDialogContext";
import { useRef } from "react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useParams } from "react-router-dom";

export default function Dashboard() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { open, mode, contentId, setOpen } = useContentDialog();
  const { dashboardId } = useParams<{ dashboardId: string }>();

  const { graph } = useGetGraph(dashboardId ?? "");

  const { setIsSplitViewOpen, setSelectedContentId, isOwner } =
    useOutletContext<{
      setIsSplitViewOpen: (open: boolean) => void;
      setSelectedContentId: (id: string | null) => void;
      isOwner?: boolean;
    }>();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!graph) {
      return { nodes: [], edges: [] };
    }
    return toReactFlowFormat(graph);
  }, [graph]);

  const handleNodeClick = useCallback(
    (contentId: string) => {
      setSelectedContentId(contentId);
      setIsSplitViewOpen(true);
    },
    [setSelectedContentId, setIsSplitViewOpen],
  );

  const hasNoData = initialNodes.length === 0 && initialEdges.length === 0;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full flex flex-col h-full min-h-0 min-w-0 overflow-hidden rounded-b-lg"
    >
      {hasNoData ? (
        <div className="flex-1">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <NetworkIcon />
              </EmptyMedia>
              <EmptyTitle>No Knowledge Graph Yet</EmptyTitle>
              <EmptyDescription>
                You haven't added any content yet. Get started by adding your
                first piece of content above.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 min-w-0">
          <div className="flex-1 min-w-0">
            <Layout
              initialNodes={initialNodes}
              initialEdges={initialEdges}
              onNodeClick={handleNodeClick}
              isOwner={!!isOwner}
            />
          </div>
        </div>
      )}
      {/* Render the dialog inside the dashboard so it only covers this area */}
      <DialogDemo
        mode={mode}
        contentId={contentId}
        open={open}
        onOpenChange={setOpen}
        portalContainer={containerRef.current}
      />
    </div>
  );
}
