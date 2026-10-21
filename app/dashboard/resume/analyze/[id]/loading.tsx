import { LoadingPage } from "@/components/LoadingScreen";
import { BASE_META } from "@/lib/loading";

export default function AnalysisReportLoading() {
  return (
    <>
      <LoadingPage
        node="Analysis Node Alpha"
        icon="description"
        heading="Opening your report"
        message="Fetching the match score, the gaps and the questions you will be asked."
        status="Reading"
        meta={[
          ...BASE_META,
          { label: "Type", value: "Neural Processing" },
          { label: "Source", value: "Stored Report", highlight: true },
        ]}
      />
    </>
  );
}
