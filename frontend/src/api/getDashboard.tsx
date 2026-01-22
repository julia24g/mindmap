import { gql, useMutation } from '@apollo/client';
import { Dashboard } from '@/types/dashboard';

const GET_DASHBOARD_MUTATION = gql`
	mutation GetDashboard($firebaseUid: String!) {
		getDashboard(firebaseUid: $firebaseUid) {
			id
			name
			createdAt
		}
	}
`;

export interface GetDashboardInput {
	firebaseUid: string;
}

export interface GetDashboardData {
	getDashboard: Dashboard;
}

export function useGetDashboard() {
	const [getDashboard, { data, loading, error }] = useMutation<
		GetDashboardData,
		GetDashboardInput
	>(GET_DASHBOARD_MUTATION);

	return {
		getDashboard,
		data,
		loading,
		error,
	};
}
