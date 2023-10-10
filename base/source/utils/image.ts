import { AssertionError } from '#/errors/assertion.error.js';
import { firstValueFrom, fromEvent, map, race, switchMap, throwError } from 'rxjs';
import { FactoryMap } from './factory-map.js';
import { assertNotNullPass, isFunction, isNull } from './type-guards.js';

const supportedImageDecoders = new FactoryMap<string, Promise<boolean>>(async (dataUrl) => _canDecodeImage(dataUrl));
const supportedImageEncoders = new FactoryMap<string, boolean>((mimeType) => _canEncodeImage(mimeType));

const webpData = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoCAAEAAQAcJaQAA3AA/v3AgAA=';
const avifData = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';

export async function canDecodeWebp(): Promise<boolean> {
  return canDecodeImage(webpData);
}

export async function canDecodeAvif(): Promise<boolean> {
  return canDecodeImage(avifData);
}

export async function canDecodeImage(dataUrl: string): Promise<boolean> {
  return supportedImageDecoders.get(dataUrl);
}

export function canEncodeImageFormat(mimeType: string): boolean {
  return supportedImageEncoders.get(mimeType);
}

async function _canDecodeImage(dataUrl: string): Promise<boolean> {
  if (isFunction(globalThis.createImageBitmap)) {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return createImageBitmap(blob).then(() => true).catch(() => false);
  }

  const image = new Image();

  const canPromise = firstValueFrom(race([
    fromEvent(image, 'load').pipe(map(() => true)),
    fromEvent(image, 'error').pipe(map(() => false))
  ]));

  image.src = dataUrl;

  return canPromise;
}

function _canEncodeImage(mimeType: string): boolean {
  return document.createElement('canvas').toDataURL(mimeType).startsWith(`data:${mimeType};`);
}

export async function compressImage(sourceImage: Blob, width: number, height: number, mimeType: string, quality: number): Promise<Blob> {
  const canvas = document.createElement('canvas');

  const objectUrl = URL.createObjectURL(sourceImage);

  try {
    const image = new Image();

    const imagePromise = firstValueFrom(race([
      fromEvent(image, 'load').pipe(map(() => undefined)),
      fromEvent(image, 'error').pipe(switchMap((event: Event) => throwError(() => ((event as ErrorEvent).error as Error | undefined) ?? new Error((event as ErrorEvent).message))))
    ]));

    image.src = objectUrl;
    await imagePromise;

    const widthFactor = width / image.naturalWidth;
    const heightFactor = height / image.naturalHeight;
    const scaleFactor = Math.min(1, (widthFactor < heightFactor) ? widthFactor : heightFactor);
    const targetWidth = width * scaleFactor;
    const targetHeight = height * scaleFactor;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = assertNotNullPass(canvas.getContext('2d'), 'canvas 2d context not supported');
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const resultBlob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => {
      if (isNull(blob)) {
        reject(new AssertionError('could not render image'));
        return;
      }

      resolve(blob);
    }, mimeType, quality));

    return resultBlob;
  }
  finally {
    URL.revokeObjectURL(objectUrl);
  }
}
