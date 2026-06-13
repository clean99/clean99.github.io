import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  LiquidCarousel,
  LiquidCarouselContent,
  LiquidCarouselItem,
  LiquidCarouselNext,
  LiquidCarouselPrevious,
  LiquidCard,
  LiquidTypography
} from "../src";
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidCarousel",
  component: LiquidCarousel,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidCarousel>;

export default meta;
type Story = StoryObj;

const cards = [
  {
    body: "Foreground content remains readable while controls use the material surface.",
    title: "Readable"
  },
  {
    body: "Embla owns drag physics, loop behavior, and scroll snapping.",
    title: "Composable"
  },
  {
    body: "Arrow keys map to orientation and writing direction without special cases.",
    title: "Keyboard"
  },
  {
    body: "Enhanced refraction is reserved for sparse controls, not every slide.",
    title: "Performant"
  }
];

export const HorizontalCards: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={820} height={480}>
      <div style={{ display: "grid", gap: 18 }}>
        <LiquidTypography variant="h2">Carousel</LiquidTypography>
        <LiquidCarousel aria-label="Component qualities" opts={{ align: "start" }}>
          <LiquidCarouselContent>
            {cards.map((card) => (
              <LiquidCarouselItem key={card.title} style={{ flexBasis: "72%" }}>
                <LiquidCard style={{ minHeight: 210 }}>
                  <LiquidTypography variant="h3">{card.title}</LiquidTypography>
                  <LiquidTypography variant="muted">{card.body}</LiquidTypography>
                </LiquidCard>
              </LiquidCarouselItem>
            ))}
          </LiquidCarouselContent>
          <LiquidCarouselPrevious />
          <LiquidCarouselNext />
        </LiquidCarousel>
      </div>
    </StoryFrame>
  )
};

export const DarkBlogRail: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="dark" width={900} height={520}>
      <div style={{ display: "grid", gap: 18 }}>
        <LiquidTypography variant="h2">Selected writing</LiquidTypography>
        <LiquidCarousel aria-label="Selected writing" opts={{ align: "start", loop: true }}>
          <LiquidCarouselContent>
            {["Frontend Systems", "Performance", "AI Agents", "Clear Thinking"].map((title) => (
              <LiquidCarouselItem key={title} style={{ flexBasis: "48%" }}>
                <LiquidCard style={{ minHeight: 180 }}>
                  <LiquidTypography variant="h3">{title}</LiquidTypography>
                  <LiquidTypography variant="muted">
                    Long-form notes stay on a clear foreground layer.
                  </LiquidTypography>
                </LiquidCard>
              </LiquidCarouselItem>
            ))}
          </LiquidCarouselContent>
          <LiquidCarouselPrevious />
          <LiquidCarouselNext />
        </LiquidCarousel>
      </div>
    </StoryFrame>
  )
};

export const VerticalSteps: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={720} height={560}>
      <div style={{ display: "grid", gap: 18 }}>
        <LiquidTypography variant="h2">Release steps</LiquidTypography>
        <LiquidCarousel
          aria-label="Release steps"
          orientation="vertical"
          opts={{ align: "start" }}
          style={{ minHeight: 360 }}
        >
          <LiquidCarouselContent style={{ minHeight: 360 }}>
            {["Design contract", "Unit tests", "Storybook", "Package output"].map((title) => (
              <LiquidCarouselItem key={title} style={{ flexBasis: "75%" }}>
                <LiquidCard style={{ minHeight: 220 }}>
                  <LiquidTypography variant="h3">{title}</LiquidTypography>
                  <LiquidTypography variant="muted">
                    Each step has a visible source, story, and validation gate.
                  </LiquidTypography>
                </LiquidCard>
              </LiquidCarouselItem>
            ))}
          </LiquidCarouselContent>
          <LiquidCarouselPrevious aria-label="Previous step">↑</LiquidCarouselPrevious>
          <LiquidCarouselNext aria-label="Next step">↓</LiquidCarouselNext>
        </LiquidCarousel>
      </div>
    </StoryFrame>
  )
};
