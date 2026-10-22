import { LoadingPage } from "@/components/LoadingScreen";

export default function InterviewSessionLoading() {
  return (
    <>
      <LoadingPage
        node="Interview Node"
        icon="forum"
        heading="Loading your interview"
        message="Fetching the transcript and scorecard."
        status="Fetching"
      />
    </>
  );
}
