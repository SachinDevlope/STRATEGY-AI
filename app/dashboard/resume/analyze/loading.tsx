import { LoadingPage } from "@/components/LoadingScreen";

export default function AnalyzeLoading() {
  return (
    <>
      <LoadingPage
        node="Analysis Node Alpha"
        icon="cloud_upload"
        heading="Preparing the analyser"
        message="Loading your saved job descriptions and recent analyses."
        status="Provisioning"
      />
    </>
  );
}
