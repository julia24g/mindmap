import { gql, useQuery } from "@apollo/client";
import { Content } from "@/types";

const GET_CONTENT = gql`
  query GetContent($id: ID!, $firebaseUid: String!) {
    getContent(id: $id, firebaseUid: $firebaseUid) {
      id
      title
      type
      createdAt
      notesText
      notesJSON
    }
  }
`;

export interface GetContentInput {
  id: string;
  firebaseUid: string;
}

export interface GetContentData {
  getContent: Content;
}

export function useGetContent(id: string, firebaseUid: string) {
  const { data, loading, error, refetch } = useQuery<
    GetContentData,
    GetContentInput
  >(GET_CONTENT, {
    variables: {
      id,
      firebaseUid,
    },
    skip: !id || !firebaseUid,
  });

  return {
    content: data?.getContent,
    loading,
    error,
    refetch,
  };
}
