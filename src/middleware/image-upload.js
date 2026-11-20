// Reads the optional image of the report form into memory, within strict limits.
// Nothing is written to disk here: the route saves the image only once the whole form is valid.
import multer from 'multer';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_FIELD = 'image';

const LIMITS = {
  fileSize: MAX_IMAGE_BYTES,
  files: 1,
  fields: 10,
  fieldSize: 100 * 1024,
};

const readImageField = multer({ storage: multer.memoryStorage(), limits: LIMITS }).single(IMAGE_FIELD);

const UPLOAD_ERRORS = {
  LIMIT_FILE_SIZE: { status: 413, message: 'Images can be at most 5 MB.' },
  LIMIT_FILE_COUNT: { status: 400, message: 'Please attach only one image.' },
  LIMIT_UNEXPECTED_FILE: { status: 400, message: 'Please attach only one image.' },
};
const DEFAULT_UPLOAD_ERROR = { status: 400, message: 'The form could not be read. Please try again.' };

export function receiveImage(req, res, next) {
  readImageField(req, res, (error) => {
    if (!error) {
      return next();
    }
    if (error instanceof multer.MulterError) {
      const { status, message } = UPLOAD_ERRORS[error.code] ?? DEFAULT_UPLOAD_ERROR;
      return res.status(status).send(message);
    }
    return next(error);
  });
}
