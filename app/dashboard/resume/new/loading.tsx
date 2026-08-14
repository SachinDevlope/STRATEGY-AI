import { LoadingPage } from "@/components/LoadingScreen";
import { BASE_META } from "@/lib/loading";
import Navbar from "@/components/Navbar";

export default function ResumeBuilderLoading() {
  return (
    <>
      <Navbar />
      <LoadingPage
        node="Builder Node"
        icon="draft"
        heading="Opening the resume builder"
        message="Setting up the wizard and loading anything you saved earlier."
        status="Provisioning"
        meta={[
          ...BASE_META,
          { label: "Type", value: "Document Engine" },
          { label: "Draft", value: "Autosaved", highlight: true },
        ]}
      />
    </>
  );
}
