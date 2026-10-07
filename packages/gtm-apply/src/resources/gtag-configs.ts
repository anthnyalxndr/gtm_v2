/** The Google tag id that identifies a gtag config: its parameter with key tagId. */
export function gtagConfigTagId(config: {
  parameter?: readonly { key?: string | null; value?: string | null }[] | null;
}): string | undefined {
  return config.parameter?.find((p) => p.key === "tagId")?.value ?? undefined;
}
