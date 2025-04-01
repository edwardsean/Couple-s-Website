import express from "express";
import {db} from "../index.js";
import path from "path";
import multer from "multer";

import fs from "fs";

const router = express.Router();

const uploadFolder = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder);
}

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadFolder);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});


router.post("/", upload.single('media'), async (req, res) => {

    console.log("req.file: ", req.file);
    console.log("req.body: ", req.body);

    if(!req.file) {
        return res.status(400).send("No file uploaded");
    }
        const country_name = req.body.country_name,
        file_path = `uploads/${req.file.filename}`,
        media_type = req.file.mimetype.startsWith('image') ? 'image' : 'video';
        

        try{
            await db.query(
                'INSERT INTO media (country_name, file_path, media_type) VALUES($1, $2, $3)',
                [country_name, file_path, media_type]
            );
            res.redirect(`/Itinerary/Gallery?country_name=${encodeURIComponent(country_name)}`);

        } catch(err) {
            res.status(500).json("Unable to insert to media");
        }
});


router.post('/deleteMedia', async (req, res) => {
    const { ids } = req.body;
    console.log("From server", ids);
    try {
    
        for (const id of ids) {
            const result = await db.query('SELECT file_path FROM media WHERE id = $1', [id]);
            if(result.rows.length === 0) {
                console.log(`No media found for id: ${id}`);
                continue; //skip to next id
            }
            // const filePath = result.rows[0].file_path;
            const filePath = path.resolve(result.rows[0].file_path);

        // Delete the file from the file system
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
        } else {
            console.log(`File not found on disk for id: ${id}`);
        }
           
        await db.query('DELETE FROM media WHERE id = $1', [id]);

        }

        res.sendStatus(200);
    } catch (err) {
        console.error('Error deleting media:', err);
        res.status(500).send('Error deleting media.');
    }
});



export default router;