import { gql, useQuery } from "@apollo/client";

export const GET_USER_GRAPH_DATES = gql`
  query GetUserGraphDates($firebaseUid: String!) {
    getUserGraphDates(firebaseUid: $firebaseUid) {
      createdAt
      updatedAt
    }
  }
`;

export interface UserGraphDates {
  createdAt: string | null;
  updatedAt: string | null;
}

export interface GetUserGraphDatesInput {
  firebaseUid: string;
}

export interface GetUserGraphDatesData {
  getUserGraphDates: UserGraphDates;
}

export function useGetUserGraphDates(firebaseUid: string) {
  const { data, loading, error, refetch } = useQuery<
    GetUserGraphDatesData,
    GetUserGraphDatesInput
  >(GET_USER_GRAPH_DATES, {
    variables: { firebaseUid },
    skip: !firebaseUid,
  });

  return {
    graphDates: data?.getUserGraphDates,
    loading,
    error,
    refetch,
  };
}
