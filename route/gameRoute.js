import express from "express";
import {db} from "../index.js";
import path from "path";
import multer from "multer";
import fs from "fs";

const router = express.Router();

//for uploading
const uploadFolder = path.join(process.cwd(), 'gameUploads');
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
    limits: { fileSize: 10 * 1024 * 1024 }, 
});

//GetToPic
async function getNumberOfGuessThePicEntries() {
    try{
        const response = await db.query("SELECT id FROM guessthepic");
        return response.rows;
    } catch(err) {
        console.log("Error in retrieving entries");
    }
}

async function getAllGuessThePic() {
    try{
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
        //SELECT game_name, games.game_description, gamescore, users.name FROM games JOIN users ON games.username = users.name
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
    console.log("UPDATE FOR USER: ", user, "Score: ", score)
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
        console.log("Unable to fetch scoreboard");    }
}


router.get("/", async (req, res) => {
    const Selection = req.query.selection;


    if(Selection) { //if clicked an option
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
    } else { //go to home
        res.render("partials/games/gameHome.ejs");
    }


});

router.get("/reset", async (req, res) => {
    const gameName = req.query.gameName;
    const userPlaying = req.query.userPlaying;
    const contents = await getAllGuessThePic();
    if(gameName == "GUESS THE PIC") {
        const contents = await getAllGuessThePic();
        res.render("partials/games/guessPic/guessPic.ejs", {
            user : userPlaying,
            contents : contents,
            endgame : false
        });
    }
});

//play game
router.get("/:gameName", async (req, res) => {
    const gameName = req.params.gameName,
    gameDescription = req.query.gameDesc,
    users = await getUsers();
    console.log("Disini: ", gameName);
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
    console.log("USER ENTER: ", userPlaying);
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
        // const numberOfId = await getNumberOfGuessThePicEntries();
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
    console.log("ID is: ", id);
    if(gameName == "GUESS THE PIC") {
        const contents = await getAllGuessThePic();
        const content = contents.find((content) => content.id === id);
        console.log(content);
        if (content) {
            res.json({ content : content, newEntry: false, contents : contents });
        } else {
            res.json({ content: null, newEntry: true, contents : contents });
        }
    } else{
  
    }
});

//save edited
router.post("/Save", upload.single('picture'), async (req, res) => {
    const gameName = req.query.gameName;
    console.log("body save:", req.body);
    if (gameName == "GUESS THE PIC") {
        const option_1 = req.body.option_1,
              option_2 = req.body.option_2,
              option_3 = req.body.option_3,
              option_4 = req.body.option_4,
              current_id = parseInt(req.body.id),
              statuses = Array.isArray(req.body.status) ? req.body.status : [req.body.status]; 

              const options = [
                { option: option_1, status: statuses[0], field: "option_1" },
                { option: option_2, status: statuses[1], field: "option_2" },
                { option: option_3, status: statuses[2], field: "option_3" },
                { option: option_4, status: statuses[3], field: "option_4" }
            ];
        console.log("current id: ", current_id);
        const correct_answer = options.find(opt => opt.status === "correct")
        console.log("correct: ", correct_answer);
        
        let image_path = "";
        if (req.file) {
            image_path = `gameUploads/${req.file.filename}`;
        } else if (req.body.currentImage) {
            image_path = req.body.currentImage;
        } else {
            return res.status(400).json({ error: "No file uploaded" });
        }
        
        try {
            const ids = await getNumberOfGuessThePicEntries();
            const id_exist = ids.find((entry) => parseInt(entry.id, 10) === current_id);
            console.log("id that exist: ", id_exist);
            if (id_exist) {
                //update in database
                try {
                    await db.query(
                        "UPDATE guessthepic SET image_path = $1, option_1 = $2, option_2 = $3, option_3 = $4, option_4 = $5, correct_answer = $6 WHERE id = $7",
                        [image_path, option_1, option_2, option_3, option_4, correct_answer.option, current_id]
                    );
                } catch (err) {
                    return res.status(500).json({ message: "Unable to update GuessThePic entry" });
                }
            } else {
                //insert to database
                console.log("id doesn't exist, inserting new entry");
                try {
                    await db.query(
                        "INSERT INTO guessthepic (id, image_path, option_1, option_2, option_3, option_4, correct_answer) VALUES($1, $2, $3, $4, $5, $6, $7)",
                        [current_id, image_path, option_1, option_2, option_3, option_4, correct_answer.option]
                    );
                } catch (err) {
                    return res.status(500).json({ message: err.message });
                }
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

//delete edited
router.post("/Delete", async (req, res) => {
    const gameName = req.query.gameName;
    const delete_id = parseInt(req.body.id, 10);
    console.log("id: ", parseInt(req.body.id));
    if(gameName === "GUESS THE PIC") {
        console.log("before");
        const successful = await deleteContent(delete_id);
        const updateId = await updateIds(delete_id);
        console.log("after");
        if(successful && updateId) {
            console.log("Successful deletion");
            const allEntries = await getAllGuessThePic();
            const newMaxId = allEntries.length;
            return res.status(200).json({
                newId: parseInt(req.body.id) - 1,
                newMaxId: newMaxId,
                message: "Entry deleted successfully."
            });
        } else {
            console.log("Unsuccessful deletion");
        }
    }
    

});

//GET ids for games
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
    // const request = JSON.stringify(req.body);
    const correctAnswers = req.body.correct,
    wrongAnswers = req.body.wrong,
    userPlaying = req.body.userPlaying;
    console.log("correct: ", correctAnswers, "wrong: ", wrongAnswers);

    console.log("User Playing: ", userPlaying, "result: ", correctAnswers - wrongAnswers);
    const updated = await updateScore(userPlaying, correctAnswers - wrongAnswers, "GUESS THE PIC"); //change for future games
    if(updated) {
        const updatedScoreBoard = await getScoreBoard("GUESS THE PIC"); //change for future games
        console.log("Rendering template with endGame:", true, "scoreBoard:", updatedScoreBoard);
        res.render('partials/games/guessPic/guessPic.ejs', {
            endgame : true,
            scoreBoard : updatedScoreBoard,
            user: userPlaying
        });
    } else {
        console.log("Unable to update");
    }

});

// router.post("/endGame", async (req, res) => {
//     const { correct, wrong, userPlaying } = req.body;
//     console.log("correct: ", correct, "wrong: ", wrong);
  
//     // 1. Update the user's score
//     const updated = await updateScore(userPlaying, correct - wrong);
  
//     if (updated) {
//       // 2. Fetch the updated scoreboard
//       const updatedScoreBoard = await getScoreBoard();
//       console.log("UPDATED SCOREBOARD: ", updatedScoreBoard);
  
//       // 3. Send JSON response with scoreboard data
//       res.json({
//         success: true,
//         scoreBoard: updatedScoreBoard,
//       });
//     } else {
//       res.json({
//         success: false,
//         message: "Failed to update score",
//       });
//     }
//   });
export default router;