interface BackendNode {
    id: string;
    name?: string;
    label?: string;
}

interface BackendEdge {
    from: string;
    to: string;
}

interface BackendData {
    nodes: BackendNode[];
    edges: BackendEdge[];
}

interface ReactFlowNode {
    id: string;
    type: string;
    data: { label: string };
    position: { x: number; y: number };
}

interface ReactFlowEdge {
    id: string;
    source: string;
    target: string;
}

interface ReactFlowData {
    nodes: ReactFlowNode[];
    edges: ReactFlowEdge[];
}

function toReactFlowFormat(backendData: BackendData): ReactFlowData {
    const nodes: ReactFlowNode[] = backendData.nodes.map((node: BackendNode) => ({
        id: node.id,
        type: node.label === 'content' ? 'contentNode' : 'tagNode',
        data: { label: node.name || node.label || '' },
        position: { x: 0, y: 0 }
    }));
  
  const edges = backendData.edges.map(edge => ({
    id: `${edge.from}-${edge.to}`,
    source: edge.from,
    target: edge.to
  }));
  
  return { nodes, edges };
}

export { toReactFlowFormat };