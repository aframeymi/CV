import { Router } from 'express';
import multer from 'multer';
import path from 'path';

const uploadRouter = Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), 'public', 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

uploadRouter.post('/api/upload', upload.single('image'), (req, res) => {
  const imageUrl = `/uploads/${req.file.filename}`; // public path
  res.json({ imageUrl });
});

export { upload }; 
export default uploadRouter;
