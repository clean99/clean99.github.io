import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  LiquidField,
  LiquidFieldDescription,
  LiquidFieldError,
  LiquidInput,
  LiquidInputOtp,
  LiquidLabel,
  LiquidSelect,
  LiquidTextarea
} from "../src";
import { longChineseText, longEnglishText, StoryFrame } from "./story-fixtures";

const meta = {
  title: "Liquid Glass/LiquidField",
  component: LiquidField,
  parameters: { a11y: { test: "error" } }
} satisfies Meta<typeof LiquidField>;

export default meta;
type Story = StoryObj;

export const LightMode: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="light" field={false} width={520} height={300}>
      <LiquidField>
        <LiquidLabel htmlFor="light-email">Email</LiquidLabel>
        <LiquidInput id="light-email" placeholder="koh@example.com" />
        <LiquidFieldDescription>Used for release notes and project updates.</LiquidFieldDescription>
      </LiquidField>
    </StoryFrame>
  )
};

export const DarkMode: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={520} height={320}>
      <LiquidField>
        <LiquidLabel htmlFor="dark-title">Article title</LiquidLabel>
        <LiquidInput id="dark-title" placeholder="Liquid Glass in React" />
        <LiquidFieldDescription>
          Foreground input text stays outside the refraction layer.
        </LiquidFieldDescription>
      </LiquidField>
    </StoryFrame>
  )
};

export const FallbackMode: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" width={520} height={320}>
      <LiquidField>
        <LiquidLabel htmlFor="fallback-search">Fallback field</LiquidLabel>
        <LiquidInput id="fallback-search" placeholder="Safari and Firefox remain readable" />
      </LiquidField>
    </StoryFrame>
  )
};

export const SolidMode: Story = {
  render: () => (
    <StoryFrame mode="solid" theme="dark" field={false} width={520} height={320}>
      <LiquidField>
        <LiquidLabel htmlFor="solid-search">Reduced transparency</LiquidLabel>
        <LiquidInput id="solid-search" placeholder="Solid material path" />
      </LiquidField>
    </StoryFrame>
  )
};

export const Invalid: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={520} height={340}>
      <LiquidField invalid>
        <LiquidLabel htmlFor="invalid-slug">Slug</LiquidLabel>
        <LiquidInput
          aria-describedby="invalid-slug-error"
          id="invalid-slug"
          invalid
          value="duplicate-slug"
          readOnly
        />
        <LiquidFieldError id="invalid-slug-error">Slug is already used.</LiquidFieldError>
      </LiquidField>
    </StoryFrame>
  )
};

export const Disabled: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" field={false} width={520} height={320}>
      <LiquidField disabled>
        <LiquidLabel htmlFor="disabled-token">API token</LiquidLabel>
        <LiquidInput disabled id="disabled-token" placeholder="Disabled field" />
      </LiquidField>
    </StoryFrame>
  )
};

export const WithAdornments: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={520} height={320}>
      <LiquidField>
        <LiquidLabel htmlFor="domain">Domain</LiquidLabel>
        <LiquidInput
          endAdornment=".dev"
          id="domain"
          placeholder="clean99"
          startAdornment="https://"
        />
      </LiquidField>
    </StoryFrame>
  )
};

export const SelectAndOtp: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" field={false} width={560} height={380}>
      <div style={{ display: "grid", gap: 18 }}>
        <LiquidField>
          <LiquidLabel htmlFor="release-mode">Release mode</LiquidLabel>
          <LiquidSelect id="release-mode" defaultValue="fallback">
            <option value="enhanced">Enhanced</option>
            <option value="fallback">Fallback</option>
            <option value="solid">Solid</option>
          </LiquidSelect>
        </LiquidField>
        <LiquidField>
          <LiquidLabel id="otp-label">Verification code</LiquidLabel>
          <LiquidInputOtp aria-labelledby="otp-label" name="verification-code" />
          <LiquidFieldDescription>
            Paste support fills the cells while keeping native input focus.
          </LiquidFieldDescription>
        </LiquidField>
      </div>
    </StoryFrame>
  )
};

export const Textarea: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={560} height={420}>
      <LiquidField>
        <LiquidLabel htmlFor="note">Long-form note</LiquidLabel>
        <LiquidTextarea
          id="note"
          placeholder="Write architecture notes without distorting the text layer."
        />
        <LiquidFieldDescription>Textarea resizing stays native.</LiquidFieldDescription>
      </LiquidField>
    </StoryFrame>
  )
};

export const LongMixedText: Story = {
  render: () => (
    <StoryFrame mode="fallback" theme="light" field={false} width={440} height={360}>
      <div style={{ display: "grid", gap: 18 }}>
        <LiquidField>
          <LiquidLabel htmlFor="long-zh">中文标签</LiquidLabel>
          <LiquidInput id="long-zh" placeholder={longChineseText} />
        </LiquidField>
        <LiquidField>
          <LiquidLabel htmlFor="long-en">Long English label</LiquidLabel>
          <LiquidInput id="long-en" placeholder={longEnglishText} />
        </LiquidField>
      </div>
    </StoryFrame>
  )
};

export const BlogRealisticExample: Story = {
  render: () => (
    <StoryFrame mode="enhanced" theme="dark" width={640} height={420}>
      <div style={{ display: "grid", gap: 18 }}>
        <LiquidField>
          <LiquidLabel htmlFor="writing-search">Search writing</LiquidLabel>
          <LiquidInput id="writing-search" placeholder="performance, architecture, agents" />
        </LiquidField>
        <LiquidField>
          <LiquidLabel htmlFor="newsletter">Newsletter note</LiquidLabel>
          <LiquidTextarea id="newsletter" placeholder="Send a short note about the latest post." />
        </LiquidField>
      </div>
    </StoryFrame>
  )
};
