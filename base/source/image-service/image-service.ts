import { coerceNumber } from '#/api/validation/validators/superstruct';
import type { Infer } from 'superstruct';
import { enums, object, optional, string } from 'superstruct';

export const imageResizeModeSchema = enums(['fit', 'fill']);
export type ImageResizeMode = Infer<typeof imageResizeModeSchema>;

export const imageOriginSchema = enums(['center', 'smart', 'top', 'left', 'right', 'bottom', 'topleft', 'topright', 'bottomleft', 'bottomright']);
export type ImageOrigin = Infer<typeof imageOriginSchema>;

export const imageOptionsSchema = object({
  resizeMode: optional(imageResizeModeSchema),
  width: optional(coerceNumber()),
  height: optional(coerceNumber()),
  origin: optional(imageOriginSchema),
  quality: optional(coerceNumber()),
  format: optional(string()),
  cacheBuster: optional(string())
});
export type ImageOptions = Infer<typeof imageOptionsSchema>;

export abstract class ImageService {
  abstract getUrl(resource: string, options?: ImageOptions): Promise<string>;
}
