import express from "express"
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import session from "express-session";
import connectPgSimple from 'connect-pg-simple';
import path from "path";
import {dirname} from "path";
import { fileURLToPath } from "url";
//ROUTES
import diaryRoute from "./route/diaryRoute.js";
import riddleRoute from "./route/riddleRoute.js";
import itineraryRoute from "./route/ItineraryRoute.js";
import loginRoute from "./route/loginRoute.js";
import mediaRoute from "./route/mediaRoute.js";
import gameRoute from "./route/gameRoute.js";

import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));


const app = express();
const port = 3000;



//database
// const db = new pg.Client({
//     user: "postgres",
//     host: "localhost",
//     database: "Febis",
//     password: "SamsungEd123.",
//     port: 5432,
//   });
const db = new pg.Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

db.connect();
export {db} //export to routes

app.use("/uploads", express.static(path.join(process.cwd(), "uploads"))); //for media
app.use("/gameUploads", express.static(path.join(process.cwd(), "gameUploads"))); //for media
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// app.use(
//     session({
//         secret: "SamsungEd123.", 
//         resave: false,
//         saveUninitialized: false,
//         cookie: { secure: false }, 
//     })
// );

const PgStore = connectPgSimple(session);

app.use(
    session({
        store: new PgStore({
            pool: db,
            tableName: 'user_sessions',
            createTableIfMissing: true
        }),
        secret: process.env.SESSION_SECRET,  
        resave: false,
        saveUninitialized: false,
        cookie: { 
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        },
    })
);

app.use((req, res, next) => {
    res.locals.currentUser = req.session.currentUser;
    next();
});
app.use("/diary", diaryRoute);
app.use("/riddles", riddleRoute);
app.use("/Itinerary", itineraryRoute);
app.use("/login", loginRoute);
app.use("/uploadMedia", mediaRoute);
app.use("/game", gameRoute);


//home
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});


// app.post("/enter", (req, res) => {
//     const input = req.body["password"]; //this is the password and riddle from home.js
//     const riddle = req.body["riddle"];
    

//     if(input === riddle) {
//         res.json({success : true});
//     } else{
//         res.json({success : false});
//     }
 
// });

//menu
app.get("/menu", (req,res) => {
    res.render("index.ejs");
});

app.get("/game", (req, res) => {
    res.render("partials/game.ejs");
});


// app.listen(process.env.PORT || port, () => {
//     console.log(`Server running`);
// });

export default app;