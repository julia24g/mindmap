import { useMemo, useState, useCallback } from 'react';
import AddContent from "@/components/AddContent";
import { TypographyH1 } from "@/typography/TypographyH1";
import { toReactFlowFormat } from '@/util/graphTransform';
import { useGetUserGraph } from '@/api/getUserGraph';
import { useAuthContext } from '@/contexts/AuthContext';
import { NetworkIcon } from 'lucide-react';
import Layout from '@/components/Layout';
import SplitView from '@/components/SplitView';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function DashboardPage() {
  const { currentUser } = useAuthContext();
  const { graph, loading, error, refetch } = useGetUserGraph(currentUser?.uid || '');
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [isSplitViewOpen, setIsSplitViewOpen] = useState(false);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!graph) {
      return { nodes: [], edges: [] };
    }
    return toReactFlowFormat(graph);
  }, [graph]);

  const handleNodeClick = useCallback((contentId: string) => {
    console.log("Node clicked:", contentId);
    console.log("Setting selectedContentId to:", contentId);
    console.log("Setting isSplitViewOpen to: true");
    setSelectedContentId(contentId);
    setIsSplitViewOpen(true);
    console.log("After setState calls");
  }, []);

  const handleCloseSplitView = () => {
    setIsSplitViewOpen(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading graph: {error.message}</div>;
  }

  const hasNoData = initialNodes.length === 0 && initialEdges.length === 0;

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-none">
        <TypographyH1>Dashboard</TypographyH1>
        <AddContent onContentAdded={() => refetch()} />
      </div>
      {hasNoData ? (
        <div className="flex-1">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <NetworkIcon />
              </EmptyMedia>
              <EmptyTitle>No Knowledge Graph Yet</EmptyTitle>
              <EmptyDescription>
                You haven't added any content yet. Get started by adding your first piece of content above.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          <div className="flex-1">
            <Layout 
              initialNodes={initialNodes} 
              initialEdges={initialEdges}
              onNodeClick={handleNodeClick}
            />
          </div>
          {isSplitViewOpen && (
            <SplitView
              contentId={selectedContentId}
              onClose={handleCloseSplitView}
            />
          )}
        </div>
      )}
    </div>
  );
}