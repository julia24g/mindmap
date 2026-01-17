interface BackendNode {
    id: string;
    name?: string;
    label?: string;
    contentId?: string;
    title?: string;
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
    data: { label: string; contentId?: string; title?: string };
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
    
    const nodes: ReactFlowNode[] = backendData.nodes.map((node: BackendNode) => {
        return {
            id: String(node.id),
            type: node.label === 'content' ? 'contentNode' : 'input',
            data: { 
                label: node.name || node.label || '',
                contentId: node.contentId,
                title: node.title
            },
            position: { x: 0, y: 0 }
        };
    });
  
  const edges = backendData.edges.map(edge => ({
    id: `${edge.from}-${edge.to}`,
    source: String(edge.from),
    target: String(edge.to),
  }));
  
  return { nodes, edges };
}

export { toReactFlowFormat };