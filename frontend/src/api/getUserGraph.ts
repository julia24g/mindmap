import { gql, useQuery } from "@apollo/client";

export const GET_USER_GRAPH = gql`
  query GetUserGraph($firebaseUid: String!) {
    get_user_graph(firebaseUid: $firebaseUid) {
      nodes {
        id
        label
        contentId
        name
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
}

export interface Edge {
  from: string;
  to: string;
  type: string;
}

export interface UserGraph {
  nodes: Node[];
  edges: Edge[];
}

export interface GetUserGraphInput {
  firebaseUid: string;
}

export interface GetUserGraphData {
  get_user_graph: UserGraph;
}

export function useGetUserGraph(firebaseUid: string) {
  const { data, loading, error, refetch } = useQuery<
    GetUserGraphData,
    GetUserGraphInput
  >(GET_USER_GRAPH, {
    variables: { firebaseUid },
    skip: !firebaseUid,
  });

  return {
    graph: data?.get_user_graph,
    loading,
    error,
    refetch,
  };
}
