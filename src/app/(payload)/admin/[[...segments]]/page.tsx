import { RootPage } from "@payloadcms/next/views";
import config from "@payload-config";
import React from "react";
import { importMap } from "../importMap.js";

export default async function Page(props: {
  params: Promise<{ segments?: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { segments } = await props.params;

  return (
    <RootPage
      config={config}
      importMap={importMap}
      params={Promise.resolve({ segments: segments || [] })}
      searchParams={props.searchParams as any}
    />
  );
}
