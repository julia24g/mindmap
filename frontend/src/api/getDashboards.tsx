import { gql, useQuery } from "@apollo/client";
import { Dashboard } from "@/types/dashboard";

const GET_DASHBOARDS_QUERY = gql`
  query GetDashboards($firebaseUid: String!) {
    getDashboards(firebaseUid: $firebaseUid) {
      id
      name
    }
  }
`;

export interface GetDashboardsInput {
  firebaseUid: string;
}

export interface GetDashboardsData {
  getDashboards: Dashboard[];
}

export function useGetDashboards(firebaseUid: string) {
  const { data, loading, error, refetch } = useQuery<
    GetDashboardsData,
    GetDashboardsInput
  >(GET_DASHBOARDS_QUERY, { variables: { firebaseUid } });
  return {
    dashboards: data?.getDashboards ?? [],
    loading,
    error,
    refetch,
  };
}
