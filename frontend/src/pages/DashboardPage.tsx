import { useState } from 'react';
import { 
  ReactFlow, 
  Controls,
  Background,
  Node,
  Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import AddContent from "@/components/AddContent";
import { TypographyH1 } from "@/typography/TypographyH1";

const initialNodes: Node[] = [
  { id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: 'n2', position: { x: 0, y: 100 }, data: { label: 'Node 2' } },
];
const initialEdges: Edge[] = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];

export default function DashboardPage() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [variant, setVariant] = useState('dots');


  return (
    <>
        <TypographyH1>Dashboard</TypographyH1>
        <AddContent />
        <div style={{ width: '100vw', height: '100vh' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
          >
            <Background variant={variant} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
    </>
  )
}
