import {
  isLiquidMode,
  liquidModeStorageKey,
  type LiquidMode,
  type ResolvedLiquidMode
} from "../types";

type UserAgentBrand = {
  brand: string;
  version?: string;
};

type MediaQueryLike = {
  matches: boolean;
};

export type BrowserCapabilities = {
  supportsBackdropFilter: boolean;
  supportsSvgBackdropFilter: boolean;
  isChromium: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isIOS: boolean;
  isMobileLike: boolean;
  prefersReducedMotion: boolean;
  prefersReducedTransparency: boolean;
  prefersContrastMore: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
};

export type BrowserCapabilityEnvironment = {
  cssSupports?: (property: string, value: string) => boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  innerWidth?: number;
  matchMedia?: (query: string) => MediaQueryLike;
  maxTouchPoints?: number;
  platform?: string;
  userAgent?: string;
  userAgentDataBrands?: UserAgentBrand[];
};

export type ResolveLiquidModeOptions = {
  requestedMode?: LiquidMode;
  defaultMode?: LiquidMode;
  forcedMode?: LiquidMode | null;
  capabilities?: BrowserCapabilities;
  disableOnMobile?: boolean;
  respectReducedMotion?: boolean;
  respectReducedTransparency?: boolean;
  maxEnhancedSurfaces?: number;
  enhancedSurfaceCount?: number;
};

const chromeBrandPattern = /Chromium|Google Chrome|Microsoft Edge|Brave|Opera/i;
const chromeUserAgentPattern = /\b(Chrome|Chromium|Edg|OPR)\//i;
const firefoxPattern = /\b(Firefox|FxiOS)\//i;
const safariPattern = /Safari\//i;
const iOSPattern = /\b(iPad|iPhone|iPod)\b/i;

export function getBrowserCapabilities(
  environment: BrowserCapabilityEnvironment = {}
): BrowserCapabilities {
  const userAgent = environment.userAgent ?? getNavigatorValue("userAgent") ?? "";
  const platform = environment.platform ?? getNavigatorValue("platform") ?? "";
  const maxTouchPoints = environment.maxTouchPoints ?? getNavigatorNumber("maxTouchPoints") ?? 0;
  const brands = environment.userAgentDataBrands ?? getUserAgentBrands();
  const brandText = brands.map((brand) => brand.brand).join(" ");
  const isIOS =
    iOSPattern.test(userAgent) ||
    (/Mac/i.test(platform) && maxTouchPoints > 1 && /Safari\//i.test(userAgent));
  const isFirefox = firefoxPattern.test(userAgent) || /Firefox/i.test(brandText);
  const isSafari =
    !isFirefox &&
    !chromeUserAgentPattern.test(userAgent) &&
    safariPattern.test(userAgent) &&
    /Apple/i.test(userAgent);
  const isChromium =
    !isIOS &&
    !isFirefox &&
    (brands.some((brand) => chromeBrandPattern.test(brand.brand)) ||
      chromeUserAgentPattern.test(userAgent));

  const innerWidth = environment.innerWidth ?? getWindowNumber("innerWidth") ?? 1024;
  const hardwareConcurrency =
    environment.hardwareConcurrency ?? getNavigatorNumber("hardwareConcurrency") ?? undefined;
  const deviceMemory = environment.deviceMemory ?? getNavigatorNumber("deviceMemory") ?? undefined;

  return {
    supportsBackdropFilter:
      supportsCss(environment, "backdrop-filter", "blur(1px)") ||
      supportsCss(environment, "-webkit-backdrop-filter", "blur(1px)"),
    supportsSvgBackdropFilter:
      supportsCss(environment, "backdrop-filter", "url(#clean99-liquid-glass)") ||
      supportsCss(environment, "-webkit-backdrop-filter", "url(#clean99-liquid-glass)"),
    isChromium,
    isFirefox,
    isSafari,
    isIOS,
    isMobileLike: maxTouchPoints > 0 || innerWidth <= 640,
    prefersReducedMotion: shouldReduceMotion(environment),
    prefersReducedTransparency: shouldReduceTransparency(environment),
    prefersContrastMore: matchesMedia(environment, "(prefers-contrast: more)"),
    hardwareConcurrency,
    deviceMemory
  };
}

export function supportsBackdropFilter(environment: BrowserCapabilityEnvironment = {}): boolean {
  return getBrowserCapabilities(environment).supportsBackdropFilter;
}

export function supportsSvgBackdropFilter(environment: BrowserCapabilityEnvironment = {}): boolean {
  return getBrowserCapabilities(environment).supportsSvgBackdropFilter;
}

export function shouldReduceTransparency(environment: BrowserCapabilityEnvironment = {}): boolean {
  return (
    matchesMedia(environment, "(prefers-reduced-transparency: reduce)") ||
    matchesMedia(environment, "(prefers-reduced-transparency)")
  );
}

export function shouldReduceMotion(environment: BrowserCapabilityEnvironment = {}): boolean {
  return matchesMedia(environment, "(prefers-reduced-motion: reduce)");
}

export function isProbablyLowPowerMobile(
  capabilities: BrowserCapabilities = getBrowserCapabilities()
): boolean {
  const lowMemory = typeof capabilities.deviceMemory === "number" && capabilities.deviceMemory <= 4;
  const lowCpu =
    typeof capabilities.hardwareConcurrency === "number" && capabilities.hardwareConcurrency <= 4;

  return capabilities.isMobileLike && (capabilities.isIOS || lowMemory || lowCpu);
}

export function shouldUseEnhancedLiquidGlass(
  capabilities: BrowserCapabilities = getBrowserCapabilities(),
  options: {
    disableOnMobile?: boolean;
    respectReducedTransparency?: boolean;
  } = {}
): boolean {
  if (options.respectReducedTransparency !== false && capabilities.prefersReducedTransparency) {
    return false;
  }

  if (options.disableOnMobile !== false && isProbablyLowPowerMobile(capabilities)) {
    return false;
  }

  return (
    capabilities.isChromium &&
    !capabilities.isIOS &&
    capabilities.supportsBackdropFilter &&
    capabilities.supportsSvgBackdropFilter
  );
}

export function resolveLiquidMode(options: ResolveLiquidModeOptions = {}): ResolvedLiquidMode {
  const capabilities = options.capabilities ?? getBrowserCapabilities();
  const forcedMode = normalizeMode(options.forcedMode);
  const requestedMode = normalizeMode(options.requestedMode) ?? "auto";
  const defaultMode = normalizeMode(options.defaultMode) ?? "auto";

  if (capabilities.prefersReducedTransparency && options.respectReducedTransparency !== false) {
    return "solid";
  }

  if (forcedMode && forcedMode !== "auto") {
    return resolveConcreteMode(forcedMode, capabilities, options);
  }

  const candidate = requestedMode !== "auto" ? requestedMode : defaultMode;

  if (candidate === "auto") {
    return canReserveEnhanced(capabilities, options) ? "enhanced" : "fallback";
  }

  return resolveConcreteMode(candidate, capabilities, options);
}

export function readStoredLiquidMode(
  storage: Storage | undefined = getLocalStorage()
): LiquidMode | null {
  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(liquidModeStorageKey);
    return isLiquidMode(value) ? value : null;
  } catch {
    return null;
  }
}

function resolveConcreteMode(
  mode: Exclude<LiquidMode, "auto">,
  capabilities: BrowserCapabilities,
  options: ResolveLiquidModeOptions
): ResolvedLiquidMode {
  if (mode === "enhanced") {
    return canReserveEnhanced(capabilities, options) ? "enhanced" : "fallback";
  }

  return mode;
}

function canReserveEnhanced(
  capabilities: BrowserCapabilities,
  options: ResolveLiquidModeOptions
): boolean {
  const maxEnhancedSurfaces = options.maxEnhancedSurfaces ?? Number.POSITIVE_INFINITY;
  const enhancedSurfaceCount = options.enhancedSurfaceCount ?? 0;

  return (
    enhancedSurfaceCount < maxEnhancedSurfaces &&
    shouldUseEnhancedLiquidGlass(capabilities, {
      disableOnMobile: options.disableOnMobile,
      respectReducedTransparency: options.respectReducedTransparency
    })
  );
}

function normalizeMode(mode: LiquidMode | null | undefined): LiquidMode | null {
  return isLiquidMode(mode) ? mode : null;
}

function supportsCss(
  environment: BrowserCapabilityEnvironment,
  property: string,
  value: string
): boolean {
  const supports = environment.cssSupports ?? getCssSupports();
  if (!supports) {
    return false;
  }

  try {
    return supports(property, value);
  } catch {
    return false;
  }
}

function matchesMedia(environment: BrowserCapabilityEnvironment, query: string): boolean {
  const matchMedia = environment.matchMedia ?? getMatchMedia();
  if (!matchMedia) {
    return false;
  }

  try {
    return matchMedia(query).matches;
  } catch {
    return false;
  }
}

function getCssSupports(): BrowserCapabilityEnvironment["cssSupports"] | undefined {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") {
    return undefined;
  }

  return CSS.supports.bind(CSS);
}

function getMatchMedia(): BrowserCapabilityEnvironment["matchMedia"] | undefined {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return undefined;
  }

  return window.matchMedia.bind(window);
}

function getLocalStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

function getNavigatorValue(key: "platform" | "userAgent"): string | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  return navigator[key];
}

function getNavigatorNumber(
  key: "deviceMemory" | "hardwareConcurrency" | "maxTouchPoints"
): number | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  const value = navigator[key as keyof Navigator];
  return typeof value === "number" ? value : undefined;
}

function getWindowNumber(key: "innerWidth"): number | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window[key];
}

function getUserAgentBrands(): UserAgentBrand[] {
  if (typeof navigator === "undefined") {
    return [];
  }

  const userAgentData = (
    navigator as Navigator & {
      userAgentData?: {
        brands?: UserAgentBrand[];
      };
    }
  ).userAgentData;

  return userAgentData?.brands ?? [];
}
