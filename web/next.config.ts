import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.glsl": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
  sassOptions: {},
  // Hide the dev-mode "N" indicator in the corner. Re-enable by deleting this block.
  devIndicators: false,
};

export default nextConfig;
