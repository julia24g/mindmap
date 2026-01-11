import { quadtree, Quadtree } from 'd3-quadtree';

interface SimulationNode {
  x: number;
  y: number;
  measured?: {
    width: number;
    height: number;
  };
  width?: number;
  height?: number;
}

interface Force {
  (alpha: number): void;
  initialize: (nodes: SimulationNode[]) => void;
}

export function collide(): Force {
  let nodes: SimulationNode[] = [];
  
  const force = (alpha: number): void => {
    const tree: Quadtree<SimulationNode> = quadtree(
      nodes,
      (d) => d.x,
      (d) => d.y,
    );

    for (const node of nodes) {
      const r = (node.measured?.width || node.width || 150) / 2;
      const nx1 = node.x - r;
      const nx2 = node.x + r;
      const ny1 = node.y - r;
      const ny2 = node.y + r;

      tree.visit((quad, x1, y1, x2, y2) => {
        if (!quad.length) {
          do {
            if ('data' in quad && quad.data && quad.data !== node) {
              const r = (node.measured?.width || node.width || 150) / 2 + 
                       (quad.data.measured?.width || quad.data.width || 150) / 2;
              let x = node.x - quad.data.x;
              let y = node.y - quad.data.y;
              let l = Math.hypot(x, y);

              if (l < r) {
                l = ((l - r) / l) * alpha;
                node.x -= x *= l;
                node.y -= y *= l;
                quad.data.x += x;
                quad.data.y += y;
              }
            }
          } while ((quad = (quad as any).next));
        }

        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    }
  };

  force.initialize = (newNodes: SimulationNode[]): void => {
    nodes = newNodes;
  };

  return force;
}

export default collide;