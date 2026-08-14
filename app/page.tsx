import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import StatsStrip from "@/components/StatsStrip";
import LogoMarquee from "@/components/LogoMarquee";
import FeatureGrid from "@/components/FeatureGrid";
import BentoGrid from "@/components/BentoGrid";
import StarSection from "@/components/StarSection";
import TestimonialWall from "@/components/TestimonialWall";
import FinalCta from "@/components/FinalCta";
import Footer from "@/components/Footer";
import { CORE_FEATURES, GAP_FEATURES } from "@/lib/content";

export default function HomePage() {
  return (
    <>
      <Navbar />
      {/* Offset for the fixed nav. */}
      <main className="flex-grow pt-[104px]">
        <Hero />
        <StatsStrip />
        <LogoMarquee />
        <FeatureGrid
          id="resume"
          title="Master Your Preparation"
          subtitle="Everything you need to land your dream role, from the first application to the final interview."
          features={CORE_FEATURES}
        />
        <BentoGrid />
        <StarSection />
        <FeatureGrid
          title="Bridge Your Career Gaps"
          subtitle="We don't just give you questions; we give you the 'why' behind them."
          features={GAP_FEATURES}
        />
        <TestimonialWall />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
