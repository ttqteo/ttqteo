// ESLint 9 reads flat config only, and `next lint` was removed in Next 16, so
// the lint script now calls eslint directly. eslint-config-next 16 ships a
// native flat config array, which is why there is no FlatCompat shim here.
//
// Kept to `core-web-vitals` alone, matching the .eslintrc.json this replaces.
// Adding `next/typescript` would be a behaviour change, not a migration.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/**",
      "supabase/**",
    ],
  },
  ...nextCoreWebVitals,
  {
    // The React Compiler rules below are new as errors in eslint-config-next
    // 16. They fire 51 times across code that predates this upgrade, none of it
    // touched here, so raising them as errors would mean a red lint with no way
    // to tell a regression from the backlog. Demoted to warnings so the signal
    // survives and the count can be worked down; each one is a real finding,
    // not noise to be silenced permanently.
    name: "ttqteo/react-compiler-backlog",
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
    },
  },
];

export default eslintConfig;
