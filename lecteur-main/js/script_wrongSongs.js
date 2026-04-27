let musicData = [];
let currentIndex = 0;
let savedVolume = 0.3;
let isShuffle = false;
let isRepeat = false;

const audioPlayer = document.getElementById("audioPlayer");
const musicList = document.getElementById("musicList");

let lastPlayedHistory = [];

function updateHistory(index) {
    const song = musicData[index];
    if (!song) return;

    const newEntry = {
        anime: song.animeJPName,
        title: song.songName,
        artist: song.songArtist
    };

    // Supprime si déjà présent (évite les doublons consécutifs)
    lastPlayedHistory = lastPlayedHistory.filter(item =>
        !(item.anime === newEntry.anime && item.title === newEntry.title && item.artist === newEntry.artist)
    );

    // Ajoute au début
    lastPlayedHistory.unshift(newEntry);

    // Limite à 4 éléments
    if (lastPlayedHistory.length > 4) {
        lastPlayedHistory.pop();
    }

    displayHistory();
}

function displayHistory() {
    const historyContainer = document.getElementById("historyContainer");
    if (!historyContainer) return;

    historyContainer.innerHTML = "<h3>🎵 Historique</h3>";
    lastPlayedHistory.forEach(entry => {
        const div = document.createElement("div");
        div.classList.add("history-item");
        div.innerHTML = `
            <p><strong>${entry.anime}</strong><br> <em>${entry.title} - ${entry.artist}</em></p>
        `;
        historyContainer.appendChild(div);
    });
}

//--Charger les données----------
function loadPlaylist() {
    const savedPlaylist = localStorage.getItem("playlist_wrongSongs");
    if (savedPlaylist) {
        musicData = JSON.parse(savedPlaylist);
    }
    displayMusicList();
}

window.onload = function() {
    loadPlaylist();
    videoPlayer.volume = savedVolume;

    if (musicData.length > 0) {
        playMusic(0);
    }
}
//-------------------------------

audioPlayer.addEventListener("volumechange", function() {
    savedVolume = audioPlayer.volume; 
});

document.getElementById("fileInput").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const newMusicData = JSON.parse(e.target.result);
                musicData = musicData.concat(newMusicData); // Ajoute les nouvelles chansons à la liste existante
                displayMusicList();
            } catch (error) {
                alert("Erreur lors du chargement du fichier JSON");
            }
        };
        reader.readAsText(file);
    }
});

function displayMusicList() {
    musicList.innerHTML = `<input type="file" id="fileInput" accept=".json">
    <button id="exportButton" class="btn">💾</button>
    <h2>Liste des chansons (${musicData.length})</h2>`;

    document.getElementById("fileInput").addEventListener("change", handleFileUpload);
    document.getElementById("exportButton").addEventListener("click", exportPlaylist);

    musicData.forEach((music, index) => {
        const musicItem = document.createElement("div");
        musicItem.classList.add("music-item");
        musicItem.draggable = true;
        musicItem.dataset.index = index;
        musicItem.innerHTML = `
            <h3>${music.songName} - ${music.songArtist}</h3>
            <p><strong>Anime:</strong> ${music.animeJPName} | <strong>Type:</strong> ${music.songType}</p>
        `;

        //--Bouton supprimer chaque élément-----------------------------------------------
        const deleteButton = document.createElement("button");
        deleteButton.classList.add("delete-button");
        deleteButton.innerHTML = "❌";
        deleteButton.addEventListener("click", function(event) {
            event.stopPropagation();
            deleteMusic(index);
        });
        musicItem.appendChild(deleteButton);
        //--------------------------------------------------------------------------------

        musicItem.addEventListener("dragstart", dragStart);
        musicItem.addEventListener("dragover", dragOver);
        musicItem.addEventListener("drop", drop);

        musicItem.addEventListener("click", function() {
            playMusic(index);
        });

        musicList.appendChild(musicItem);
    });

    document.getElementById("exportButton").addEventListener("click", exportPlaylist);
    highlightCurrentSong();
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const newMusicData = JSON.parse(e.target.result);
                musicData = musicData.concat(newMusicData); // Ajoute les nouvelles chansons

                localStorage.setItem("playlist_wrongSongs", JSON.stringify(musicData));

                displayMusicList();
            } catch (error) {
                alert("Erreur lors du chargement du fichier JSON");
            }
        };
        reader.readAsText(file);
    }
}

function dragStart(event) {
    event.dataTransfer.setData("text/plain", event.target.dataset.index);
}

function dragOver(event) {
    event.preventDefault();
}

function drop(event) {
    event.preventDefault();
    const fromIndex = event.dataTransfer.getData("text/plain");
    const toIndex = event.target.dataset.index;
    
    if (fromIndex !== undefined && toIndex !== undefined) {
        const movedItem = musicData.splice(fromIndex, 1)[0];
        musicData.splice(toIndex, 0, movedItem);

        localStorage.setItem("playlist_wrongSongs", JSON.stringify(musicData)); // Sauvegarde
        displayMusicList();
    }
}

const videoPlayer = document.getElementById("videoPlayer");

function playMusic(index) {
    if (musicData.length === 0) return;

    if (currentIndex !== null && currentIndex !== undefined && musicData[currentIndex]) {
        updateHistory(currentIndex);
    }

    currentIndex = index;

    videoPlayer.src = musicData[currentIndex].HQ;
    audioPlayer.volume = savedVolume;
    videoPlayer.play();

    updateSongInfo();
    highlightCurrentSong();

}


function updateSongInfo() {
    const song = musicData[currentIndex];
    document.getElementById("songName").textContent = song.songName;
    document.getElementById("artistName").textContent = song.songArtist;
    document.getElementById("animeName").textContent = song.animeJPName;
    document.getElementById("typeName").textContent = song.songType;
}

function highlightCurrentSong() {
    const items = document.querySelectorAll(".music-item");
    items.forEach((item, index) => {
        item.classList.toggle("active", index == currentIndex);
    });
}

document.getElementById("prevButton").addEventListener("click", playPrevious);
document.getElementById("nextButton").addEventListener("click", playNext);

document.getElementById("randomButton").addEventListener("click", function () {
    isShuffle = !isShuffle;

    if (isShuffle) {
        this.classList.add("active"); 
    } else {
        this.classList.remove("active");
    }
});

audioPlayer.addEventListener("ended", function () {
    if (isRepeat) {
        playMusic(currentIndex);
    } else if (isShuffle) {
        playRandomMusic();
    } else {
        playNext();
    }
});

function playRandomMusic() {
    if (musicData.length === 0) return;
    const randomIndex = Math.floor(Math.random() * musicData.length);
    playMusic(randomIndex);
}

function playPrevious() {
    if (musicData.length === 0) return;
    currentIndex = (currentIndex - 1 + musicData.length) % musicData.length;
    playMusic(currentIndex);
}

function playNext() {
    if (musicData.length === 0) return;
    if (isShuffle) {
        playRandomMusic();
    } else {
        currentIndex = (currentIndex + 1) % musicData.length;
        playMusic(currentIndex);
    }
}

document.getElementById("repeatButton").addEventListener("click", function () {
    isRepeat = !isRepeat;
    this.classList.toggle("active", isRepeat);
});

function deleteMusic(index) {
    const isCurrentPlaying = index === currentIndex;

    musicData.splice(index, 1);
    localStorage.setItem("playlist_wrongSongs", JSON.stringify(musicData)); // Sauvegarde

    if (musicData.length === 0) {
        currentIndex = 0;
        videoPlayer.pause();
        videoPlayer.src = "";
    } else {
        if (isCurrentPlaying) {
            currentIndex = Math.min(index, musicData.length - 1);
            playMusic(currentIndex);
        } else if (index < currentIndex) {
            currentIndex--;
        }
    }

    displayMusicList();
}

function exportPlaylist() {
    const json = JSON.stringify(musicData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "playlist.json";
    link.click();
    URL.revokeObjectURL(url);
}

videoPlayer.addEventListener("ended", function () {
    if (isRepeat) {
        playMusic(currentIndex);
    } else if (isShuffle) {
        playRandomMusic();
    } else {
        playNext();
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const savedPlaylist = localStorage.getItem("playlist_wrongSongs");
    if (savedPlaylist) {
        musicData = JSON.parse(savedPlaylist);
        displayMusicList();
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const clearButton = document.getElementById("clearButton");

    if (clearButton) {
        clearButton.addEventListener("click", function() {
            // Supprimer toutes les musiques de la liste
            musicData = [];
            localStorage.removeItem("playlist_wrongSongs");
            clearAllMusic();
            displayMusicList(); // Mettre à jour l'affichage
        });
    }
});

function clearAllMusic() {
    const playlist = document.getElementById("playlist_wrongSongs");

    if (playlist) {
        // Vider toutes les musiques dans la playlist
        playlist.innerHTML = "";
        console.log("Toutes les musiques ont été supprimées !");
    } else {
        console.log("Erreur : Conteneur de la playlist introuvable");
    }
}

//--Changer thème--------------------------------------------------------------

function toggleTheme() {
    const themeLink = document.getElementById("theme-link");
    const image = document.querySelector(".floating-image");
    const currentTheme = themeLink.getAttribute("href");

    if (currentTheme === "css/style.css") {
        themeLink.setAttribute("href", "css/style_girly.css");
        localStorage.setItem("selectedTheme", "css/style_girly.css");
        image.setAttribute("src", "img/image_ran_shinichi.png"); 
        localStorage.setItem("selectedImage", "img/image_ran_shinichi.png");
    } else if (currentTheme === "css/style_girly.css") {
        themeLink.setAttribute("href", "css/style_orange.css");
        localStorage.setItem("selectedTheme", "css/style_orange.css");
        image.setAttribute("src", "img/image_makeine.png");
        localStorage.setItem("selectedImage", "img/image_makeine.png");
    } else {
        themeLink.setAttribute("href", "css/style.css");
        localStorage.setItem("selectedTheme", "css/style.css");
        image.setAttribute("src", "");
        localStorage.setItem("selectedImage", "");
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const themeLink = document.getElementById("theme-link");
    const image = document.querySelector(".floating-image");
    const savedTheme = localStorage.getItem("selectedTheme");
    const savedImage = localStorage.getItem("selectedImage");

    if (savedTheme) {
        themeLink.setAttribute("href", savedTheme);
    }
    if (savedImage) {
        image.setAttribute("src", savedImage);
    }
});

//-----------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    let score = 0;
    let gameActive = false;

    // Créer le bouton pour activer/désactiver le jeu
    const toggleButton = document.createElement("button");
    toggleButton.id = "game-toggle-btn";
    toggleButton.textContent = "🎮";
    document.body.appendChild(toggleButton);

    const scoreDisplay = document.createElement("div");
    scoreDisplay.classList.add("score-display");
    scoreDisplay.textContent = "Score: 0";
    document.body.appendChild(scoreDisplay);

    // Masquer le score au début
    scoreDisplay.style.display = "none";

    function createCircle() {
        const circle = document.createElement("div");
        circle.classList.add("circle");

        const size = Math.random() * 40 + 30;
        const x = Math.random() * (window.innerWidth - size);
        const y = Math.random() * (window.innerHeight - size);

        circle.style.width = `${size}px`;
        circle.style.height = `${size}px`;
        circle.style.left = `${x}px`;
        circle.style.top = `${y}px`;

        document.body.appendChild(circle);

        circle.addEventListener("click", () => {
            score++;
            scoreDisplay.textContent = `Score: ${score}`;
            circle.remove();
        });

        setTimeout(() => {
            if (circle.parentNode) {
                circle.remove();
            }
        }, 1000);
    }

    let circleInterval;

    // Fonction pour activer/désactiver le jeu
    function toggleGame() {
        if (gameActive) {
            clearInterval(circleInterval);
            scoreDisplay.style.display = "none";
            toggleButton.textContent = "🎮";
            gameActive = false;
        } else {
            score = 0;
            scoreDisplay.textContent = `Score: ${score}`;
            scoreDisplay.style.display = "block";
            circleInterval = setInterval(createCircle, 800);
            toggleButton.textContent = "Arrêter le jeu";
            gameActive = true;
        }
    }

    toggleButton.addEventListener("click", toggleGame);

    const toggleBtn = document.getElementById("toggle-history");
    const historyBox = document.getElementById("history-box");

    if (toggleBtn && historyBox) {
    toggleBtn.addEventListener("click", () => {
        const isVisible = historyBox.style.display === "block";
        historyBox.style.display = isVisible ? "none" : "block";
    });
    }
    s
});