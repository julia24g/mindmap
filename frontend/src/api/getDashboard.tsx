import { gql, useQuery } from "@apollo/client";
import { Dashboard } from "@/types/dashboard";

const GET_DASHBOARD_QUERY = gql`
  query GetDashboard($firebaseUid: String!, $dashboardId: ID!) {
    getDashboard(firebaseUid: $firebaseUid, dashboardId: $dashboardId) {
      id
      userId
      name
      createdAt
      updatedAt
    }
  }
`;

export interface GetDashboardInput {
  firebaseUid: string;
  dashboardId: string;
}

export interface GetDashboardData {
  getDashboard: Dashboard;
}

export function useGetDashboard(firebaseUid: string, dashboardId: string) {
  const { data, loading, error, refetch } = useQuery<
    GetDashboardData,
    GetDashboardInput
  >(GET_DASHBOARD_QUERY, {
    variables: { firebaseUid, dashboardId },
    skip: !firebaseUid || !dashboardId,
  });
  return {
    dashboard: data?.getDashboard ?? null,
    loading,
    error,
    refetch,
  };
}
