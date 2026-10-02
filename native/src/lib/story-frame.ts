/** Visible source rectangle after a uniform scale and pan. Aspect ratio is never changed. */

export function storyCropRect(input: {
  imageWidth: number;
  imageHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  translateX: number;
  translateY: number;
}) {
  const { imageWidth: iw, imageHeight: ih, canvasWidth: width, canvasHeight: height } = input;
  if (iw < 2 || ih < 2 || width < 2 || height < 2) return null;
  const contain = Math.min(width / iw, height / ih);
  const drawnW = iw * contain * input.scale;
  const drawnH = ih * contain * input.scale;
  if (drawnW < 2 || drawnH < 2) return null;
  const left = (width - drawnW) / 2 + input.translateX;
  const top = (height - drawnH) / 2 + input.translateY;
  const x0 = Math.max(0, left);
  const y0 = Math.max(0, top);
  const x1 = Math.min(width, left + drawnW);
  const y1 = Math.min(height, top + drawnH);
  if (x1 - x0 < 2 || y1 - y0 < 2) return null;
  const originX = Math.max(0, Math.floor(((x0 - left) / drawnW) * iw));
  const originY = Math.max(0, Math.floor(((y0 - top) / drawnH) * ih));
  const cropW = Math.min(iw - originX, Math.max(1, Math.round(((x1 - x0) / drawnW) * iw)));
  const cropH = Math.min(ih - originY, Math.max(1, Math.round(((y1 - y0) / drawnH) * ih)));
  if (cropW < 2 || cropH < 2) return null;
  return { originX, originY, width: cropW, height: cropH };
}

export function coverScaleForContain(imageWidth: number, imageHeight: number, canvasWidth: number, canvasHeight: number) {
  if (imageWidth < 2 || imageHeight < 2 || canvasWidth < 2 || canvasHeight < 2) return 1;
  const contain = Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight);
  const cover = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight);
  return cover / contain;
}
