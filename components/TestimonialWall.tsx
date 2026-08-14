import { TESTIMONIALS } from "@/lib/content";

function Stars() {
  return (
    <div className="flex gap-1 text-accent">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="material-symbols-outlined text-base">
          star
        </span>
      ))}
    </div>
  );
}

export default function TestimonialWall() {
  return (
    <section
      id="stories"
      className="py-12 md:py-32"
    >
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto flex flex-col gap-12">
        <div className="text-center max-w-2xl mx-auto flex flex-col gap-4">
          <p className="font-label-caps text-label-caps uppercase text-accent">
            Wall of Love
          </p>
          <h2 className="font-display text-headline-lg-mobile md:text-headline-xl text-on-surface">
            Real candidates. Real results.
          </h2>
          <p className="text-body-md text-on-surface-variant">
            Don&apos;t just take our word for it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="glass-panel glass-panel-glow rounded-xl p-6 flex flex-col gap-4"
            >
              <Stars />
              <blockquote className="text-body-sm text-on-surface flex-grow">
                &quot;{testimonial.quote}&quot;
              </blockquote>
              <figcaption className="border-t border-outline-variant/30 pt-4 mt-2">
                <p className="text-body-sm font-bold text-on-surface">
                  {testimonial.name}
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  {testimonial.role}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
