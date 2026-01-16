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
    console.log('Backend data:', backendData);
    
    const nodes: ReactFlowNode[] = backendData.nodes.map((node: BackendNode) => {
        console.log(`Node ${node.id}: label="${node.label}", name="${node.name}"`);
        return {
            id: node.id,
            type: node.label === 'Content' ? 'contentNode' : 'input',
            data: { label: node.name || node.label || '' },
            position: { x: 0, y: 0 }
        };
    });
  
  const edges = backendData.edges.map(edge => ({
    id: `${edge.from}-${edge.to}`,
    source: edge.from,
    target: edge.to
  }));
  
  console.log('Transformed nodes:', nodes);
  console.log('Transformed edges:', edges);
  
  return { nodes, edges };
}

export { toReactFlowFormat };