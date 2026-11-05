// Express router, multer (file upload handling), and path helper
import { Router } from 'express';
import multer from 'multer';
import path from 'path';

// Router for the image upload endpoint
const uploadRouter = Router();
// Save uploaded files to disk in public/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'public', 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// POST /api/upload: upload one image (form field 'image') and return its URL
uploadRouter.post('/api/upload', upload.single('image'), (req, res) => {
  const imageUrl = `/uploads/${req.file.filename}`; 
  res.json({ imageUrl });
});

export { upload }; 
export default uploadRouter;
