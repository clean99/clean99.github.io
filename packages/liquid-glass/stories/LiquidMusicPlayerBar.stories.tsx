import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LiquidMusicPlayerBar, LiquidProvider, LiquidSearchBox } from "../src";

const meta = {
  title: "Liquid Glass/LiquidMusicPlayerBar",
  component: LiquidMusicPlayerBar,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidMusicPlayerBar>;

export default meta;
type Story = StoryObj;

export const KubeReference: Story = {
  render: () => (
    <LiquidProvider defaultMode="enhanced" disableOnMobile={false} maxEnhancedSurfaces={6}>
      <div
        data-lg-reference-frame="music-player"
        data-lg-theme="light"
        style={{
          position: "relative",
          width: 706,
          height: 420,
          overflow: "hidden",
          padding: 22,
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.1)",
          borderRadius: 10,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 24,
            transform: "translateX(-50%) scale(0.9)"
          }}
        >
          <LiquidSearchBox
            aria-label="Search music"
            placeholder="Jimi Hendrix"
            surfaceProps={{
              className: "lg-music-player__search",
              radius: 21,
              refraction: {
                blur: 1,
                glassThickness: 92,
                bezelWidth: 20,
                refractiveIndex: 1.5,
                specularOpacity: 0.4
              },
              style: {
                width: 288,
                height: 38,
                padding: "0 14px"
              }
            }}
          />
        </div>
        <h3 style={{ margin: "64px 0 18px", fontSize: 17, fontWeight: 500 }}>Top Results</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {["#d9d313", "#c23b38", "#ef6d8a", "#191719"].map((color, index) => (
            <div key={color}>
              <div
                style={{
                  aspectRatio: "1",
                  borderRadius: 7,
                  background:
                    index === 0
                      ? `radial-gradient(circle at 52% 62%, #89d8ff 0 22%, transparent 23%), ${color}`
                      : `linear-gradient(135deg, ${color}, #f6d365)`,
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)"
                }}
              />
              <p style={{ margin: "8px 0 0", fontSize: 13 }}>Album Result</p>
            </div>
          ))}
        </div>
        <div
          style={{ position: "absolute", left: "50%", bottom: 24, transform: "translateX(-50%)" }}
        >
          <LiquidMusicPlayerBar />
        </div>
      </div>
    </LiquidProvider>
  )
};
