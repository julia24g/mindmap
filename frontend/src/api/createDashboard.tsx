import { gql, useMutation } from '@apollo/client';
import { Dashboard } from '@/types';

const CREATE_DASHBOARD_MUTATION = gql`
  mutation CreateDashboard(
    $firebaseUid: String!
    $name: String!
  ) {
    createDashboard(
      firebaseUid: $firebaseUid
      name: $name
    ) {
      id
      userId
      name
    }
  }
`;

export interface CreateDashboardInput {
  firebaseUid: string;
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
