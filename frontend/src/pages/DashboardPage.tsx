import { useMemo } from 'react';
import AddContent from "@/components/AddContent";
import { TypographyH1 } from "@/typography/TypographyH1";
import { toReactFlowFormat } from '@/util/graphTransform';
import { useGetUserGraph } from '@/api/getUserGraph';
import { useAuthContext } from '@/contexts/AuthContext';
import { NetworkIcon } from 'lucide-react';
import Layout from '@/components/Layout';
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

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!graph) {
      return { nodes: [], edges: [] };
    }
    return toReactFlowFormat(graph);
  }, [graph]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading graph: {error.message}</div>;
  }

  const hasNoData = initialNodes.length === 0 && initialEdges.length === 0;

  return (
    <>
      <TypographyH1>Dashboard</TypographyH1>
      <AddContent onContentAdded={() => refetch()} />
      {hasNoData ? (
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
      ) : (
        <Layout initialNodes={initialNodes} initialEdges={initialEdges} />
      )}
    </>
  );
}