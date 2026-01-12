import { useEffect, useMemo } from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceX,
  forceY,
} from 'd3-force';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useNodesInitialized,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import collide from '@/util/collision';
import AddContent from "@/components/AddContent";
import { TypographyH1 } from "@/typography/TypographyH1";
import { toReactFlowFormat } from '@/util/graphTransform';
import { useGetUserGraph } from '@/api/getUserGraph';
import { useAuthContext } from '@/contexts/AuthContext';
import { NetworkIcon } from 'lucide-react';
import ContentNode from '@/components/nodetypes/ContentNode';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

const simulation = forceSimulation()
  .force('charge', forceManyBody().strength(-1000))
  .force('x', forceX().x(0).strength(0.05))
  .force('y', forceY().y(0).strength(0.05))
  .force('collide', collide())
  .alphaTarget(0.05)
  .stop();

const nodeTypes = {
  contentNode: ContentNode
};

const useLayoutedElements = () => {
  const { getNodes, setNodes, getEdges, fitView } = useReactFlow();
  const initialized = useNodesInitialized();

  useEffect(() => {
    if (!initialized) return;

    const nodes = getNodes().map((node) => ({ 
      ...node,
      x: node.position.x,
      y: node.position.y,
    }));

    const edges = getEdges();

    simulation.nodes(nodes).force(
      'link',
      forceLink(edges)
        .id((d: any) => d.id)
        .strength(0.05)
        .distance(100),
    );

    simulation.tick(300);

    setNodes(
      nodes.map((node) => ({
        ...node,
        position: { x: node.x, y: node.y },
      }))
    );

    window.requestAnimationFrame(() => fitView());
  }, [initialized, getNodes, getEdges, setNodes, fitView]);
};

const LayoutFlow = ({ initialNodes, initialEdges }: { initialNodes: Node[], initialEdges: Edge[] }) => {
  const [nodes, , ] = useNodesState(initialNodes);
  const [edges, , ] = useEdgesState(initialEdges);

  useLayoutedElements();

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
    >
      <Background variant={BackgroundVariant.Dots} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
};

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
        <div style={{ width: '100vw', height: '100vh' }}>
          <ReactFlowProvider>
            <LayoutFlow initialNodes={initialNodes} initialEdges={initialEdges} />
          </ReactFlowProvider>
        </div>
      )}
    </>
  );
}