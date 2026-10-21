import { LoadingPage } from "@/components/LoadingScreen";
import { BRAND_NAME } from "@/lib/brand";
import { BASE_META } from "@/lib/loading";

// Default loading screen for routes without their own. No Navbar on purpose.
export default function RootLoading() {
  return (
    <LoadingPage
      node={BRAND_NAME}
      icon="neurology"
      heading="Loading"
      message="Fetching the page. This should only take a moment."
      status="Loading"
      meta={[
        ...BASE_META,
        { label: "Type", value: "Neural Processing" },
        { label: "Session", value: "Secure", highlight: true },
      ]}
    />
  );
}
