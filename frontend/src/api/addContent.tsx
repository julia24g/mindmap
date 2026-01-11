import { gql, useMutation } from "@apollo/client";

// Define the GraphQL mutation
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

// TypeScript types for the mutation
export interface AddContentInput {
  firebaseUid: string;
  title: string;
  type?: string;
  properties?: Record<string, any>;
}

export interface Content {
  contentId: string;
  userId: string;
  title: string;
  type?: string;
  created_at: string;
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