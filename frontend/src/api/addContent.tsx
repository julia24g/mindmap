import { gql, useMutation } from "@apollo/client";

// Define the GraphQL mutation
const ADD_CONTENT = gql`
  mutation AddContent(
    $userId: ID!
    $title: String!
    $type: String
    $properties: JSON
  ) {
    addContent(
      userId: $userId
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
  userId: string;
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

// Custom hook to use the addContent mutation
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