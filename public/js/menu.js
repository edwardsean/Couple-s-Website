const choices = document.querySelectorAll(".choice");

choices.forEach(choice => {
    choice.addEventListener("click", () => {
        let selected = "";
        if(choice.classList.contains("game")){
            window.location.href = "game";
        } else if(choice.classList.contains("diary")){
            // window.location.href = "diary";
            window.location.href = "login";
        } else if(choice.classList.contains("Itinerary")){
            window.location.href = "Itinerary";
        } else{
            window.location.href = "/riddles/add-riddle";
        }
    });
});