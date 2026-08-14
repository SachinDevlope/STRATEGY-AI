import { LoadingPage } from "@/components/LoadingScreen";
import { BRAND_NAME } from "@/lib/brand";
import { BASE_META } from "@/lib/loading";

/**
 * Fallback for every route that does not ship its own loading.tsx. No Navbar
 * here — the route this replaces may not have one either.
 */
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
