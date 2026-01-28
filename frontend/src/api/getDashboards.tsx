import { gql, useQuery } from "@apollo/client";
import { Dashboard } from "@/types/dashboard";

const GET_DASHBOARDS_QUERY = gql`
  query GetDashboards {
    getDashboards {
      id
      name
    }
  }
`;

export interface GetDashboardsData {
  getDashboards: Dashboard[];
}

export function useGetDashboards() {
  const { data, loading, error, refetch } =
    useQuery<GetDashboardsData>(GET_DASHBOARDS_QUERY);
  return {
    dashboards: data?.getDashboards ?? [],
    loading,
    error,
    refetch,
  };
}
