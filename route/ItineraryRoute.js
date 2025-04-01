import express from "express";
import {db} from "../index.js";

const router = express.Router();

async function getCheckList() {
    try {
        const checklist = await db.query("SELECT * FROM checklist;");

        return checklist.rows || [];
    } catch (err) {
        res.status(500).json({message : "Unable to fetch checklist"});
    }
}

async function getCountry(country_name) {
    try  {
        const response = await db.query("SELECT * FROM countries WHERE LOWER(country_name) LIKE LOWER($1);", 
            [`%${country_name}%`]
        );
        
        return response.rows;
    } catch (err) {
        res.status(500).json({message : "Unable to get Countries"});
    }
}



router.get("/", async (req, res) => {

    try{
        const countriesInCheckList = await getCheckList();
        const countryCodes = countriesInCheckList.map(item => item.country_code);
        res.render("partials/Itinerary.ejs", {
            countries : countryCodes,
            viewMap : true,
            firstView : true,
            referrer : "/menu",
          
        });
    } catch (err) {
        res.status(500).json({message : "Unable to load Itinerary"});
    }
  
});


router.post("/list", async (req, res) => {
    let selected;
    let addBool = false;
    let gallery = false;
    const seeList = req.body.list,
    addList = req.body.add,
    memories = req.body.memories,
    referrer = "/Itinerary";

    if(seeList) {
        const checkList = await getCheckList();
        selected = checkList;
    }

    if(addList) {
        selected = [];
        addBool = true;
        gallery = false;
    }

    if(memories) {
        selected = [];
        addBool = false;
        gallery = true;
    }
    
    try{
        const countriesInCheckList = await getCheckList();
        const countryCodes = countriesInCheckList.map(item => item.country_code);
        res.render("partials/Itinerary.ejs", {
            checklist : selected,
            add : addBool,
            countries : countryCodes,
            viewMap : true,
            searchGallery : gallery,
            referrer : referrer,
            
        });
    } catch(err) {
        res.status(500).json("Unable to get Check List");
    }
    
    
});

router.get("/list", async (req, res) => {
    let selected;
    let addBool = true;
    let gallery = false;
    const referrer = req.body.referrer || "/Itinerary";
    console.log("From list : ", referrer)
    const checkList = await getCheckList();
    selected = checkList;
    if(req.query.backToGallery) {
        gallery = true;
        addBool = false;
        console.log("query - ", req.query.backToGallery);
    }
    
    try{
        const countriesInCheckList = await getCheckList();
        const countryCodes = countriesInCheckList.map(item => item.country_code);
        res.render("partials/Itinerary.ejs", {
            checklist : selected,
            add : addBool,
            countries : countryCodes,
            viewMap : true,
            searchGallery : gallery,
            referrer : referrer,
            
            
        });
    } catch(err) {
        res.status(500).json("Unable to get Check List");
    }
    
    
});

router.post("/add", async (req, res) => {
    const inputCountry = req.body.country.toLowerCase();
    const wantedAction = req.body.action;
    console.log(wantedAction);
    if(wantedAction === "Add") { //add country
        const getWantedCountry = await getCountry(inputCountry);
        const countryInChecklist = await getCheckList();
        const chosenCountry = getWantedCountry[0];
        const inChecklist = countryInChecklist.find(countries => countries.country_name.toLowerCase() == inputCountry.toLowerCase());

        if(inChecklist) {
            res.redirect("/Itinerary/list");
        } else {
            try {
                await db.query("INSERT INTO checklist (country_code, country_name, checked) VALUES ($1, $2, $3)",
                    [chosenCountry.country_code, chosenCountry.country_name, 'no']
                );
    
                res.redirect("/Itinerary/list");
            } catch(err) {
                res.redirect("/Itinerary");
            }
        }
        
    } else { //search country for gallery
        const getWantedCountry = await getCountry();
        const chosenCountry = getWantedCountry.find((country) => country.country_name.toLowerCase() == inputCountry.toLowerCase());
        res.redirect(`/Itinerary/Gallery?country_name=${encodeURIComponent(chosenCountry.country_name)}&referrer=${encodeURIComponent("/Itinerary/list")}`);
        console.log(chosenCountry);

    }
    
});



router.post("/checked", async (req, res) => {
    const country_code = req.body.country_code,
    isChecked = req.body.checked;

    try {    
        await db.query("UPDATE checklist SET checked = $1 WHERE country_code = $2",
            [isChecked ? 'yes' : 'no', country_code]);
        res.json({ok : true});
    } catch(err) {
        res.status(500).json("Unable to update checked column");
    }
});

router.post("/getChecked", async (req, res) => {
    const code = req.body.country_code;
    try {
        const response = await db.query("SELECT checked FROM checklist WHERE country_code = $1", [code]);
        if (response.rows.length === 0) {
            return res.status(404).json({ message: "Country not found" });
        }
        res.json({ checked: response.rows[0].checked }); 
    } catch (err) {
        res.status(500).json({ message: "Unable to fetch check status" });
    }
});

router.get("/Gallery", async (req, res) => {
    const country_name = req.query.country_name || req.session.country_name;
    const referrer = req.query.referrer;
    console.log("referrer: ", referrer);
    try{
        const media = await db.query("SELECT * FROM media WHERE country_name = $1", [country_name]);
        if (country_name) {
            req.session.country_name = country_name;
            res.render("partials/gallery.ejs", {
              country_name: req.session.country_name,
              media : media.rows,
              referrer : referrer,
            });
        } else {
            res.redirect("/Itinerary");
        }
        
    }catch(err) {
        res.status(500).send('Error loading gallery.');
    }

   
});

router.delete("/delete", async (req, res) => {
    const {country_code} = req.body;
    
    try { 
        await db.query("DELETE FROM checklist WHERE country_code = $1", [country_code]);
        console.log(country_code);
        res.json({ success: true, message: "Country deleted successfully" });
    } catch(err){
        console.error(err);
    }
});

export default router;