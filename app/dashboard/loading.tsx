import { LoadingPage } from "@/components/LoadingScreen";
import { BASE_META } from "@/lib/loading";

export default function DashboardLoading() {
  return (
    <>
      <LoadingPage
        node="Dashboard Node"
        icon="dashboard"
        heading="Loading your dashboard"
        message="Getting your workspace ready."
        status="Fetching"
        meta={[
          ...BASE_META,
          { label: "Type", value: "Workspace" },
          { label: "Source", value: "Live Store", highlight: true },
        ]}
      />
    </>
  );
}
