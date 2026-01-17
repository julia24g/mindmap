import { gql, useMutation } from "@apollo/client";
import { Content } from "@/types";

const ADD_CONTENT = gql`
  mutation AddContent(
    $firebaseUid: String!
    $title: String!
    $type: String
    $properties: JSON
  ) {
    addContent(
      firebaseUid: $firebaseUid
      title: $title
      type: $type
      properties: $properties
    ) {
      contentId
      userId
      title
      type
      created_at
      properties
    }
  }
`;

export interface AddContentInput {
  firebaseUid: string;
  title: string;
  type?: string;
  properties?: Record<string, any>;
}

export interface AddContentData {
  addContent: Content;
}

export function useAddContent() {
  const [addContent, { data, loading, error }] = useMutation<
    AddContentData,
    AddContentInput
  >(ADD_CONTENT);

  return {
    addContent,
    data,
    loading,
    error,
  };
}
