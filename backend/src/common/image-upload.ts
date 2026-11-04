import { BadRequestException } from '@nestjs/common';

export type UploadedImage = { buffer: Buffer; mimetype: string; size: number };

// Valida tamaño y la firma real del archivo; el tipo declarado debe coincidir con el contenido.
export function validateImage(
  file: UploadedImage | undefined,
  maxBytes: number,
  messages: { size: string; type: string },
) {
  if (
    !file ||
    file.size < 1 ||
    file.size > maxBytes ||
    file.buffer.length !== file.size
  )
    throw new BadRequestException(messages.size);
  const png = file.buffer
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg =
    file.buffer[0] === 255 &&
    file.buffer[1] === 216 &&
    file.buffer[2] === 255 &&
    file.buffer.length > 4 &&
    file.buffer[file.buffer.length - 2] === 255 &&
    file.buffer[file.buffer.length - 1] === 217;
  if (!(
    (png && file.mimetype === 'image/png') ||
    (jpeg && file.mimetype === 'image/jpeg')
  ))
    throw new BadRequestException(messages.type);
  return file;
}
