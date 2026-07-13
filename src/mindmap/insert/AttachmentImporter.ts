import { App, TFile } from 'obsidian';

const VAULT_IMAGE_EXTENSIONS = new Set([
  'avif',
  'bmp',
  'gif',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
]);

const IMPORTABLE_IMAGE_TYPES: Record<string, string[]> = {
  avif: ['image/avif'],
  bmp: ['image/bmp'],
  gif: ['image/gif'],
  jpeg: ['image/jpeg'],
  jpg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
};

const CLIPBOARD_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function isVaultImage(file: TFile): boolean {
  return VAULT_IMAGE_EXTENSIONS.has(file.extension.toLowerCase());
}

export async function importLocalImage(
  app: App,
  sourcePath: string,
  file: File,
): Promise<TFile> {
  const filename = file.name.replace(/[\\/]/g, '-').trim();
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const allowedTypes = IMPORTABLE_IMAGE_TYPES[extension];
  if (!filename || !allowedTypes || (file.type && !allowedTypes.includes(file.type))) {
    throw new Error('unsupported-image-type');
  }

  const attachmentPath = await app.fileManager.getAvailablePathForAttachment(filename, sourcePath);
  const data = await file.arrayBuffer();
  return app.vault.createBinary(attachmentPath, data);
}

export async function importClipboardImage(
  app: App,
  sourcePath: string,
  image: File,
): Promise<TFile> {
  const extension = CLIPBOARD_IMAGE_EXTENSIONS[image.type];
  if (!extension) throw new Error('unsupported-image-type');

  const filename = `Pasted image ${formatTimestamp(new Date())}.${extension}`;
  const file = new File([image], filename, {
    type: image.type,
    lastModified: image.lastModified,
  });
  return importLocalImage(app, sourcePath, file);
}

function formatTimestamp(date: Date): string {
  const pad = (value: number, length = 2) => `${value}`.padStart(length, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    pad(date.getMilliseconds(), 3),
  ].join('');
}
