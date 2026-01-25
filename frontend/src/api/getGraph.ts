import { gql, useQuery } from "@apollo/client";

export const GET_GRAPH = gql`
  query GetGraph($firebaseUid: String!, $dashboardId: ID!) {
    getGraph(firebaseUid: $firebaseUid, dashboardId: $dashboardId) {
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
  contentId?: string; // For content nodes only
  name?: string; // For tag nodes only
  title?: string; // For content nodes only
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

export interface GetGraphInput {
  firebaseUid: string;
  dashboardId: string;
}

export interface GetGraphData {
  getGraph: Graph;
}

export function useGetGraph(firebaseUid: string, dashboardId: string) {
  const { data, loading, error, refetch } = useQuery<
    GetGraphData,
    GetGraphInput
  >(GET_GRAPH, {
    variables: { firebaseUid, dashboardId },
    skip: !firebaseUid || !dashboardId,
  });

  return {
    graph: data?.getGraph,
    loading,
    error,
    refetch,
  };
}
