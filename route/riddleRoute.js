import express from "express";
import {db} from "../index.js";
import { resolveInclude } from "ejs";

const router = express.Router();

async function getAnswer(answer, currentriddle) {
    try {
        const response = await db.query("SELECT * FROM riddle WHERE riddlepass = $1 AND answer = $2",
            [currentriddle, answer]
        );
        console.log("match: ", response.rows, "answer: ", answer, "riddle: ", currentriddle);
        return response.rows.length === 0 ? false : true;
    } catch (err) {
        return false;
    }
}

router.get("/", async (req, res) => {
    try{
        const riddle = await db.query("SELECT riddlePass FROM riddle");
        console.log("riddle rows: ",riddle.rows);
        res.json(riddle.rows);
    } catch(err) {
        res.status(500).json({message : "Unable to fetch riddle"});
    }
    
});

router.post("/enter", async (req, res) => { 
    const input = req.body.password,
    currentriddle = req.body.riddle;
    console.log('current: ',currentriddle.toLowerCase());
    let answer = await getAnswer(input.toLowerCase(), currentriddle.toLowerCase());
    console.log("ANSWER:", answer);
    if(answer) {
        res.json({success : true});
    } else {
        res.json({success : false});
    }
    
});

router.get("/add-riddle", (req, res) => {
    res.render("partials/addRiddle.ejs");
});

router.post("/submitRiddle", async (req, res) => {
    const riddleinput = req.body.riddle,
    answerinput = req.body.answer;

    try{
        await db.query("INSERT INTO riddle (riddlePass, answer) VALUES($1, $2)",
            [riddleinput.toLowerCase(), answerinput.toLowerCase()]
        );
        res.redirect("/");
    } catch(err) {
        res.status(500).json({message : "Unable to insert riddle and answer"});
    }
});

export default router;