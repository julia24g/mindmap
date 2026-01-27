import { gql, useMutation } from "@apollo/client";
import { Content } from "@/types";
import { GET_GRAPH } from "@/api/getGraph";

const ADD_CONTENT = gql`
  mutation AddContent(
    $firebaseUid: String!
    $dashboardId: ID!
    $title: String!
    $type: String
    $notes: String
  ) {
    addContent(
      firebaseUid: $firebaseUid
      dashboardId: $dashboardId
      title: $title
      type: $type
      notes: $notes
    ) {
      id
      dashboardId
      title
      type
      createdAt
      updatedAt
      notes
    }
  }
`;

export interface AddContentInput {
  firebaseUid: string;
  dashboardId: string;
  title: string;
  type?: string;
  notes?: string;
}

export interface AddContentData {
  addContent: Content;
}

export function useAddContent(firebaseUid: string, dashboardId: string) {
  const [addContent, { data, loading, error }] = useMutation<
    AddContentData,
    AddContentInput
  >(ADD_CONTENT, {
    refetchQueries:
      firebaseUid && dashboardId
        ? [
            {
              query: GET_GRAPH,
              variables: { firebaseUid, dashboardId },
            },
          ]
        : [],
    awaitRefetchQueries: true,
  });

  return {
    addContent,
    data,
    loading,
    error,
  };
}
