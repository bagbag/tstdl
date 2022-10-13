import { Coerce, Enumeration, Optional } from '#/schema';

export enum ImageResizeMode {
  Fit = 'fit',
  Fill = 'fill'
}

export enum ImageFormat {
  Png = 'png',
  Jpg = 'jpg',
  Jpeg = 'jpeg',
  Webp = 'webp',
  Avif = 'avif'
}

export enum ImageOrigin {
  Center = 'center',
  Smart = 'smart',
  Top = 'top',
  Left = 'left',
  Right = 'right',
  Bottom = 'bottom',
  TopLeft = 'topleft',
  TopRight = 'topright',
  BottomLeft = 'bottomleft',
  BottomRight = 'bottomright'
}


export class ImageOptions {
  @Optional()
  @Enumeration(ImageResizeMode)
  resizeMode?: ImageResizeMode;

  @Optional()
  @Coerce()
  width?: number;

  @Optional()
  @Coerce()
  height?: number;

  @Optional()
  @Enumeration(ImageOrigin)
  origin?: ImageOrigin;

  @Optional()
  @Coerce()
  quality?: number;

  @Optional()
  format?: ImageFormat;

  @Optional()
  cacheBuster?: string;
}

export abstract class ImageService {
  abstract getUrl(resource: string, options?: ImageOptions): Promise<string>;
}
