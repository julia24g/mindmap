import { gql, useQuery } from "@apollo/client";
import { Dashboard } from "@/types/dashboard";
import { useAuthContext } from "@/contexts/AuthContext";

const GET_PUBLIC_DASHBOARD_QUERY = gql`
  query GetPublicDashboard($publicSlug: String!) {
    getDashboard(publicSlug: $publicSlug) {
      id
      userId
      isOwner
      name
      createdAt
      updatedAt
      visibility
      publishedAt
      publicSlug
    }
  }
`;

export interface GetPublicDashboardInput {
  publicSlug: string;
}

export interface GetPublicDashboardData {
  getDashboard: Dashboard;
}

export function useGetPublicDashboard(publicSlug: string) {
  const { currentUser } = useAuthContext();

  const { data, loading, error, refetch } = useQuery<
    GetPublicDashboardData,
    GetPublicDashboardInput
  >(GET_PUBLIC_DASHBOARD_QUERY, {
    variables: { publicSlug: publicSlug },
    skip: !publicSlug,
  });

  const dashboard = data?.getDashboard ?? null;

  return {
    dashboard,
    isOwner: dashboard?.isOwner ?? false,
    loading,
    error,
    refetch,
  };
}
