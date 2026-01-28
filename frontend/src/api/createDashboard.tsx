import { gql, useMutation } from "@apollo/client";
import { Dashboard } from "@/types";

const CREATE_DASHBOARD_MUTATION = gql`
  mutation CreateDashboard($name: String!) {
    createDashboard(name: $name) {
      id
      id
      name
    }
  }
`;

export interface CreateDashboardInput {
  name: string;
}

export interface CreateDashboardData {
  createDashboard: Dashboard;
}

export function useCreateDashboard() {
  const [createDashboard, { data, loading, error }] = useMutation<
    CreateDashboardData,
    CreateDashboardInput
  >(CREATE_DASHBOARD_MUTATION);

  return {
    createDashboard,
    data,
    loading,
    error,
  };
}
