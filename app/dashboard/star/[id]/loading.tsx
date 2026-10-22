import { LoadingPage } from "@/components/LoadingScreen";

export default function StarStoryLoading() {
  return (
    <>
      <LoadingPage
        node="Story Node"
        icon="auto_stories"
        heading="Opening your story"
        message="Loading the Situation, Task, Action and Result."
        status="Fetching"
      />
    </>
  );
}
