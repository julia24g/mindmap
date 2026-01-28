import { useParams } from "react-router-dom";
import { useGetPublicDashboard } from "@/api/getPublicDashboard";
import { useGetPublicGraph } from "@/api/getPublicGraph";
import { toReactFlowFormat } from "@/util/graphTransform";
import Layout from "@/components/graph/Layout";
import PublicDashboardAlert from "./PublicDashboardAlert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function PublicDashboard() {
  const { publicSlug } = useParams<{ publicSlug: string }>();

  const { dashboard, loading: dashLoading } = useGetPublicDashboard(
    publicSlug ?? "",
  );
  const { graph, loading: graphLoading } = useGetPublicGraph(
    dashboard?.id ?? "",
  );

  const isLoading = dashLoading || graphLoading;

  const { nodes: initialNodes, edges: initialEdges } = (function () {
    if (!graph) return { nodes: [], edges: [] };
    return toReactFlowFormat(graph);
  })();

  const hasNoData = initialNodes.length === 0 && initialEdges.length === 0;

  return (
    <div className="relative flex-1 w-full flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <PublicDashboardAlert />
      {isLoading ? (
        <div className="flex-1">Loading…</div>
      ) : hasNoData ? (
        <div className="flex-1">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No public knowledge yet</EmptyTitle>
              <EmptyDescription>
                This public dashboard has no visible content.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          {/* Read-only layout: isOwner false and no click handlers */}
          <Layout
            initialNodes={initialNodes}
            initialEdges={initialEdges}
            isOwner={false}
          />
        </div>
      )}
    </div>
  );
}
