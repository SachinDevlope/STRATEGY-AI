import { LoadingPage } from "@/components/LoadingScreen";

export default function StarLoading() {
  return (
    <>
      <LoadingPage
        node="Story Node"
        icon="auto_stories"
        heading="Preparing the story builder"
        message="Loading your saved STAR stories."
        status="Fetching"
      />
    </>
  );
}
