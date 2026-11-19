// Multer handles the image field of the report form
import multer from 'multer';
import path from 'path';

// Save uploaded files to disk in public/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'public', 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

export { upload };
