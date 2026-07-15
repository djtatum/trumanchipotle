import { NotFoundPage } from "@payloadcms/next/views";
import config from "@payload-config";
import React from "react";
import { importMap } from "../importMap.js";

export default async function NotFound() {
  return (
    <NotFoundPage
      config={config}
      importMap={importMap}
      params={Promise.resolve({ segments: [] })}
      searchParams={Promise.resolve({})}
    />
  );
}
