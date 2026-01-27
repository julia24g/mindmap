import { gql, useMutation } from "@apollo/client";
import { Content } from "@/types";
import { GET_GRAPH } from "@/api/getGraph";

const ADD_CONTENT = gql`
  mutation AddContent(
    $firebaseUid: String!
    $dashboardId: ID!
    $title: String!
    $type: String
    $notesText: String
    $notesJSON: JSON
  ) {
    addContent(
      firebaseUid: $firebaseUid
      dashboardId: $dashboardId
      title: $title
      type: $type
      notesText: $notesText
      notesJSON: $notesJSON
    ) {
      id
      dashboardId
      title
      type
      createdAt
      updatedAt
      notesText
      notesJSON
    }
  }
`;

export interface AddContentInput {
  firebaseUid: string;
  dashboardId: string;
  title: string;
  type?: string;
  notesText?: string;
  notesJSON?: any;
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
