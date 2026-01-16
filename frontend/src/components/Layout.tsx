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
import ContentNode from '@/components/nodetypes/ContentNode';

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

  console.log('useLayoutedElements - initialized:', initialized);

  useEffect(() => {
    console.log('useLayoutedElements effect - initialized:', initialized);
    
    if (!initialized) {
      console.log('Nodes not initialized yet, skipping layout');
      return;
    }

    const nodes = getNodes().map((node) => ({ 
      ...node,
      x: node.position.x,
      y: node.position.y,
    }));

    const edges = getEdges().map((edge) => ({
      source: edge.source,
      target: edge.target,
    }));

    console.log('Running force simulation with:', { 
      nodeCount: nodes.length, 
      edgeCount: edges.length,
      nodes,
      edges
    });

    simulation.nodes(nodes).force(
      'link',
      forceLink(edges)
        .id((d: any) => d.id)
        .strength(0.05)
        .distance(100),
    );

    console.log('Before simulation tick - sample node positions:', 
      nodes.slice(0, 2).map(n => ({ id: n.id, x: n.x, y: n.y }))
    );

    simulation.tick(300);

    console.log('After simulation tick - sample node positions:', 
      nodes.slice(0, 2).map(n => ({ id: n.id, x: n.x, y: n.y }))
    );

    const updatedNodes = nodes.map((node) => ({
      ...node,
      position: { x: node.x, y: node.y },
    }));

    console.log('Setting nodes with new positions:', updatedNodes.slice(0, 2));

    setNodes(updatedNodes);

    window.requestAnimationFrame(() => {
      console.log('Calling fitView');
      fitView();
    });
  }, [initialized, getNodes, getEdges, setNodes, fitView]);
};

const LayoutFlow = ({ initialNodes, initialEdges }: { initialNodes: Node[], initialEdges: Edge[] }) => {
  console.log('LayoutFlow render - initialNodes:', initialNodes.length, 'initialEdges:', initialEdges.length);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  console.log('LayoutFlow - current nodes:', nodes.length, 'current edges:', edges.length);

  useLayoutedElements();

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
    >
      <Background variant={BackgroundVariant.Dots} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
};

export default function Layout({ initialNodes, initialEdges }: { initialNodes: Node[], initialEdges: Edge[] }) {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlowProvider>
        <LayoutFlow initialNodes={initialNodes} initialEdges={initialEdges} />
      </ReactFlowProvider>
    </div>
  );
}
