import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/stories",
        destination: "/",
        permanent: false,
      },
      {
        source: "/story/:slug*",
        destination: "/stories/:slug*",
        permanent: false,
      },
    ];
  },
};

export default withPayload(nextConfig);
