(function() {
    // -- Constantes ----------------------------------------------------------
    const HISTORY_MAX = 4;
    const THEMES = ["css/style.css", "css/style_girly.css", "css/style_orange.css"];
    const THEME_IMAGES = ["", "img/image_ran_shinichi.png", "img/image_makeine.png"];
    const STORAGE_KEY = "playlists";
    const ACTIVE_KEY  = "activePlaylist";

    // -- Config (definie dans le HTML avant ce script) -----------------------
    const config = window.PLAYER_CONFIG;

    // Detection automatique du format d'URL
    function buildUrlAuto(song) {
        const videoUrl = song.HQ || song.MQ;
        if (videoUrl) {
            const url = videoUrl.startsWith("http")
                ? videoUrl
                : "https://eudist.animemusicquiz.com/" + videoUrl;
            return { type: "video", url };
        }
        const audioUrl = song.audio || "";
        const url = audioUrl.startsWith("http")
            ? audioUrl
            : "https://eudist.animemusicquiz.com/" + audioUrl;
        return { type: "audio", url };
    }

    // -- Etat ----------------------------------------------------------------
    const state = {
        musicData: [],
        currentIndex: 0,
        savedVolume: parseFloat(localStorage.getItem("savedVolume")) || 0.3,
        isShuffle: false,
        isRepeat: false,
        lastPlayedHistory: [],
        playlists: {},
        activePlaylist: "",
        searchQuery: ""
    };

    // -- Elements DOM --------------------------------------------------------
    const videoPlayer = document.getElementById("videoPlayer");
    const audioPlayer = document.getElementById("audioPlayer");

    // -- Historique ----------------------------------------------------------
    function updateHistory(index) {
        const song = state.musicData[index];
        if (!song) return;
        const newEntry = { anime: song.animeJPName, title: song.songName, artist: song.songArtist };
        state.lastPlayedHistory = state.lastPlayedHistory.filter(item =>
            !(item.anime === newEntry.anime && item.title === newEntry.title && item.artist === newEntry.artist)
        );
        state.lastPlayedHistory.unshift(newEntry);
        if (state.lastPlayedHistory.length > HISTORY_MAX) state.lastPlayedHistory.pop();
        displayHistory();
    }

    function displayHistory() {
        const container = document.getElementById("historyContainer");
        if (!container) return;
        const heading = document.createElement("h3");
        heading.textContent = "Historique";
        container.replaceChildren(heading);
        state.lastPlayedHistory.forEach(entry => {
            const div = document.createElement("div");
            div.classList.add("history-item");
            const p = document.createElement("p");
            const strong = document.createElement("strong");
            strong.textContent = entry.anime;
            const br = document.createElement("br");
            const em = document.createElement("em");
            em.textContent = `${entry.title} - ${entry.artist}`;
            p.appendChild(strong);
            p.appendChild(br);
            p.appendChild(em);
            div.appendChild(p);
            container.appendChild(div);
        });
    }

    // -- Lecteur -------------------------------------------------------------
    function prepareMusic(index, autoPlay) {
        if (state.musicData.length === 0) return;
        state.currentIndex = index;
        const song = state.musicData[state.currentIndex];
        const media = buildUrlAuto(song);
        if (media.type === "video") {
            if (audioPlayer) { audioPlayer.pause(); audioPlayer.src = ""; audioPlayer.style.display = "none"; }
            if (videoPlayer) {
                videoPlayer.src = media.url;
                videoPlayer.volume = state.savedVolume;
                videoPlayer.style.display = "block";
                videoPlayer.addEventListener("error", function() {
                    videoPlayer.src = "";
                    videoPlayer.style.display = "none";
                    if (audioPlayer) {
                        audioPlayer.src = media.url;
                        audioPlayer.volume = state.savedVolume;
                        audioPlayer.style.display = "block";
                        if (autoPlay) audioPlayer.play().catch(function() {});
                    }
                }, { once: true });
            }
        } else {
            if (videoPlayer) { videoPlayer.pause(); videoPlayer.src = ""; videoPlayer.style.display = "none"; }
            if (audioPlayer) {
                audioPlayer.src = media.url;
                audioPlayer.volume = state.savedVolume;
                audioPlayer.style.display = "block";
            }
        }
        updateSongInfo();
        highlightCurrentSong();
    }

    function playMusic(index) {
        if (state.musicData.length === 0) return;
        if (state.musicData[state.currentIndex]) updateHistory(state.currentIndex);
        prepareMusic(index, true);
        const active = (videoPlayer && videoPlayer.style.display !== "none") ? videoPlayer : audioPlayer;
        if (active) active.play().catch(() => {});
    }

    function playNext() {
        if (state.musicData.length === 0) return;
        if (state.isShuffle) { playRandomMusic(); return; }
        state.currentIndex = (state.currentIndex + 1) % state.musicData.length;
        playMusic(state.currentIndex);
    }

    function playPrevious() {
        if (state.musicData.length === 0) return;
        state.currentIndex = (state.currentIndex - 1 + state.musicData.length) % state.musicData.length;
        playMusic(state.currentIndex);
    }

    function playRandomMusic() {
        if (state.musicData.length === 0) return;
        if (state.musicData.length === 1) { playMusic(0); return; }
        let next;
        do { next = Math.floor(Math.random() * state.musicData.length); } while (next === state.currentIndex);
        playMusic(next);
    }

    function updateSongInfo() {
        const song = state.musicData[state.currentIndex];
        if (!song) return;
        const el = id => document.getElementById(id);
        if (el("songName"))   el("songName").textContent   = song.songName;
        if (el("artistName")) el("artistName").textContent = song.songArtist;
        if (el("animeName"))  el("animeName").textContent  = song.animeJPName;
        if (el("typeName"))   el("typeName").textContent   = song.songType;
    }

    function highlightCurrentSong() {
        document.querySelectorAll(".music-item").forEach(item => {
            const isActive = parseInt(item.dataset.index, 10) === state.currentIndex;
            item.classList.toggle("active", isActive);
            if (isActive) item.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
    }

    function stopPlayer() {
        if (videoPlayer) { videoPlayer.pause(); videoPlayer.src = ""; }
        if (audioPlayer) { audioPlayer.pause(); audioPlayer.src = ""; }
        clearSongInfo();
    }

    function clearSongInfo() {
        ["songName", "artistName", "animeName", "typeName"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = "";
        });
    }

    // -- Gestion des playlists -----------------------------------------------
    function isValidSong(item) {
        return typeof item === "object" && item !== null &&
            typeof item.songName === "string" &&
            typeof item.songArtist === "string" &&
            typeof item.animeJPName === "string" &&
            typeof item.songType === "string";
    }

    function savePlaylists() {
        state.playlists[state.activePlaylist] = state.musicData;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.playlists));
        localStorage.setItem(ACTIVE_KEY, state.activePlaylist);
    }

    function loadFromKey(key) {
        const saved = localStorage.getItem(key);
        if (!saved) return [];
        try {
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed.filter(isValidSong) : [];
        } catch (_) { return []; }
    }

    function deduplicateSongs(songs) {
        const seen = new Set();
        return songs.filter(song => {
            const key = `${song.songName}|${song.songArtist}|${song.animeJPName}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function loadPlaylists() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try { state.playlists = JSON.parse(saved); } catch (_) { state.playlists = {}; }
        }

        // Migration depuis les anciennes cles (config.storageKey / extraStorageKeys)
        if (Object.keys(state.playlists).length === 0) {
            const oldKeys = [config.storageKey].concat(config.extraStorageKeys || []);
            const merged = deduplicateSongs(oldKeys.flatMap(loadFromKey));
            state.playlists = { "Playlist 1": merged };
            oldKeys.forEach(key => localStorage.removeItem(key));
        }

        const savedActive = localStorage.getItem(ACTIVE_KEY);
        state.activePlaylist = (savedActive && state.playlists[savedActive])
            ? savedActive
            : Object.keys(state.playlists)[0];

        state.musicData = state.playlists[state.activePlaylist] || [];
        savePlaylists();
        renderMusicList();
    }

    function createPlaylist() {
        const name = prompt("Nom de la nouvelle playlist :");
        if (!name || !name.trim()) return;
        const trimmed = name.trim();
        if (state.playlists[trimmed]) {
            alert("Une playlist avec ce nom existe deja.");
            return;
        }
        state.playlists[trimmed] = [];
        state.activePlaylist = trimmed;
        state.musicData = [];
        state.currentIndex = 0;
        state.searchQuery = "";
        stopPlayer();
        savePlaylists();
        renderMusicList();
    }

    function switchPlaylist(name) {
        if (!state.playlists[name] || name === state.activePlaylist) return;
        state.activePlaylist = name;
        state.musicData = state.playlists[name];
        state.currentIndex = 0;
        state.searchQuery = "";
        stopPlayer();
        savePlaylists();
        renderMusicList();
        if (state.musicData.length > 0) prepareMusic(0);
    }

    function renamePlaylist() {
        const newName = prompt("Nouveau nom :", state.activePlaylist);
        if (!newName || !newName.trim()) return;
        const trimmed = newName.trim();
        if (trimmed === state.activePlaylist) return;
        if (state.playlists[trimmed]) {
            alert("Une playlist avec ce nom existe deja.");
            return;
        }
        state.playlists[trimmed] = state.playlists[state.activePlaylist];
        delete state.playlists[state.activePlaylist];
        state.activePlaylist = trimmed;
        savePlaylists();
        renderMusicList();
    }

    function deletePlaylist() {
        const names = Object.keys(state.playlists);
        if (names.length <= 1) {
            if (!confirm(`Vider la playlist "${state.activePlaylist}" ?`)) return;
            state.musicData = [];
            stopPlayer();
            savePlaylists();
            renderMusicList();
            return;
        }
        if (!confirm(`Supprimer la playlist "${state.activePlaylist}" ?`)) return;
        delete state.playlists[state.activePlaylist];
        state.activePlaylist = Object.keys(state.playlists)[0];
        state.musicData = state.playlists[state.activePlaylist];
        state.currentIndex = 0;
        stopPlayer();
        savePlaylists();
        renderMusicList();
        if (state.musicData.length > 0) prepareMusic(0);
    }

    // -- Rendu de la liste ---------------------------------------------------
    function renderMusicList() {
        const list = document.getElementById("musicList");
        if (!list) return;

        // Gestionnaire de playlists
        const manager = document.createElement("div");
        manager.className = "playlist-manager";

        const select = document.createElement("select");
        select.id = "playlist-select";
        select.setAttribute("aria-label", "Choisir une playlist");
        Object.keys(state.playlists).forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            option.selected = name === state.activePlaylist;
            select.appendChild(option);
        });
        select.addEventListener("change", () => switchPlaylist(select.value));

        const newBtn = document.createElement("button");
        newBtn.textContent = "+";
        newBtn.className = "btn playlist-btn";
        newBtn.setAttribute("aria-label", "Nouvelle playlist");
        newBtn.addEventListener("click", createPlaylist);

        const renameBtn = document.createElement("button");
        renameBtn.textContent = "✏️";
        renameBtn.className = "btn playlist-btn";
        renameBtn.setAttribute("aria-label", "Renommer la playlist");
        renameBtn.addEventListener("click", renamePlaylist);

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "❌";
        deleteBtn.className = "btn playlist-btn";
        deleteBtn.setAttribute("aria-label", "Supprimer la playlist");
        deleteBtn.addEventListener("click", deletePlaylist);

        if (document.getElementById("mobile-player")) {
            const dashLink = document.createElement("a");
            dashLink.href = "dashboard.html";
            dashLink.textContent = "🌸";
            dashLink.className = "btn playlist-btn";
            dashLink.setAttribute("aria-label", "Playlists communautaires");
            manager.appendChild(dashLink);
        }
        manager.appendChild(select);
        manager.appendChild(newBtn);
        manager.appendChild(renameBtn);
        manager.appendChild(deleteBtn);

        // Controles d'import / export
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.id = "fileInput";
        fileInput.accept = ".json";
        fileInput.setAttribute("aria-label", "Importer une playlist JSON");
        fileInput.addEventListener("change", handleFileUpload);

        const exportBtn = document.createElement("button");
        exportBtn.id = "exportButton";
        const isMobile = !!document.getElementById("mobile-player");
        exportBtn.className = isMobile ? "btn btn-secondary" : "btn playlist-btn";
        exportBtn.textContent = "💾";
        exportBtn.setAttribute("aria-label", "Exporter la playlist en JSON");
        exportBtn.addEventListener("click", exportPlaylist);

        const importRow = document.createElement("div");
        importRow.className = "import-row";
        importRow.appendChild(fileInput);
        importRow.appendChild(exportBtn);

        const heading = document.createElement("h2");
        heading.textContent = `Liste des chansons (${state.musicData.length})`;

        const searchInput = document.createElement("input");
        searchInput.type = "search";
        searchInput.className = "search-input";
        searchInput.placeholder = "Rechercher…";
        searchInput.setAttribute("aria-label", "Rechercher dans la playlist");
        searchInput.value = state.searchQuery;
        searchInput.addEventListener("input", function() {
            state.searchQuery = this.value.toLowerCase().trim();
            filterMusicItems();
        });

        list.replaceChildren(manager, importRow, heading, searchInput);

        if (state.musicData.length === 0) {
            const msg = document.createElement("p");
            msg.className = "empty-playlist-msg";
            msg.textContent = "Importe un fichier JSON pour commencer.";
            list.appendChild(msg);
            return;
        }

        state.musicData.forEach((music, index) => {
            const musicItem = document.createElement("div");
            musicItem.classList.add("music-item");
            musicItem.draggable = true;
            musicItem.dataset.index = index;

            const h3 = document.createElement("h3");
            h3.textContent = music.songName;
            if (music.songArtist) {
                const artistTag = document.createElement("span");
                artistTag.className = "song-artist-tag";
                artistTag.textContent = ` by ${music.songArtist}`;
                h3.appendChild(artistTag);
            }

            const p = document.createElement("p");
            const animeLabel = document.createElement("strong");
            animeLabel.textContent = "Anime : ";
            const typeLabel = document.createElement("strong");
            typeLabel.textContent = " | Type : ";
            p.appendChild(animeLabel);
            p.append(music.animeJPName);
            p.appendChild(typeLabel);
            p.append(music.songType);

            const deleteButton = document.createElement("button");
            deleteButton.classList.add("delete-button");
            deleteButton.textContent = "❌";
            deleteButton.setAttribute("aria-label", `Supprimer ${music.songName}`);
            deleteButton.addEventListener("click", function(event) {
                event.stopPropagation();
                deleteMusic(index);
            });

            musicItem.appendChild(h3);
            musicItem.appendChild(p);
            musicItem.appendChild(deleteButton);
            musicItem.addEventListener("dragstart", dragStart);
            musicItem.addEventListener("dragover", dragOver);
            musicItem.addEventListener("drop", drop);
            musicItem.addEventListener("click", () => playMusic(index));
            list.appendChild(musicItem);
        });

        filterMusicItems();
        highlightCurrentSong();
    }

    function filterMusicItems() {
        const q = state.searchQuery;
        document.querySelectorAll(".music-item").forEach(item => {
            const idx = parseInt(item.dataset.index, 10);
            const song = state.musicData[idx];
            if (!song) return;
            const match = !q ||
                song.songName.toLowerCase().includes(q) ||
                song.songArtist.toLowerCase().includes(q) ||
                song.animeJPName.toLowerCase().includes(q);
            item.style.display = match ? "" : "none";
        });
    }

    function showToast(message) {
        const existing = document.getElementById("toast-notification");
        if (existing) existing.remove();
        const toast = document.createElement("div");
        toast.id = "toast-notification";
        toast.className = "toast-notification";
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add("visible"));
        setTimeout(() => {
            toast.classList.remove("visible");
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const parsed = JSON.parse(e.target.result);
                if (!Array.isArray(parsed)) {
                    alert("Format invalide : le fichier doit contenir un tableau JSON.");
                    return;
                }
                const valid = parsed.filter(isValidSong);
                if (valid.length === 0) {
                    alert("Aucune chanson valide trouvee dans le fichier.");
                    return;
                }
                state.musicData = state.musicData.concat(valid);
                state.searchQuery = "";
                savePlaylists();
                renderMusicList();
                const ignored = parsed.length - valid.length;
                showToast(ignored > 0
                    ? `${valid.length} chanson(s) ajoutée(s) — ${ignored} ignorée(s).`
                    : `${valid.length} chanson(s) ajoutée(s).`);
            } catch (_) {
                alert("Erreur lors du chargement du fichier JSON.");
            }
        };
        reader.readAsText(file);
    }

    function exportPlaylist() {
        const json = JSON.stringify(state.musicData, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${state.activePlaylist}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    function deleteMusic(index) {
        const isCurrentPlaying = index === state.currentIndex;
        state.musicData.splice(index, 1);
        savePlaylists();
        if (state.musicData.length === 0) {
            state.currentIndex = 0;
            stopPlayer();
        } else if (isCurrentPlaying) {
            state.currentIndex = Math.min(index, state.musicData.length - 1);
            playMusic(state.currentIndex);
        } else if (index < state.currentIndex) {
            state.currentIndex--;
        }
        renderMusicList();
    }

    function dragStart(event) {
        const item = event.target.closest(".music-item");
        if (item) event.dataTransfer.setData("text/plain", item.dataset.index);
    }
    function dragOver(event) { event.preventDefault(); }
    function drop(event) {
        event.preventDefault();
        const fromIndex = parseInt(event.dataTransfer.getData("text/plain"), 10);
        const target = event.target.closest(".music-item");
        if (!target) return;
        const toIndex = parseInt(target.dataset.index, 10);
        if (!isNaN(fromIndex) && !isNaN(toIndex) && fromIndex !== toIndex) {
            const movedItem = state.musicData.splice(fromIndex, 1)[0];
            state.musicData.splice(toIndex, 0, movedItem);
            savePlaylists();
            renderMusicList();
        }
    }

    function clearAllMusic() {
        if (!confirm("Vider toute la playlist ?")) return;
        state.musicData = [];
        savePlaylists();
        stopPlayer();
        renderMusicList();
    }

    // -- Theme ---------------------------------------------------------------
    function setFloatingImage(src) {
        const image = document.querySelector(".floating-image");
        if (!image) return;
        image.setAttribute("src", src);
        image.style.display = src ? "block" : "none";
    }

    function toggleTheme() {
        const themeLink = document.getElementById("theme-link");
        if (!themeLink) return;
        const currentIdx = THEMES.indexOf(themeLink.getAttribute("href"));
        const nextIdx = (currentIdx + 1) % THEMES.length;
        themeLink.setAttribute("href", THEMES[nextIdx]);
        localStorage.setItem("selectedTheme", THEMES[nextIdx]);
        localStorage.setItem("dashboard_theme", nextIdx);
        const imgSrc = THEME_IMAGES[nextIdx];
        setFloatingImage(imgSrc);
        localStorage.setItem("selectedImage", imgSrc);
    }

    function restoreTheme() {
        const themeLink = document.getElementById("theme-link");
        const savedTheme = localStorage.getItem("selectedTheme");
        const savedImage = localStorage.getItem("selectedImage");
        if (savedTheme && themeLink) themeLink.setAttribute("href", savedTheme);
        setFloatingImage(savedImage || "");
    }

// -- Initialisation ------------------------------------------------------
    document.addEventListener("DOMContentLoaded", function() {
        restoreTheme();
        window.toggleTheme = toggleTheme;

        if (videoPlayer) {
            videoPlayer.addEventListener("volumechange", () => {
                state.savedVolume = videoPlayer.volume;
                localStorage.setItem("savedVolume", state.savedVolume);
            });
            videoPlayer.addEventListener("ended", () => {
                if (state.isRepeat) playMusic(state.currentIndex);
                else if (state.isShuffle) playRandomMusic();
                else playNext();
            });
        }
        if (audioPlayer) {
            audioPlayer.addEventListener("volumechange", () => {
                state.savedVolume = audioPlayer.volume;
                localStorage.setItem("savedVolume", state.savedVolume);
            });
            audioPlayer.addEventListener("ended", () => {
                if (state.isRepeat) playMusic(state.currentIndex);
                else if (state.isShuffle) playRandomMusic();
                else playNext();
            });
        }

        loadPlaylists();
        if (state.musicData.length > 0) {
            const savedIdx = parseInt(localStorage.getItem('activeSongIndex'));
            const startIdx = (!isNaN(savedIdx) && savedIdx >= 0 && savedIdx < state.musicData.length) ? savedIdx : 0;
            localStorage.removeItem('activeSongIndex');
            prepareMusic(startIdx);
        }

        const prevBtn   = document.getElementById("prevButton");
        const nextBtn   = document.getElementById("nextButton");
        const randomBtn = document.getElementById("randomButton");
        const repeatBtn = document.getElementById("repeatButton");
        const clearBtn  = document.getElementById("clearButton");
        const toggleHistoryBtn = document.getElementById("toggle-history");
        const historyBox       = document.getElementById("history-box");

        const playPauseBtn = document.getElementById("playPauseButton");
        if (playPauseBtn) {
            const syncIcon = () => {
                const active = videoPlayer && videoPlayer.style.display !== "none" ? videoPlayer : audioPlayer;
                playPauseBtn.textContent = (active && !active.paused) ? "⏸" : "▶";
            };
            playPauseBtn.addEventListener("click", () => {
                const active = videoPlayer && videoPlayer.style.display !== "none" ? videoPlayer : audioPlayer;
                if (!active) return;
                active.paused ? active.play() : active.pause();
            });
            if (videoPlayer) { videoPlayer.addEventListener("play", syncIcon); videoPlayer.addEventListener("pause", syncIcon); }
            if (audioPlayer) { audioPlayer.addEventListener("play", syncIcon); audioPlayer.addEventListener("pause", syncIcon); }
        }

        if (prevBtn)   prevBtn.addEventListener("click", playPrevious);
        if (nextBtn)   nextBtn.addEventListener("click", playNext);
        if (randomBtn) randomBtn.addEventListener("click", function() {
            state.isShuffle = !state.isShuffle;
            this.classList.toggle("active", state.isShuffle);
        });
        if (repeatBtn) repeatBtn.addEventListener("click", function() {
            state.isRepeat = !state.isRepeat;
            this.classList.toggle("active", state.isRepeat);
        });
        if (clearBtn) clearBtn.addEventListener("click", clearAllMusic);
        if (toggleHistoryBtn && historyBox) {
            toggleHistoryBtn.addEventListener("click", () => {
                historyBox.style.display = historyBox.style.display === "block" ? "none" : "block";
            });
        }

        document.addEventListener("keydown", function(e) {
            if (e.target.tagName === "INPUT") return;
            if (e.code === "Space") {
                e.preventDefault();
                const active = videoPlayer && videoPlayer.style.display !== "none" ? videoPlayer : audioPlayer;
                if (active) active.paused ? active.play() : active.pause();
            }
            if (e.code === "ArrowRight") playNext();
            if (e.code === "ArrowLeft")  playPrevious();
        });

        // Swipe pour replier/ouvrir le player mobile
        const mobilePlayer = document.getElementById("mobile-player");
        const playerHandle = document.querySelector(".player-handle");
        if (mobilePlayer) {
            let touchStartY = 0;
            mobilePlayer.addEventListener("touchstart", function(e) {
                touchStartY = e.touches[0].clientY;
            }, { passive: true });
            mobilePlayer.addEventListener("touchend", function(e) {
                const deltaY = e.changedTouches[0].clientY - touchStartY;
                if (deltaY > 40) mobilePlayer.classList.add("collapsed");
                else if (deltaY < -40) mobilePlayer.classList.remove("collapsed");
            }, { passive: true });
            if (playerHandle) {
                playerHandle.addEventListener("click", function() {
                    mobilePlayer.classList.toggle("collapsed");
                });
            }
        }

    });
})();
