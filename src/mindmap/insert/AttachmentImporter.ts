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
