// Definitive Expo config. Forces web to be static (no expo-router).
export default {
  name: "triunely-app",
  slug: "triunely-app",
  web: {
    bundler: "metro",
    output: "static",
  },
};
