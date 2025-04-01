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

async function getNumberOfGuessThePicEntries() {
  try {
    const response = await db.query("SELECT id FROM guessthepic");
    return response.rows;
  } catch(err) {
    console.log("Error in retrieving entries");
  }
}

async function getAllGuessThePic() {
  try {
    const response = await db.query("SELECT * FROM guessthepic ORDER BY id ASC");
    return response.rows;
  } catch(err) {
    console.log("Error in retrieving all contents");
    return [];
  }
}

async function getGame() {
  try {
    const response = await db.query("SELECT * FROM games");
    return response.rows;
  } catch(err) {
    return [];
    console.log("Unable to fetch games");
  } 
}

async function getUsers() {
  try {
    const response = await db.query("SELECT name FROM users");
    return response.rows;
  } catch(err) {
    console.log("Unable to get users");
  }
}

async function deleteContent(id) {
  try {
    const result = await db.query("DELETE FROM guessthepic WHERE id = $1", [parseInt(id, 10)]);
    return result.rowCount > 0;
  } catch(err) {
    console.log("cant delete:" ,err.message);
    return false;
  }
}

async function updateIds(id) {
  try {
    await db.query("UPDATE guessthepic SET id = id - 1 WHERE id > $1", [id]);
    return true;
  } catch(err) {
    return false;
  }
}

async function updateScore(user, score, game_name) {
  try {
    const result = await db.query("UPDATE played SET gamescore = $1 WHERE username = $2 AND game_name = $3", 
      [score, user, game_name]
    );
    if(result.rowCount == 0) {
      await db.query("INSERT INTO played (username, game_name, gamescore) VALUES($1, $2, $3)", [user, game_name, score])
    }
    return true;
  } catch(err) {
    return false;
  }
}

async function getScoreBoard(game_name) {
  try {
    const scoreBoard = await db.query("SELECT username, gamescore FROM played WHERE LOWER(TRIM(game_name)) = LOWER(TRIM($1)) ORDER BY gamescore DESC", [game_name]);
    return scoreBoard.rows;
  } catch(err) {
    console.log("Unable to fetch scoreboard");
  }
}

router.get("/", async (req, res) => {
  const Selection = req.query.selection;
  if(Selection) {
    const games = await getGame();
    if(Selection == "game") {
      res.render("partials/games/game.ejs", {
        games: games,
        game_slide : true,
      });
    } else if(Selection == "edit") {
      res.render("partials/games/game.ejs", {
        games : games,
        game_slide : false,
      })
    }
  } else {
    res.render("partials/games/gameHome.ejs");
  }
});

router.get("/reset", async (req, res) => {
  const gameName = req.query.gameName;
  const userPlaying = req.query.userPlaying;
  const contents = await getAllGuessThePic();
  if(gameName == "GUESS THE PIC") {
    res.render("partials/games/guessPic/guessPic.ejs", {
      user : userPlaying,
      contents : contents,
      endgame : false
    });
  }
});

router.get("/:gameName", async (req, res) => {
  const gameName = req.params.gameName;
  const gameDescription = req.query.gameDesc;
  const users = await getUsers();
  if(gameName == "GUESS THE PIC") {
    res.render("partials/games/userAuth.ejs", {
      gameDescription : gameDescription,
      users : users,
      gameName : gameName,
    });
  }
});

router.post("/EnterGame", async (req, res) => {
  const gameName = req.query.gameName;
  const userPlaying = req.query.userPlaying;
  if(gameName == "GUESS THE PIC") {
    const contents = await getAllGuessThePic();
    res.render("partials/games/guessPic/guessPic.ejs", {
      user : userPlaying,
      contents : contents,
      endgame : false
    });
  }
});

router.get("/Edit/:gameName", async (req, res) => {
  const gameName = req.params.gameName;
  if(gameName == "GUESS THE PIC") {
    const contents = await getAllGuessThePic();
    res.render("partials/games/guessPic/guessPicEdit.ejs", {
      assigned_id : 1,
      contents : contents,
    });
  }
});

router.get("/EditInside/:gameName/:id", async (req, res) => {
  const gameName = req.params.gameName;
  const id = parseInt(req.params.id, 10);
  if(gameName == "GUESS THE PIC") {
    const contents = await getAllGuessThePic();
    const content = contents.find((content) => content.id === id);
    if (content) {
      res.json({ content : content, newEntry: false, contents : contents });
    } else {
      res.json({ content: null, newEntry: true, contents : contents });
    }
  }
});

router.post("/Save", upload.single('picture'), async (req, res) => {
  const gameName = req.query.gameName;
  if (gameName == "GUESS THE PIC") {
    const option_1 = req.body.option_1;
    const option_2 = req.body.option_2;
    const option_3 = req.body.option_3;
    const option_4 = req.body.option_4;
    const current_id = parseInt(req.body.id);
    const statuses = Array.isArray(req.body.status) ? req.body.status : [req.body.status];
    
    const options = [
      { option: option_1, status: statuses[0], field: "option_1" },
      { option: option_2, status: statuses[1], field: "option_2" },
      { option: option_3, status: statuses[2], field: "option_3" },
      { option: option_4, status: statuses[3], field: "option_4" }
    ];
    
    const correct_answer = options.find(opt => opt.status === "correct");
    
    try {
      let image_path = "";
      if (req.file) {
        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
        const filePath = `games/guess-the-pic/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('game-bucket')
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('game-bucket')
          .getPublicUrl(filePath);

        image_path = publicUrl;
      } else if (req.body.currentImage) {
        image_path = req.body.currentImage;
      } else {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const ids = await getNumberOfGuessThePicEntries();
      const id_exist = ids.find((entry) => parseInt(entry.id, 10) === current_id);
      
      if (id_exist) {
        await db.query(
          "UPDATE guessthepic SET image_path = $1, option_1 = $2, option_2 = $3, option_3 = $4, option_4 = $5, correct_answer = $6 WHERE id = $7",
          [image_path, option_1, option_2, option_3, option_4, correct_answer.option, current_id]
        );
      } else {
        await db.query(
          "INSERT INTO guessthepic (id, image_path, option_1, option_2, option_3, option_4, correct_answer) VALUES($1, $2, $3, $4, $5, $6, $7)",
          [current_id, image_path, option_1, option_2, option_3, option_4, correct_answer.option]
        );
      }

      const allEntries = await getAllGuessThePic();
      const newMaxId = allEntries.length;
      
      return res.status(200).json({
        newId: current_id,
        newMaxId: newMaxId,
        message: "Entry saved successfully."
      });
    } catch (err) {
      return res.status(500).json({ error: "An error occurred while saving." });
    }
  } else {
    return res.status(400).json({ error: "Invalid game name." });
  }
});

router.post("/Delete", async (req, res) => {
  const gameName = req.query.gameName;
  const delete_id = parseInt(req.body.id, 10);
  if(gameName === "GUESS THE PIC") {
    const successful = await deleteContent(delete_id);
    const updateId = await updateIds(delete_id);
    if(successful && updateId) {
      const allEntries = await getAllGuessThePic();
      const newMaxId = allEntries.length;
      return res.status(200).json({
        newId: parseInt(req.body.id) - 1,
        newMaxId: newMaxId,
        message: "Entry deleted successfully."
      });
    }
  }
});

router.get("/FetchIds/:gameName", async (req, res) => {
  const gameName = req.params.gameName;
  if(gameName === "GUESS THE PIC") {
    const ids = await getNumberOfGuessThePicEntries();
    if(ids) {
      res.json({ids : ids});
    } else {
      res.json({ids : []});
    }
  }
}); 

router.post("/endGame", async (req, res) => {
  const correctAnswers = req.body.correct;
  const wrongAnswers = req.body.wrong;
  const userPlaying = req.body.userPlaying;
  const updated = await updateScore(userPlaying, correctAnswers - wrongAnswers, "GUESS THE PIC");
  if(updated) {
    const updatedScoreBoard = await getScoreBoard("GUESS THE PIC");
    res.render('partials/games/guessPic/guessPic.ejs', {
      endgame : true,
      scoreBoard : updatedScoreBoard,
      user: userPlaying
    });
  } else {
    console.log("Unable to update");
  }
});

export default router;