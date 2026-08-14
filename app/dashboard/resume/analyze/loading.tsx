import { LoadingPage } from "@/components/LoadingScreen";
import Navbar from "@/components/Navbar";

export default function AnalyzeLoading() {
  return (
    <>
      <Navbar />
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
