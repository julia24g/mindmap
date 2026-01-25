import { useMemo, useState, useCallback, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { toReactFlowFormat } from "@/util/graphTransform";
import { useGetGraph } from "@/api/getGraph";
import { useAuthContext } from "@/contexts/AuthContext";
import { NetworkIcon } from "lucide-react";
import Layout from "@/components/graph/Layout";
import ContentSidePanel from "@/components/content-panel/ContentSidePanel";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useParams } from "react-router-dom";

export default function Dashboard() {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const { currentUser } = useAuthContext();

  const userId = currentUser?.uid ?? "";

  const { graph, loading, error, refetch } = useGetGraph(
    userId,
    dashboardId ?? "",
  );

  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null,
  );
  const { isSplitViewOpen, setIsSplitViewOpen, addContentTrigger } =
    useOutletContext<{
      isSplitViewOpen: boolean;
      setIsSplitViewOpen: (open: boolean) => void;
      addContentTrigger: number;
    }>();

  useEffect(() => {
    if (isSplitViewOpen) {
      setSelectedContentId(null);
    }
  }, [addContentTrigger]);

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
    [setIsSplitViewOpen],
  );

  const handleCloseSplitView = () => {
    setIsSplitViewOpen(false);
  };

  const hasNoData = initialNodes.length === 0 && initialEdges.length === 0;

  return (
    <div className="relative flex-1 w-full flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
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
            />
          </div>
        </div>
      )}
      <ContentSidePanel
        open={isSplitViewOpen}
        contentId={selectedContentId}
        onClose={handleCloseSplitView}
        mode={selectedContentId ? "view" : "create"}
      />
    </div>
  );
}
