import express from "express";
import {db} from "../index.js";

const router = express.Router();

async function confirmLogIn(username, password)  {
    try {
        const response = await db.query("SELECT * FROM users WHERE name = $1 AND user_password = $2", 
            [username, password]
        );
        console.log(response.rows, "from: ", username, password);
        return response.rows.length === 0 ? false : true;
    } catch (err) {
        res.status(500).json("Unable to search user and password");
        return false;
    }
}


router.get("/", (req, res) => {
    
    res.render("partials/login.ejs", {
        login : true,
    });
});

router.post("/LogIn", async (req, res) => {
    const logInUsername = req.body.logInUser,
    logInPassword = req.body.logInPassword;
    console.log(logInPassword, logInUsername);
    if(await confirmLogIn(logInUsername, logInPassword)) {
        req.session.currentUser = logInUsername;
        req.session.save();
        res.json({success : true});
    } else {
        res.json({success : false});
    }
    
});

router.get("/SignIn", (req, res) => {
    const referrer = req.query.referrer;
    console.log(referrer);
    res.render("partials/login.ejs", {
        signIn : true,
        referrer : referrer,
    });
});

router.post("/Register", async (req, res) => {
    const registerUsername = req.body.signInUser,
    registerPassword = req.body.signInPassword,
    referrer = req.body.referrer || '';
    console.log("DARI REGISTER: ", referrer);
    
    if(await confirmLogIn(registerUsername, registerPassword)) { //exist already
        res.json({success : false});
        console.log("exist already");
    } else {
        console.log("nice username");
        try{
            await db.query("INSERT INTO users (name, user_password) VALUES ($1, $2)",
            [registerUsername, registerPassword]
            );
            res.json({success : true, referrer : referrer});
        } catch(err) {
            res.status(500).json("Unable to insert to users");
        }
        
        
    }
   
});




export default router; 