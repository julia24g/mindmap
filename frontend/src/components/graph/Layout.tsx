import { useEffect, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceX,
  forceY,
} from "d3-force";
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
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import collide from "@/util/collision";
import ContentNode from "@/components/nodetypes/PrivateContentNode";
import PublicContentNode from "@/components/nodetypes/PublicContentNode";
import { Spinner } from "@/components/ui/spinner";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import TagNode from "../nodetypes/TagNode";

const simulation = forceSimulation()
  .force("charge", forceManyBody().strength(-1000))
  .force("x", forceX().x(0).strength(0.05))
  .force("y", forceY().y(0).strength(0.05))
  .force("collide", collide())
  .alphaTarget(0.05)
  .stop();

const useLayoutedElements = (onComplete?: () => void) => {
  const { getNodes, setNodes, getEdges, fitView } = useReactFlow();
  const initialized = useNodesInitialized();

  console.log("useLayoutedElements - initialized:", initialized);

  useEffect(() => {
    console.log("useLayoutedElements effect - initialized:", initialized);

    if (!initialized) {
      console.log("Nodes not initialized yet, skipping layout");
      return;
    }

    const nodes = getNodes().map((node) => ({
      ...node,
      x: node.position.x + (Math.random() - 0.5) * 100,
      y: node.position.y + (Math.random() - 0.5) * 100,
      // When all nodes start at same position (0, 0), this causes numerical instability in D3 force simulation
      // because multiple nodes overlap exactly. Adding a small random offset helps.
    }));

    const edges = getEdges().map((edge) => ({
      source: edge.source,
      target: edge.target,
    }));

    console.log("Running force simulation with:", {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodes,
      edges,
    });

    simulation.nodes(nodes).force(
      "link",
      forceLink(edges)
        .id((d: any) => d.id)
        .strength(0.05)
        .distance(100),
    );

    console.log(
      "Before simulation tick - sample node positions:",
      nodes.slice(0, 2).map((n) => ({ id: n.id, x: n.x, y: n.y })),
    );

    simulation.tick(300);

    console.log(
      "After simulation tick - sample node positions:",
      nodes.slice(0, 2).map((n) => ({ id: n.id, x: n.x, y: n.y })),
    );

    const updatedNodes = nodes.map((node) => ({
      ...node,
      position: { x: node.x, y: node.y },
    }));

    console.log("Setting nodes with new positions:", updatedNodes.slice(0, 2));

    setNodes(updatedNodes);

    window.requestAnimationFrame(() => {
      console.log("Calling fitView");
      fitView();
      onComplete?.();
    });
  }, [initialized, getNodes, getEdges, setNodes, fitView]);
};

const LayoutFlow = ({
  initialNodes,
  initialEdges,
  onNodeClick,
  isOwner,
}: {
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodeClick?: (contentId: string) => void;
  isOwner: boolean;
}) => {
  console.log(
    "LayoutFlow render - initialNodes:",
    initialNodes.length,
    "initialEdges:",
    initialEdges.length,
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isLoading, setIsLoading] = useState(true);

  console.log(
    "LayoutFlow - current nodes:",
    nodes.length,
    "current edges:",
    edges.length,
  );

  useEffect(() => {
    const nodesWithClickHandler = initialNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        // Attach onNodeClick only for content nodes when the current user is the owner
        ...(isOwner && onNodeClick && node.type === "contentNode"
          ? { onNodeClick }
          : {}),
      },
    }));
    setNodes(nodesWithClickHandler);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges, isOwner, onNodeClick]);

  useLayoutedElements(() => setIsLoading(false));

  return (
    <div className="relative h-full w-full overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <Item variant="muted">
            <ItemMedia>
              <Spinner />
            </ItemMedia>
            <ItemContent>
              <ItemTitle className="line-clamp-1">
                Layouting your graph...
              </ItemTitle>
            </ItemContent>
          </Item>
        </div>
      )}
      <ReactFlow
        style={{ width: "100%", height: "100%" }}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={{
          contentNode: isOwner ? ContentNode : PublicContentNode,
          tagNode: TagNode,
        }}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        connectionMode={ConnectionMode.Loose}
      >
        <Background variant={BackgroundVariant.Dots} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
};

export default function Layout({
  initialNodes,
  initialEdges,
  onNodeClick,
  isOwner,
}: {
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodeClick?: (contentId: string) => void;
  isOwner: boolean;
}) {
  return (
    <div className="w-full h-full min-w-0 min-h-0 overflow-hidden">
      <ReactFlowProvider>
        <LayoutFlow
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          onNodeClick={onNodeClick}
          isOwner={isOwner}
        />
      </ReactFlowProvider>
    </div>
  );
}
