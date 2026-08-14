import { LoadingPage } from "@/components/LoadingScreen";
import { BASE_META } from "@/lib/loading";
import Navbar from "@/components/Navbar";

export default function DashboardLoading() {
  return (
    <>
      <Navbar />
      <LoadingPage
        node="Dashboard Node"
        icon="dashboard"
        heading="Loading your dashboard"
        message="Pulling your resumes, analyses and interview reports together."
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
