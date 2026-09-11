import type { tagmanager_v2 } from "@googleapis/tagmanager";

/**
 * Tags and variables built from a custom template carry a `type` that names
 * the template, and the shape of that name differs by how the template is
 * sourced (verified against live containers on 2026-09-11):
 *
 * - Gallery-backed: `cvt_<galleryTemplateId>`, e.g. `cvt_TB7ZX`. The gallery
 *   id is global, so this type is the same in every container and ports as is.
 * - Local (not from the gallery): `cvt_<containerId>_<templateId>`, e.g.
 *   `cvt_30631005_218`. Both ids are container-specific, so the type must be
 *   rewritten when the template is recreated in another container.
 *
 * A spec is name-portable, so the normalizer replaces a `cvt_…` type with the
 * sentinel `cvt:<template name>` and carries the template itself by name;
 * apply resolves the sentinel back to the target container's `cvt_…` type.
 */
export const CVT_SENTINEL = "cvt:";

/** The `cvt_…` type a template has in the container it was pulled from. */
export function sourceCvtType(tpl: tagmanager_v2.Schema$CustomTemplate): string | undefined {
  const gallery = tpl.galleryReference?.galleryTemplateId;
  if (gallery) return `cvt_${gallery}`;
  if (tpl.containerId && tpl.templateId) return `cvt_${tpl.containerId}_${tpl.templateId}`;
  return undefined;
}

/** The `cvt_…` type a template will have in the target container. */
export function targetCvtType(
  containerId: string,
  tpl: Pick<tagmanager_v2.Schema$CustomTemplate, "templateId" | "galleryReference">
): string | undefined {
  const gallery = tpl.galleryReference?.galleryTemplateId;
  if (gallery) return `cvt_${gallery}`;
  if (tpl.templateId) return `cvt_${containerId}_${tpl.templateId}`;
  return undefined;
}

/** The sentinel type for a template referenced by name in a spec. */
export const cvtSentinel = (templateName: string): string => `${CVT_SENTINEL}${templateName}`;

/** The template name inside a `cvt:<name>` sentinel, or undefined for any other type. */
export function templateNameOf(type: string | null | undefined): string | undefined {
  return typeof type === "string" && type.startsWith(CVT_SENTINEL)
    ? type.slice(CVT_SENTINEL.length)
    : undefined;
}

/** Strip the server-managed and per-container fields off a pulled gallery reference. */
export function cleanGalleryReference(
  ref: tagmanager_v2.Schema$GalleryReference | undefined
): tagmanager_v2.Schema$GalleryReference | undefined {
  if (!ref) return undefined;
  const { signature, templateDeveloperId, isModified, ...rest } = ref;
  void signature;
  void templateDeveloperId;
  void isModified;
  return rest;
}
