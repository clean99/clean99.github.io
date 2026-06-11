import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LiquidButton,
  LiquidCard,
  LiquidPill,
  LiquidProvider,
  LiquidSurface,
  LiquidToggle,
  liquidModeStorageKey
} from "../src";

describe("Liquid components", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders LiquidButton as a native button", () => {
    render(<LiquidButton>Read Writing</LiquidButton>);

    const button = screen.getByRole("button", { name: "Read Writing" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
  });

  it("handles button clicks", () => {
    const onClick = vi.fn();
    render(<LiquidButton onClick={onClick}>View Projects</LiquidButton>);

    fireEvent.click(screen.getByRole("button", { name: "View Projects" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("blocks disabled button clicks", () => {
    const onClick = vi.fn();
    render(
      <LiquidButton disabled onClick={onClick}>
        Disabled
      </LiquidButton>
    );

    fireEvent.click(screen.getByRole("button", { name: "Disabled" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("toggles aria-pressed state", () => {
    render(<LiquidToggle>Dark mode</LiquidToggle>);

    const toggle = screen.getByRole("button", { name: "Dark mode" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps pill text in a readable content layer", () => {
    render(<LiquidPill>这是很长的中文标签 Mixed English label</LiquidPill>);

    expect(screen.getByText("这是很长的中文标签 Mixed English label")).toHaveClass(
      "lg-surface__content"
    );
  });

  it("renders fallback mode without enhanced class", () => {
    render(
      <LiquidProvider defaultMode="fallback">
        <LiquidCard>Fallback card</LiquidCard>
      </LiquidProvider>
    );

    expect(screen.getByText("Fallback card").closest(".lg-surface")).toHaveAttribute(
      "data-liquid-mode",
      "fallback"
    );
  });

  it("lets localStorage force fallback mode", async () => {
    installChromiumMocks();
    window.localStorage.setItem(liquidModeStorageKey, "fallback");

    render(
      <LiquidProvider defaultMode="enhanced">
        <LiquidSurface mode="enhanced">Forced fallback</LiquidSurface>
      </LiquidProvider>
    );

    await waitFor(() =>
      expect(screen.getByText("Forced fallback").closest(".lg-surface")).toHaveAttribute(
        "data-liquid-mode",
        "fallback"
      )
    );
  });

  it("uses enhanced mode only when the Chromium capability checks pass", async () => {
    installChromiumMocks();

    render(
      <LiquidProvider defaultMode="enhanced">
        <LiquidSurface mode="enhanced">Enhanced surface</LiquidSurface>
      </LiquidProvider>
    );

    await waitFor(() =>
      expect(screen.getByText("Enhanced surface").closest(".lg-surface")).toHaveAttribute(
        "data-liquid-mode",
        "enhanced"
      )
    );
  });
});

function installChromiumMocks() {
  vi.stubGlobal("CSS", {
    supports: vi.fn((property: string, value: string) => {
      return property.includes("backdrop-filter") && (value.includes("blur") || value.includes("url"));
    })
  });
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserver {
      observe() {
        return undefined;
      }

      unobserve() {
        return undefined;
      }

      disconnect() {
        return undefined;
      }
    }
  );

  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
  });
  Object.defineProperty(window.navigator, "userAgentData", {
    configurable: true,
    value: { brands: [{ brand: "Chromium", version: "145" }] }
  });
  Object.defineProperty(window.navigator, "platform", {
    configurable: true,
    value: "MacIntel"
  });
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    configurable: true,
    value: 0
  });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }));
}
