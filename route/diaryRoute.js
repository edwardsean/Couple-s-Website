import express from "express";
import {db} from "../index.js";

const router = express.Router();

let currentUser = "";

async function getDraft(user) {
    
    try{
        const response = await db.query("SELECT drafts.id, title, publish_date, contents, date, username FROM drafts JOIN users ON drafts.username = users.name WHERE username = $1",
            [user]
        );
        return response.rows;
    } catch (err) {
        console.log(`Unable to fetch drafts from user ${user}`);
        return [];
        
    }

}

async function getPost() {
    try{
        const response = await db.query("SELECT * FROM posts");
        return response.rows;
    } catch(err) {
        console.log("Unable to fetchposts");
        return [];
    }
}

async function deleteBox(id, type) {
    if(type === "drafts") {
        try{
            await db.query("DELETE FROM drafts WHERE id = $1", [id]);
            return;
        } catch (err) {
            console.log("Unable to delete draft");
        }
    } else {
        try{
            await db.query("DELETE FROM posts WHERE id = $1", [id]);
            return;
        } catch (err) {
            console.log("Unable to delete post");
        }
    }
   
}


router.get("/", async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const user = req.session.currentUser;
    console.log("user is : ", user);
    
    try {
        const getDrafts = await getDraft(user);
        const getPosts = await getPost(user);

        const noDraft = getDrafts.length === 0;
        const noPost = getPosts.length === 0;
        
        const today = new Date().toISOString().split("T")[0];

        res.render("partials/diary.ejs", {
            drafts : getDrafts, 
            posts : getPosts,
            noDraft : noDraft,
            noPost : noPost,
            today : today,
            currentUser : user,
        });
    } catch (err) {
        console.log(err.message);
    }

   
});

router.get("/new", (req, res) => {
    res.render("new.ejs", {
        heading : "New Draft",
        submit : "Create Draft"
    });
}); 

router.post("/editDraft/:id", async (req, res) => {
    const editedTitle = req.body.title,
    editedContent = req.body.content,
    editedPublishDate = req.body.publish_date,
    date = req.body.time,
    id = parseInt(req.params.id);
    console.log(editedTitle, editedContent, editedPublishDate, date);
    try {
        await db.query("UPDATE drafts SET title = $1, publish_date = $2, contents = $3, date = $4 WHERE id = $5",
            [editedTitle, editedPublishDate, editedContent, date, id]
        );
        res.redirect("/diary");
    } catch (err) {
        res.status(500).json({message : "Unable to edit draft"});
    }
});

router.get("/edit/:id", async (req, res) => {
    try {
        const getDrafts = await getDraft(req.session.currentUser);
        const selected = getDrafts.find((draft) => draft.id == parseInt(req.params.id));
        console.log("SELECTED: ",selected);
        res.render("new.ejs", {
            draft : selected,
            heading : "Edit Draft",
            submit : "Finish Editing"
        });
    } catch (err) {
        res.status(500).json({message : "Unable to find draft"});
    }

});

// router.delete("/delete-multiple", async (req, res) => {
//     try {
//         const { postIds } = req.body;
//         await db.query("DELETE FROM posts WHERE id = $1", [postIds]);
//         res.sendStatus(200);
//     } catch (err) {
//         console.error("Bulk delete error:", err);
//         res.sendStatus(500);
//     }
// });

router.delete("/delete/:id/:type", async (req, res) => {
    const id = parseInt(req.params.id),
    type = req.params.type;
    try {
        await deleteBox(id, type);

        res.json({success : true, message : `${type} deleted successfully`});
    } catch(err) {
        console.log(err);
    }
    


});

router.get("/post/:id", async (req, res) => {
    const id = parseInt(req.params.id);
   
    try{
      
        await db.query("INSERT INTO posts (title, author, contents, date, draft_id) SELECT title, username, contents, date, id FROM drafts WHERE id = $1",
           [id]
        );
   
        await db.query("DELETE FROM drafts WHERE id = $1", [id]); 
        
        res.redirect("/diary");
    } catch (err) {
        res.status(500).json({message : err.message});
    }
});

router.post("/postDraft", async (req, res) => {
    const content = req.body.content,
    title = req.body.title,
    publish_Date = req.body.publish_date,
    date = req.body.time,
    user = req.session.currentUser;
    console.log(content, title, publish_Date, date);
    console.log("OIt", user);
    try{
        await db.query("INSERT INTO drafts (title, publish_date, contents, date, username) VALUES ($1, $2, $3, $4, $5)",
            [title, publish_Date, content, date, user]
        );
        res.redirect(`/diary?t=${Date.now()}`);
    } catch (err) {
        console.log(err.message);
        res.status(500).json({message : "Unable to make draft"});
    }
}); 
export default router;