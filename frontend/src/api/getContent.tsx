import { gql, useQuery } from "@apollo/client";
import { Content } from "@/types";

const GET_CONTENT = gql`
  query GetContent($id: ID!) {
    getContent(id: $id) {
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
}

export interface GetContentData {
  getContent: Content;
}

export function useGetContent(id: string) {
  const { data, loading, error, refetch } = useQuery<
    GetContentData,
    GetContentInput
  >(GET_CONTENT, {
    variables: {
      id,
    },
    skip: !id,
  });

  return {
    content: data?.getContent,
    loading,
    error,
    refetch,
  };
}
