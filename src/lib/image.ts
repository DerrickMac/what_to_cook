/**
 * Downscale a picked image and return raw base64 (no data: prefix) + media type,
 * small enough to POST to an edge function and pass to a vision model.
 */
export async function fileToBase64(
  file: File,
  maxDim = 1280,
  quality = 0.82
): Promise<{ data: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file).catch(() => null);

  if (!bitmap) {
    // Fallback: send the file as-is.
    const raw = await file.arrayBuffer();
    return { data: bytesToBase64(new Uint8Array(raw)), mediaType: file.type || 'image/jpeg' };
  }

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unsupported');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return { data: dataUrl.split(',')[1] ?? '', mediaType: 'image/jpeg' };
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
