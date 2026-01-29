import { gql, useQuery } from "@apollo/client";
import { Dashboard } from "@/types/dashboard";

const GET_DASHBOARD_QUERY = gql`
  query GetDashboard($dashboardId: ID!) {
    getDashboard(dashboardId: $dashboardId) {
      id
      userId
      isOwner
      name
      createdAt
      updatedAt
      visibility
      publicSlug
      publishedAt
    }
  }
`;

export interface GetDashboardInput {
  dashboardId: string;
}

export interface GetDashboardData {
  getDashboard: Dashboard;
}

export function useGetDashboard(dashboardId: string) {
  const { data, loading, error, refetch } = useQuery<
    GetDashboardData,
    GetDashboardInput
  >(GET_DASHBOARD_QUERY, {
    variables: { dashboardId },
    skip: !dashboardId,
  });
  return {
    dashboard: data?.getDashboard ?? null,
    loading,
    error,
    refetch,
  };
}
