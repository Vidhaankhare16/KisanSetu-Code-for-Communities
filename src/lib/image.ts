/**
 * Shrinks a camera photo in the browser before upload (rural connections are slow and
 * Gemini needs nothing near 12 MP). Returns base64 JPEG without the data-URL prefix.
 */
const MAX_EDGE = 1600;
const QUALITY = 0.85;

export interface EncodedImage {
  base64: string;
  mimeType: "image/jpeg";
  previewUrl: string;
}

export async function encodeImage(file: File): Promise<EncodedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  return { base64: dataUrl.slice(dataUrl.indexOf(",") + 1), mimeType: "image/jpeg", previewUrl: dataUrl };
}
