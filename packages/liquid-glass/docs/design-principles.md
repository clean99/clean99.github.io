# Design Principles

## Clear Foreground

Text, icons, and controls stay above the displacement layer. The glass material can bend the page behind it; it must not turn product content into distortion.

## Conservative Enhancement

Enhanced refraction is a premium path, not the default for every surface. Use `maxEnhancedSurfaces`, avoid long lists, and prefer fallback or solid mode for reading surfaces.

## Native Semantics

Buttons are buttons. Links are links. Tabs expose `tablist`, `tab`, and `tabpanel`. Switch-like controls expose state. Visual polish does not excuse broken semantics.

## Fallback Is Product

Safari, Firefox, iOS, high contrast, reduced motion, and reduced transparency are not error states. They are supported material modes.
