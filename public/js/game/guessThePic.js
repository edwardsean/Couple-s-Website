const countdownOverlay = document.getElementById("countdown-overlay"),
        countdownText = document.getElementById("countdown-text"),
        timer = document.getElementById("timer"),
        gameStartDiv = document.getElementById("game-start-div"),
        endGameDiv = document.getElementById("checklist-container"),
        backButton = document.getElementById("back-button");
        const messages = ["Hover the canvas to see the image!", "3", "2", "1", "GOO!!"];
        let index = 0;
        let timeleft = 60;
        let ids = [];
        let currentIndex = 0;
        let correctPoints = 0;
        let wrongPoints = 0;
        let started = false;

        backButton.addEventListener("click", (event) => {
            if(!endGameDiv) {
                event.preventDefault();
                const confirmBack = confirm("Are you sure? Your progress will not be saved.");

                if(confirmBack) {
                    window.location.href = backButton.href;
                }
            }
        });
        
        async function fetchIDS() {
            let id = [];
            try {
                const response = await fetch('/game/FetchIds/GUESS%20THE%20PIC');
                const data = await response.json();
                id = data.ids;

                for (let i = id.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [id[i], id[j]] = [id[j], id[i]];
                }
                return id;
            } catch(err) {
                console.error("Error fetching ids: ", err);
            }
        }

        async function fetchContent(id) {
            try {
                const gameContainer = document.getElementById("game-container");
                const choicesDiv = document.getElementById("choices");

                if (started) {
                    gameContainer.classList.add("slide-out");
                    choicesDiv.classList.add("slide-out");

                    await new Promise(resolve => setTimeout(resolve, 500));

                    gameContainer.classList.remove("slide-out");
                    choicesDiv.classList.remove("slide-out");

                    gameContainer.classList.add("slide-in");
                    choicesDiv.classList.add("slide-in");

                    await new Promise(resolve => setTimeout(resolve, 500));

                    gameContainer.classList.remove("slide-in");
                    choicesDiv.classList.remove("slide-in");
                } else {
                    started = true; 
                }

                const response = await fetch(`/game/EditInside/GUESS%20THE%20PIC/${id.id}`);
                const data = await response.json();

                const option_1 = document.getElementById("option_1"),
                    option_2 = document.getElementById("option_2"),
                    option_3 = document.getElementById("option_3"),
                    option_4 = document.getElementById("option_4");
                const picture = document.getElementById("picture");
                const correct_answer = document.getElementById("correct_answer");

                option_1.textContent = data.content.option_1;
                option_2.textContent = data.content.option_2;
                option_3.textContent = data.content.option_3;
                option_4.textContent = data.content.option_4;

                picture.src = `/${data.content.image_path}`;
                correct_answer.value = data.content.correct_answer;
            } catch (error) {
                console.error("Error fetching content:", error);
            }
        }

        function showCountdown() {
            if (index < messages.length) {
                countdownText.textContent = messages[index];
                countdownText.style.animation = "none"; //reset animation
                void countdownText.offsetWidth; //trigger reflow to restart animation
                
                index++;
                if(index == 1) { //first message
                    countdownText.style.animation = "fade-forward 4s linear";
                    setTimeout(showCountdown, 3000);

                } else {
                    countdownText.style.animation = "fade 1s linear";
                    setTimeout(showCountdown, 800); //update every second
                }  
            } else {
                countdownOverlay.style.display = "none";
                startGame(); 
            }
        }

        async function startGame() {

            
            fetchIDS().then((fetchedIds) => {
                if (!fetchedIds || fetchedIds.length === 0) {
                    console.error("No IDs fetched or empty ID array.");
                    endGame();
                    return;
                }
                ids = fetchedIds;
                currentIndex = 0;
                correctPoints = 0;
                wrongPoints = 0;
                timeleft = 60;

                if (ids.length > 0) {
                    console.log("current id : ", ids[currentIndex]);
                    fetchContent(ids[currentIndex]);

                    const hidden = document.querySelectorAll(".hidden");
                    hidden.forEach((hiddenElements) => {
                        hiddenElements.classList.remove("hidden");
                    }); 
                const canvas = document.getElementById('mask');
                const context = canvas.getContext('2d');

                context.fillStyle = "black";
                context.fillRect(0, 0, canvas.width, canvas.height);

                canvas.addEventListener("mousemove", (event) => {
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.fillStyle = "black";
                    context.fillRect(0, 0, canvas.width, canvas.height);

                    const rect = canvas.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const y = event.clientY - rect.top;

                    context.globalCompositeOperation = "destination-out";
                    context.beginPath();
                    context.arc(x, y, 30, 0, 2 * Math.PI);
                    context.fill();
                    context.globalCompositeOperation = "source-over";
                });


                canvas.addEventListener("mouseleave", () => {
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.fillStyle = "black";
                    context.fillRect(0, 0, canvas.width, canvas.height);
                });


                    const timerInterval = setInterval(async () => {
                        timeleft--;
                        timer.textContent = `Time Left: ${timeleft}`;
                        if (timeleft <= 0) {
                            clearInterval(timerInterval);
                            await endGame();
                        }
                    }, 1000);
                } else {
                    console.error("No content available.");
                }


            });

            document.querySelectorAll(".choice").forEach((button) => {
                button.addEventListener("click", async (event) => {
                    await handleAnswer(event.target.textContent);
            });
    });
         
            
        }

        async function handleAnswer(selectedAnswer) {
            const correctAnswer = document.getElementById("correct_answer").value;
            const selectedButton = Array.from(document.querySelectorAll(".choice"))
                .find(button => button.textContent === selectedAnswer);

            if (selectedAnswer === correctAnswer) {
                correctPoints++;
                selectedButton.classList.add("correct");
                setTimeout(() => {
                    selectedButton.classList.remove("correct");
                }, 500);
            } else {
                wrongPoints++;
                selectedButton.classList.add("incorrect")
                setTimeout(() => {
                    selectedButton.classList.remove("incorrect");
                }, 500);
            }

            
            currentIndex++;
            console.log("Current Index: ", currentIndex, "out of: ", ids.length);
            if (currentIndex < ids.length) {
                setTimeout(() => fetchContent(ids[currentIndex]), 500);
            } else {    
                setTimeout(endGame, 500);
            }
        }

        // async function endGame() {
        //     const userPlaying = document.getElementById("userPlaying");
        //     console.log("user: ",userPlaying.value);
        //     const updateScore = await fetch("/game/endGame", {
        //         method : "POST",
        //         headers : { 'Content-Type': 'application/json' },
        //         body : JSON.stringify({correct : correctPoints, wrong : wrongPoints, userPlaying : userPlaying.value}),
        //     });

        // }
        async function endGame() {
            const userPlaying = document.getElementById("userPlaying");
            try {
                const response = await fetch("/game/endGame", {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        correct: correctPoints,
                        wrong: wrongPoints,
                        userPlaying: userPlaying.value
                    }),
                });
                
                if(!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const html = await response.text();
                const container = document.querySelector(".container");
                if (container) {
                    container.innerHTML = html;

                    const scoreboard = document.getElementById("checklist-container");
                    if (scoreboard) {
                        scoreboard.classList.remove("hidden");
                        scoreboard.classList.add("visible");
                    }
                } else {
                    console.error("Container element not found");
                }
            } catch (error) {
                console.error("Error ending the game:", error);
            }
        }
        showCountdown();