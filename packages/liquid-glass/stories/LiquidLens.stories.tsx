import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref
} from "react";
import {
  LiquidLens,
  LiquidProvider,
  clampLensPosition,
  resolveLensDragPosition,
  resolveLensDropletResponse,
  type LiquidLensDropletResponse,
  type LiquidLensPoint
} from "../src";
import { localOpticsImage, StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidLens",
  component: LiquidLens,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidLens>;

export default meta;
type Story = StoryObj;

const precisionLensSize = { width: 210, height: 150 };
const precisionLensBounds = { width: 706, height: 460, padding: 16 };
const precisionLensInitialPosition = { x: 19.5, y: 19.5 };
const precisionLensIdleRefraction = {
  blur: 0,
  glassThickness: 88,
  bezelWidth: 18,
  refractiveIndex: 1.5,
  specularOpacity: 0.5,
  specularAngle: 0.8,
  magnificationGlassThickness: 21.5
};
type DragSession = {
  pointerStart: LiquidLensPoint;
  positionStart: LiquidLensPoint;
};

const idleDroplet = resolveLensDropletResponse({
  point: null,
  pressed: false,
  rect: { height: precisionLensSize.height, left: 0, top: 0, width: precisionLensSize.width }
});

export const KubeReference: Story = {
  render: () => (
    <LiquidProvider defaultMode="enhanced" disableOnMobile={false} maxEnhancedSurfaces={4}>
      <KubeLensStoryShell>
        <KubeLensBoard referenceFrame="magnifying-glass">
          <LiquidLens
            engine="reference"
            refraction={precisionLensIdleRefraction}
            style={{ position: "absolute", top: 34.5, left: 19.5, zIndex: 3 }}
          />
        </KubeLensBoard>
      </KubeLensStoryShell>
    </LiquidProvider>
  )
};

export const DraggablePrecisionLens: Story = {
  render: () => (
    <LiquidProvider defaultMode="enhanced" disableOnMobile={false} maxEnhancedSurfaces={4}>
      <DraggablePrecisionLensDemo />
    </LiquidProvider>
  )
};

export const DarkRefractionField: Story = {
  render: () => (
    <StoryFrame theme="dark" width={520} height={320}>
      <div style={{ position: "relative", minHeight: 220 }}>
        <LiquidLens style={{ position: "absolute", top: 52, left: 72 }} />
      </div>
    </StoryFrame>
  )
};

function DraggablePrecisionLensDemo() {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const [position, setPosition] = useState<LiquidLensPoint>(precisionLensInitialPosition);
  const [droplet, setDroplet] = useState<LiquidLensDropletResponse>(idleDroplet);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerStart: {
        x: event.clientX - boardRect.left,
        y: event.clientY - boardRect.top
      },
      positionStart: position
    };
    setIsDragging(false);
    setDroplet(readDroplet(event.currentTarget, event.clientX, event.clientY, "pressed"));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragRef.current;
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!session || !boardRect) {
      return;
    }

    setIsDragging(true);
    setPosition(
      resolveLensDragPosition({
        bounds: {
          height: boardRect.height,
          padding: precisionLensBounds.padding,
          width: boardRect.width
        },
        lens: precisionLensSize,
        pointer: {
          x: event.clientX - boardRect.left,
          y: event.clientY - boardRect.top
        },
        pointerStart: session.pointerStart,
        positionStart: session.positionStart
      })
    );
    setDroplet(readDroplet(event.currentTarget, event.clientX, event.clientY, "dragging"));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    setIsDragging(false);
    setDroplet(idleDroplet);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 24 : 8;
    const deltas: Record<string, LiquidLensPoint> = {
      ArrowDown: { x: 0, y: step },
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step }
    };
    const delta = deltas[event.key];

    if (delta) {
      event.preventDefault();
      setPosition((current) =>
        clampLensPosition(
          { x: current.x + delta.x, y: current.y + delta.y },
          precisionLensSize,
          precisionLensBounds
        )
      );
      return;
    }

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      setDroplet(
        resolveLensDropletResponse({
          point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
          pressed: true,
          rect
        })
      );
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === " " || event.key === "Enter") {
      setDroplet(idleDroplet);
    }
  };

  return (
    <KubeLensStoryShell>
      <KubeLensBoard boardRef={boardRef} lensBoard referenceFrame="magnifying-glass-interactive">
        <div
          aria-label="Drag the liquid glass lens"
          className="lg-precision-lens-demo__handle"
          data-lens-x={position.x}
          data-lens-y={position.y}
          data-liquid-dragging={isDragging ? "true" : undefined}
          data-liquid-droplet={droplet.active ? "pressed" : "idle"}
          data-lg-draggable-lens=""
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          role="button"
          style={draggableLensStyle(position, droplet)}
          tabIndex={0}
        >
          <LiquidLens engine="reference" refraction={precisionLensIdleRefraction} />
        </div>
      </KubeLensBoard>
    </KubeLensStoryShell>
  );
}

function KubeLensStoryShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="lg-precision-lens-demo"
      data-lg-theme="light"
      style={{
        minHeight: 360,
        padding: 40,
        background:
          "linear-gradient(90deg, rgba(15,23,42,0.055) 0 1px, transparent 1px 48px), linear-gradient(180deg, rgba(15,23,42,0.045) 0 1px, transparent 1px 48px), linear-gradient(135deg, #fff, #f5f6f4)",
        backgroundSize: "48px 48px, 48px 48px, auto"
      }}
    >
      {children}
    </div>
  );
}

function KubeLensBoard({
  boardRef,
  children,
  lensBoard = false,
  referenceFrame
}: {
  boardRef?: Ref<HTMLDivElement>;
  children: ReactNode;
  lensBoard?: boolean;
  referenceFrame: string;
}) {
  return (
    <div
      data-lg-lens-board={lensBoard ? "" : undefined}
      data-lg-reference-frame={referenceFrame}
      ref={boardRef}
      style={{
        position: "relative",
        width: 706,
        height: 460,
        boxSizing: "border-box",
        overflow: "hidden",
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.1)",
        borderRadius: 12
      }}
    >
      <div style={{ position: "absolute", inset: 1 }}>
        <div
          style={{
            position: "absolute",
            top: 32.5,
            left: 32.5,
            width: 353.765625,
            height: 393
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9.75,
              color: "oklch(0.577 0.245 27.325)",
              height: 22,
              marginTop: 12.265625
            }}
          >
            <span style={{ width: 32.5, height: 2, background: "currentColor" }} />
            <span
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: 2.75,
                lineHeight: "22px",
                textTransform: "uppercase"
              }}
            >
              Optics Study
            </span>
          </div>
          <h3
            style={{
              width: 353.765625,
              margin: "13px 0 0",
              fontSize: 54,
              fontWeight: 800,
              letterSpacing: -1.35,
              lineHeight: "51.3px"
            }}
          >
            Liquid Glass<span style={{ color: "oklab(0 0 0 / 0.4)" }}>—</span>Precision Lens
          </h3>
          <div
            style={{
              margin: "13px 0 0",
              color: "oklab(0 0 0 / 0.7)",
              fontSize: 16,
              lineHeight: "24.8px"
            }}
          >
            <p style={{ margin: "0 0 9.75px" }}>
              Drag the capsule to bend the page. This lens is a compact SVG displacement rig that
              refracts whatever sits beneath it.
            </p>
            <p style={{ margin: "0 0 9.75px" }}>
              The field comes from a rounded bezel profile; pixels are pushed along its gradient,
              then topped with a subtle specular bloom for depth.
            </p>
            <p style={{ color: "oklab(0 0 0 / 0.6)", margin: 0 }}>
              Sweep across strong edges—high contrast makes the bend snap.
            </p>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            top: 32.5,
            left: 418.765625,
            width: 293.9375,
            height: 393,
            overflow: "hidden",
            border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 6.5
          }}
        >
          <img
            alt="Abstract architectural lines"
            src={localOpticsImage}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: 427.875,
            left: 459.546875,
            color: "rgb(117, 107, 154)",
            fontSize: 9,
            letterSpacing: 1.35,
            lineHeight: "22px",
            textTransform: "uppercase"
          }}
        >
          Local deterministic optics fixture
        </div>
      </div>
      {children}
    </div>
  );
}

function readDroplet(
  element: HTMLElement,
  clientX: number,
  clientY: number,
  phase: "pressed" | "dragging"
) {
  const rect = element.getBoundingClientRect();
  return resolveLensDropletResponse({
    phase,
    point: { x: clientX, y: clientY },
    pressed: true,
    rect
  });
}

function draggableLensStyle(
  position: LiquidLensPoint,
  droplet: LiquidLensDropletResponse
): CSSProperties {
  return {
    "--lg-demo-droplet-origin-x": `${droplet.originX * 100}%`,
    "--lg-demo-droplet-origin-y": `${droplet.originY * 100}%`,
    "--lg-demo-droplet-scale-x": droplet.scaleX,
    "--lg-demo-droplet-scale-y": droplet.scaleY,
    "--lg-demo-droplet-translate-x": `${droplet.translateX}px`,
    "--lg-demo-droplet-translate-y": `${droplet.translateY}px`,
    "--lg-demo-lens-x": `${position.x}px`,
    "--lg-demo-lens-y": `${position.y}px`
  } as CSSProperties;
}

export const ExperimentalTwoPassReference: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="light" width={520} height={300}>
      <LiquidLens engine="reference" />
    </StoryFrame>
  )
};

export const FallbackMode: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={520} height={300}>
      <LiquidLens />
    </StoryFrame>
  )
};

export const SolidMode: Story = {
  render: () => (
    <StoryFrame mode="solid" theme="light" width={520} height={300}>
      <LiquidLens />
    </StoryFrame>
  )
};

export const ReducedMotion: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="light" width={520} height={300}>
      <LiquidLens data-liquid-reduced-motion="" />
    </StoryFrame>
  )
};
