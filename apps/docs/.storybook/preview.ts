import "@clean99/liquid-glass/styles.css";

const preview = {
  parameters: {
    a11y: {
      test: "error"
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    }
  }
};

export default preview;
