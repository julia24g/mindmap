import { gql, useQuery } from "@apollo/client";
import { Content } from "@/types";

const GET_CONTENT = gql`
  query GetContent($contentId: ID!, $firebaseUid: String!) {
    getContent(contentId: $contentId, firebaseUid: $firebaseUid) {
      contentId
      id
      title
      type
      created_at
      properties
    }
  }
`;

export interface GetContentInput {
  contentId: string;
  firebaseUid: string;
}

export interface GetContentData {
  getContent: Content;
}

export function useGetContent(contentId: string, firebaseUid: string) {
  const { data, loading, error, refetch } = useQuery<
    GetContentData,
    GetContentInput
  >(GET_CONTENT, {
    variables: {
      contentId,
      firebaseUid,
    },
    skip: !contentId || !firebaseUid,
  });

  return {
    content: data?.getContent,
    loading,
    error,
    refetch,
  };
}
