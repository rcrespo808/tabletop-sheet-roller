import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: [".next/**", ".tools/**", "node_modules/**", "out/**", "tsconfig.tsbuildinfo"]
  }
];

export default config;
