import { describe, expect, it } from "vitest";
import {
  clearLiquidToasts,
  createLiquidToast,
  dismissLiquidToast,
  getLiquidToastSnapshot,
  subscribeLiquidToasts
} from "../src/utils/toast-store";

describe("toast store", () => {
  it("creates, replaces, and dismisses toast records", () => {
    clearLiquidToasts();
    const firstId = createLiquidToast({ id: "build", title: "Build started" });
    const secondId = createLiquidToast({
      id: "build",
      title: "Build finished",
      variant: "success"
    });

    expect(firstId).toBe("build");
    expect(secondId).toBe("build");
    expect(getLiquidToastSnapshot()).toHaveLength(1);
    expect(getLiquidToastSnapshot()[0]).toMatchObject({
      id: "build",
      title: "Build finished",
      variant: "success"
    });

    dismissLiquidToast("build");

    expect(getLiquidToastSnapshot()).toHaveLength(0);
  });

  it("notifies subscribers when the queue changes", () => {
    clearLiquidToasts();
    let calls = 0;
    const unsubscribe = subscribeLiquidToasts(() => {
      calls += 1;
    });

    createLiquidToast({ title: "Queued" });
    clearLiquidToasts();
    unsubscribe();
    createLiquidToast({ title: "Ignored" });

    expect(calls).toBe(2);

    clearLiquidToasts();
  });
});
