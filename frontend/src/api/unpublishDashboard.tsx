
import { gql, useMutation } from "@apollo/client";
import { Dashboard } from "@/types/dashboard";

const UNPUBLISH_DASHBOARD_MUTATION = gql`
	mutation UnpublishDashboard($dashboardId: ID!) {
		unpublishDashboard(dashboardId: $dashboardId) {
			id
			visibility
			publicSlug
			publishedAt
		}
	}
`;

export interface UnpublishDashboardInput {
	dashboardId: string;
}

export interface UnpublishDashboardData {
	unpublishDashboard: Dashboard;
}

export function useUnpublishDashboard() {
	const [unpublishDashboard, { data, loading, error }] = useMutation<
		UnpublishDashboardData,
		UnpublishDashboardInput
	>(UNPUBLISH_DASHBOARD_MUTATION);

	return {
		unpublishDashboard,
		data,
		loading,
		error,
	};
}
