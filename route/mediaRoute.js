import express from "express";
import { db } from "../index.js";
import { createClient } from '@supabase/supabase-js';
import multer from "multer";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/", upload.single('media'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded");
  }

  const country_name = req.body.country_name;
  const file = req.file;
  const media_type = file.mimetype.startsWith('image') ? 'image' : 'video';
  const fileExt = file.originalname.split('.').pop();
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
  const filePath = `media/${country_name}/${fileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('media-bucket')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('media-bucket')
      .getPublicUrl(filePath);

    await db.query(
      'INSERT INTO media (country_name, file_path, media_type) VALUES($1, $2, $3)',
      [country_name, publicUrl, media_type]
    );

    res.redirect(`/Itinerary/Gallery?country_name=${encodeURIComponent(country_name)}`);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json("Unable to upload media");
  }
});

router.post('/deleteMedia', async (req, res) => {
  const { ids } = req.body;
  
  try {
    for (const id of ids) {
      const result = await db.query('SELECT file_path FROM media WHERE id = $1', [id]);
      if (result.rows.length === 0) continue;

      const publicUrl = result.rows[0].file_path;
      const filePath = publicUrl.split('/media-bucket/')[1];

      const { error: deleteError } = await supabase.storage
        .from('media-bucket')
        .remove([filePath]);

      if (deleteError) console.error(`Delete error for ${filePath}:`, deleteError);

      await db.query('DELETE FROM media WHERE id = $1', [id]);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error deleting media:', err);
    res.status(500).send('Error deleting media.');
  }
});

export default router;