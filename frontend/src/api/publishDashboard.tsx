import { gql, useMutation } from "@apollo/client";
import { Dashboard } from "@/types/dashboard";

const PUBLISH_DASHBOARD_MUTATION = gql`
  mutation PublishDashboard($dashboardId: ID!) {
    publishDashboard(dashboardId: $dashboardId) {
      id
      visibility
      publicSlug
      publishedAt
    }
  }
`;

export interface PublishDashboardInput {
  dashboardId: string;
}

export interface PublishDashboardData {
  publishDashboard: Dashboard;
}

export function usePublishDashboard() {
  const [publishDashboard, { data, loading, error }] = useMutation<
    PublishDashboardData,
    PublishDashboardInput
  >(PUBLISH_DASHBOARD_MUTATION);

  return {
    publishDashboard,
    data,
    loading,
    error,
  };
}
