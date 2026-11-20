// Stores report images. A file is trusted only after its content has been checked, never by its name
// or by the type the browser claims, and it is saved under a random name the server chooses.
import { randomUUID } from 'crypto';
import { unlink, writeFile } from 'fs/promises';
import path from 'path';

export const UPLOAD_DIRECTORY = path.join(process.cwd(), 'public', 'uploads');
const PUBLIC_UPLOAD_PATH = '/uploads';

// The first bytes of each allowed format
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

const ALLOWED_IMAGE_TYPES = [
  { mimeType: 'image/jpeg', extension: 'jpg', matches: (bytes) => startsWith(bytes, JPEG_SIGNATURE) },
  { mimeType: 'image/png', extension: 'png', matches: (bytes) => startsWith(bytes, PNG_SIGNATURE) },
  { mimeType: 'image/webp', extension: 'webp', matches: isWebp },
];

export class UnsupportedImageError extends Error {
  constructor() {
    super('Please upload a JPEG, PNG, or WebP image.');
  }
}

export function detectImageType(bytes) {
  return ALLOWED_IMAGE_TYPES.find((type) => type.matches(bytes)) ?? null;
}

// Saves an uploaded file held in memory and describes where it went
export async function saveImage(file) {
  const type = detectImageType(file.buffer);
  if (!type) {
    throw new UnsupportedImageError();
  }
  const fileName = `${randomUUID()}.${type.extension}`;
  // 'wx' fails instead of overwriting, in the unlikely case that the random name already exists.
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- the name is a UUID chosen by the server
  await writeFile(path.join(UPLOAD_DIRECTORY, fileName), file.buffer, { flag: 'wx' });
  return { fileName, url: `${PUBLIC_UPLOAD_PATH}/${fileName}`, mimeType: type.mimeType, sizeBytes: file.size };
}

// Only for images returned by saveImage, whose file name the server chose
export async function deleteImage(image) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- see above
  await unlink(path.join(UPLOAD_DIRECTORY, image.fileName));
}

function startsWith(bytes, signature) {
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte);
}

// WebP files start with "RIFF", four bytes of length, then "WEBP"
function isWebp(bytes) {
  return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
}
