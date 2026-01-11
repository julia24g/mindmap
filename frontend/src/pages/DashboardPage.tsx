import { useEffect } from 'react';
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

const initialNodes: Node[] = [
  { id: 'n1', data: { label: 'Node 1' }, position: { x: 0, y: 0 } },
  { id: 'n2', data: { label: 'Node 2' }, position: { x: 0, y: 0 } },
];
const initialEdges: Edge[] = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];

const simulation = forceSimulation()
  .force('charge', forceManyBody().strength(-1000))
  .force('x', forceX().x(0).strength(0.05))
  .force('y', forceY().y(0).strength(0.05))
  .force('collide', collide())
  .alphaTarget(0.05)
  .stop();

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

const LayoutFlow = () => {
  const [nodes, , ] = useNodesState(initialNodes);
  const [edges, , ] = useEdgesState(initialEdges);

  useLayoutedElements();

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
    >
      <Background variant={BackgroundVariant.Dots} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
};

export default function DashboardPage() {
  return (
    <>
      <TypographyH1>Dashboard</TypographyH1>
      <AddContent />
      <div style={{ width: '100vw', height: '100vh' }}>
        <ReactFlowProvider>
          <LayoutFlow />
        </ReactFlowProvider>
      </div>
    </>
  );
}
