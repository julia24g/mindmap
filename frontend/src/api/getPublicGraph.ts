import { gql, useQuery } from "@apollo/client";

export const GET_PUBLIC_GRAPH = gql`
  query GetPublicGraph($dashboardId: String!) {
    getPublicGraph(dashboardId: $dashboardId) {
      nodes {
        id
        label
        contentId
        name
        title
      }
      edges {
        from
        to
        type
      }
    }
  }
`;

export interface Node {
  id: string;
  label: string;
  contentId?: string;
  name?: string;
  title?: string;
}

export interface Edge {
  from: string;
  to: string;
  type: string;
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
}

export interface GetPublicGraphInput {
  dashboardId: string;
}

export interface GetPublicGraphData {
  getPublicGraph: Graph;
}

export function useGetPublicGraph(dashboardId: string) {
  const { data, loading, error } = useQuery<
    GetPublicGraphData,
    GetPublicGraphInput
  >(GET_PUBLIC_GRAPH, {
    variables: { dashboardId },
    skip: !dashboardId,
  });

  return {
    graph: data?.getPublicGraph,
    loading,
    error,
  };
}
