// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    rules: {
      // Warn when state is set inside a React effect, as this can lead to unexpected behavior. 
      // This helps catch potential bugs where state updates might cause unnecessary re-renders or infinite loops.
      "react-hooks/set-state-in-effect": "warn",
    },
  }
]);
