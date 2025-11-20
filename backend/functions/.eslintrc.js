module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*",
    "/generated/**/*", 
    "*.js",
  ],
  rules: {
    // Deshabilitar todas las reglas problemáticas
    "quotes": "off",
    "indent": "off",
    "object-curly-spacing": "off",
    "max-len": "off",
    "no-trailing-spaces": "off",
    "comma-dangle": "off",
    "arrow-parens": "off",
    "semi": "off",
  },
};