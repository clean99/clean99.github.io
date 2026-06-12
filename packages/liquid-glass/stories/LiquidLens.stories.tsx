import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent
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
import { StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidLens",
  component: LiquidLens,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidLens>;

export default meta;
type Story = StoryObj;

const precisionLensSize = { width: 210, height: 120 };
const precisionLensBounds = { width: 706, height: 460, padding: 16 };
const precisionLensInitialPosition = { x: 46, y: 74 };

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
      <div
        data-lg-theme="light"
        style={{
          minHeight: 360,
          padding: 40,
          background:
            "linear-gradient(90deg, rgba(15,23,42,0.055) 0 1px, transparent 1px 48px), linear-gradient(180deg, rgba(15,23,42,0.045) 0 1px, transparent 1px 48px), linear-gradient(135deg, #fff, #f5f6f4)",
          backgroundSize: "48px 48px, 48px 48px, auto",
          color: "#000",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        }}
      >
        <div
          data-lg-reference-frame="magnifying-glass"
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
          <div style={{ position: "absolute", inset: 0 }}>
            <div
              style={{
                position: "absolute",
                top: 46,
                left: 34,
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "#dc2626",
                height: 22
              }}
            >
              <span style={{ width: 40, height: 2, background: "currentColor" }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.25em",
                  lineHeight: "22px",
                  textTransform: "uppercase"
                }}
              >
                Optics Study
              </span>
            </div>
            <h3
              style={{
                position: "absolute",
                top: 81,
                left: 34,
                width: 354,
                margin: 0,
                fontSize: 54,
                fontWeight: 800,
                letterSpacing: "-0.025em",
                lineHeight: 0.95
              }}
            >
              Liquid&nbsp;Glass<span style={{ color: "rgba(0,0,0,0.4)" }}>—</span>
              Precision&nbsp;Lens
            </h3>
          </div>
          <LiquidLens
            refraction={{
              blur: 0,
              glassThickness: 88,
              bezelWidth: 18,
              refractiveIndex: 1.5,
              specularOpacity: 0.5,
              specularAngle: 0.8
            }}
            style={{ position: "absolute", top: 36, left: 20, zIndex: 3 }}
          />
        </div>
      </div>
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
    setDroplet(readDroplet(event.currentTarget, event.clientX, event.clientY));
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
    setDroplet(readDroplet(event.currentTarget, event.clientX, event.clientY));
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
    <div className="lg-precision-lens-demo" data-lg-theme="light">
      <div className="lg-precision-lens-demo__card" data-lg-lens-board="" ref={boardRef}>
        <section className="lg-precision-lens-demo__copy" aria-label="Precision lens copy">
          <p className="lg-precision-lens-demo__eyebrow">
            <span />
            <strong>Optics Demo</strong>
          </p>
          <h3>
            Liquid Glass
            <br />
            Precision Lens
          </h3>
          <p>Drag the capsule to bend the page. The lens refracts whatever sits beneath it.</p>
          <p>
            Press the glass to trigger the local water-drop response: the material stretches from
            the contact point while the foreground stays sharp.
          </p>
          <p>Sweep across strong edges so the bend snaps without inventing internal seams.</p>
        </section>
        <div className="lg-precision-lens-demo__photo" aria-hidden="true">
          <span className="lg-precision-lens-demo__photo-stem" />
          <span className="lg-precision-lens-demo__photo-subject" />
        </div>
        <div className="lg-precision-lens-demo__credit">Deterministic CSS fixture</div>
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
          <LiquidLens
            refraction={{
              blur: 0,
              glassThickness: 88,
              bezelWidth: 18,
              refractiveIndex: 1.5,
              specularOpacity: 0.5,
              specularAngle: 0.8
            }}
          />
        </div>
      </div>
    </div>
  );
}

function readDroplet(element: HTMLElement, clientX: number, clientY: number) {
  const rect = element.getBoundingClientRect();
  return resolveLensDropletResponse({
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
