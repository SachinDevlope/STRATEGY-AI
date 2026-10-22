import { LoadingPage } from "@/components/LoadingScreen";

export default function InterviewLoading() {
  return (
    <>
      <LoadingPage
        node="Interview Node"
        icon="record_voice_over"
        heading="Preparing the interview room"
        message="Loading your saved job descriptions and past interviews."
        status="Provisioning"
      />
    </>
  );
}
