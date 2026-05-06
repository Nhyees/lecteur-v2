(function() {
    // -- Constantes ----------------------------------------------------------
    const HISTORY_MAX = 4;
    const THEMES = ["css/style.css", "css/style_girly.css", "css/style_orange.css", "css/style_aria.css"];
    const THEME_IMAGES = ["", "img/image_ran_shinichi.png", "img/image_makeine.png", "img/aria.png"];
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
        searchQuery: "",
        sortMode: "default"
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
        deleteBtn.textContent = "🗑️";
        deleteBtn.className = "btn playlist-btn";
        deleteBtn.setAttribute("aria-label", "Supprimer la playlist");
        deleteBtn.addEventListener("click", deletePlaylist);

        const isMobile = !!document.getElementById("mobile-player");

        if (isMobile) {
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

        const exportBtn = document.createElement("button");
        exportBtn.id = "exportButton";
        exportBtn.className = "btn playlist-btn";
        exportBtn.textContent = "💾";
        exportBtn.setAttribute("aria-label", "Exporter la playlist en JSON");
        exportBtn.addEventListener("click", exportPlaylist);
        manager.appendChild(exportBtn);

        // Controles d'import
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.id = "fileInput";
        fileInput.accept = ".json";
        fileInput.style.display = "none";
        fileInput.setAttribute("aria-label", "Importer une playlist JSON");
        fileInput.addEventListener("change", handleFileUpload);

        let importRow = null;
        if (isMobile) {
            manager.appendChild(fileInput);
            const importLabel = document.createElement("label");
            importLabel.htmlFor = "fileInput";
            importLabel.className = "btn playlist-btn";
            importLabel.textContent = "📂";
            importLabel.setAttribute("aria-label", "Importer une playlist JSON");
            manager.appendChild(importLabel);
        } else {
            importRow = document.createElement("div");
            importRow.className = "import-row";
            importRow.appendChild(fileInput);
        }

        const heading = document.createElement("h2");
        heading.textContent = `Liste des chansons (${state.musicData.length})`;

        const sortBar = document.createElement("div");
        sortBar.className = "sort-bar";
        [["default", "Par défaut"], ["title", "Titre"], ["anime", "Anime"]].forEach(([mode, label]) => {
            const btn = document.createElement("button");
            btn.className = "sort-btn" + (state.sortMode === mode ? " active" : "");
            btn.textContent = label;
            btn.addEventListener("click", () => {
                state.sortMode = mode;
                renderMusicList();
            });
            sortBar.appendChild(btn);
        });

        const headingRow = document.createElement("div");
        headingRow.className = "heading-row";
        headingRow.appendChild(heading);
        headingRow.appendChild(sortBar);

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

        const listChildren = importRow
            ? [manager, importRow, headingRow, searchInput]
            : [manager, headingRow, searchInput];
        list.replaceChildren(...listChildren);

        if (state.musicData.length === 0) {
            const msg = document.createElement("p");
            msg.className = "empty-playlist-msg";
            msg.textContent = "Importe un fichier JSON pour commencer.";
            list.appendChild(msg);
            return;
        }

        const sortedIndices = state.musicData.map((_, i) => i).sort((a, b) => {
            const ma = state.musicData[a], mb = state.musicData[b];
            if (state.sortMode === "title")
                return (ma.songName || "").localeCompare(mb.songName || "", "fr", { sensitivity: "base" });
            if (state.sortMode === "anime")
                return (ma.animeJPName || "").localeCompare(mb.animeJPName || "", "fr", { sensitivity: "base" })
                    || (ma.songName || "").localeCompare(mb.songName || "", "fr", { sensitivity: "base" });
            return 0;
        });

        sortedIndices.forEach(index => {
            const music = state.musicData[index];
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
                    alert("Aucune chanson valide trouvée dans le fichier.");
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

// -- Blindtest -----------------------------------------------------------

    const bt = {
        active: false,
        total: 0,
        played: 0,
        correct: 0,
        revealed: false,
        songIndices: [],
        currentRound: 0,
        listVisible: false,
        mode: "buttons",
        answerPool: [],
        results: []
    };

    function btUpdateUI() {
        const scoreEl      = document.getElementById("bt-score");
        const revealBtn    = document.getElementById("bt-reveal-btn");
        const answerBtns   = document.getElementById("bt-answer-btns");
        const volumeRow    = document.getElementById("bt-volume-row");
        const btBtn        = document.getElementById("bt-toggle-btn");
        const listToggle   = document.getElementById("bt-list-toggle");
        const controlsEl   = document.querySelector(".controls");
        const musicListEl  = document.getElementById("musicList") || document.querySelector(".music-list");
        const historyBtn   = document.getElementById("toggle-history");

        // Score
        if (scoreEl) {
            scoreEl.style.display = bt.active ? "flex" : "none";
            if (bt.active) {
                const wrong = bt.played - bt.correct;
                const statsEl = document.getElementById("bt-score-stats");
                if (statsEl) {
                    statsEl.innerHTML =
                        `<span class="bt-s-ok">&#x2713; ${bt.correct}</span>` +
                        `<span class="bt-s-ko">&#x2717; ${wrong}</span>`;
                }
                const progEl = document.getElementById("bt-score-prog");
                if (progEl) progEl.textContent = `${bt.played} / ${bt.total}`;
                const segsEl = document.getElementById("bt-segs");
                if (segsEl) {
                    segsEl.innerHTML = "";
                    for (let i = 0; i < bt.total; i++) {
                        const seg = document.createElement("div");
                        let cls = "bt-seg ";
                        if (i < bt.results.length) cls += bt.results[i] ? "bt-seg-ok" : "bt-seg-ko";
                        else if (i === bt.currentRound) cls += "bt-seg-current";
                        else cls += "bt-seg-empty";
                        seg.className = cls;
                        segsEl.appendChild(seg);
                    }
                }
                const pauseBtn = document.getElementById("bt-pause-btn");
                if (pauseBtn) {
                    const med = (videoPlayer && videoPlayer.style.display !== "none") ? videoPlayer : audioPlayer;
                    pauseBtn.textContent = (med && !med.paused) ? "⏸" : "▶";
                }
            }
        }

        // Reveal / Reponse
        if (revealBtn)  revealBtn.style.display  = (bt.active && bt.mode === "buttons" && !bt.revealed) ? "flex" : "none";
        if (answerBtns) answerBtns.style.display = (bt.active && bt.mode === "buttons" && bt.revealed)  ? "flex"        : "none";

        const textWrap = document.getElementById("bt-text-wrap");
        if (textWrap) textWrap.style.display = (bt.active && bt.mode === "text" && !bt.revealed) ? "flex" : "none";

        // Volume
        if (volumeRow) volumeRow.style.display = bt.active ? "flex" : "none";

        // Controles de navigation : masques pendant le blindtest
        const isMob = !!document.getElementById("mobile-player");
        if (controlsEl) {
            if (isMob) {
                ["prevButton","nextButton","randomButton","repeatButton","playPauseButton"].forEach(function(id) {
                    const el = document.getElementById(id);
                    if (el) el.style.display = bt.active ? "none" : "";
                });
            } else {
                controlsEl.style.display = bt.active ? "none" : "";
            }
        }

        // Bouton historique mobile : masque pendant le blindtest
        if (historyBtn) historyBtn.style.display = bt.active ? "none" : "";

        // Masquer / montrer la liste
        if (musicListEl) musicListEl.style.display = (bt.active && !bt.listVisible) ? "none" : "";
        if (listToggle) {
            listToggle.style.display  = bt.active ? "flex" : "none";
            listToggle.title = bt.listVisible ? "Masquer la liste" : "Afficher la liste";
        }

        // Video : filtre noir quand non revele
        if (videoPlayer) {
            videoPlayer.style.filter        = (bt.active && !bt.revealed) ? "brightness(0)" : "";
            videoPlayer.style.pointerEvents = (bt.active && !bt.revealed) ? "none"           : "";
        }

        // Infos chanson : cachees quand non revele
        const songInfoEl = document.getElementById("songInfo");
        if (songInfoEl) songInfoEl.style.visibility = (bt.active && !bt.revealed) ? "hidden" : "";

        // Bouton 🎮 : actif / inactif
        if (btBtn) btBtn.classList.toggle("active", bt.active);

        // Sync slider volume
        const volSlider = document.getElementById("bt-volume-slider");
        if (volSlider) {
            const med = (videoPlayer && videoPlayer.style.display !== "none") ? videoPlayer : audioPlayer;
            if (med) volSlider.value = med.volume;
        }
    }

    function btToggleList() {
        bt.listVisible = !bt.listVisible;
        btUpdateUI();
    }

    function btShowSetup() {
        if (bt.active) {
            const med = (videoPlayer && videoPlayer.style.display !== "none") ? videoPlayer : audioPlayer;
            if (med) med.pause();
            bt.active      = false;
            bt.revealed    = false;
            bt.listVisible = false;
            btUpdateUI();
            const sm = document.getElementById("bt-setup-modal");
            const em = document.getElementById("bt-end-modal");
            if (sm) sm.style.display = "none";
            if (em) em.style.display = "none";
            return;
        }
        if (state.musicData.length === 0) { showToast("Aucune chanson dans la playlist"); return; }
        const modal = document.getElementById("bt-setup-modal");
        const input = document.getElementById("bt-count-input");
        if (input) {
            input.max   = state.musicData.length;
            input.value = Math.min(10, state.musicData.length);
        }
        if (modal) {
            modal.querySelectorAll(".bt-mode-btn").forEach(function(b) {
                b.classList.toggle("active", b.dataset.mode === bt.mode);
            });
            modal.style.display = "flex";
        }
    }

    function btStart(n) {
        const indices = state.musicData.map(function(_, i) { return i; });
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = indices[i]; indices[i] = indices[j]; indices[j] = tmp;
        }
        bt.active       = true;
        bt.total        = Math.min(n, indices.length);
        bt.played       = 0;
        bt.correct      = 0;
        bt.revealed     = false;
        bt.listVisible  = false;
        bt.songIndices  = indices.slice(0, bt.total);
        bt.currentRound = 0;
        bt.results      = [];
        btPlayRound();
        if (bt.mode === "text") btLoadAnswerPool();
    }

    function btPlayRound() {
        bt.revealed        = false;
        const idx          = bt.songIndices[bt.currentRound];
        state.currentIndex = idx;
        updateSongInfo();

        const textInput    = document.getElementById("bt-text-input");
        const textDropdown = document.getElementById("bt-text-dropdown");
        if (textInput)    textInput.value = "";
        if (textDropdown) textDropdown.style.display = "none";

        const song  = state.musicData[idx];
        const media = buildUrlAuto(song);
        const isVid = media.type === "video";
        const useEl  = isVid ? videoPlayer : audioPlayer;
        const skipEl = isVid ? audioPlayer  : videoPlayer;

        if (skipEl) { skipEl.pause(); skipEl.src = ""; skipEl.style.display = "none"; }
        if (useEl) {
            useEl.src    = media.url;
            useEl.volume = state.savedVolume;
            useEl.style.display = "block";
            useEl.addEventListener("loadedmetadata", function() {
                const d = useEl.duration;
                if (d && isFinite(d)) useEl.currentTime = d * (0.1 + Math.random() * 0.5);
                useEl.play().catch(function() {});
            }, { once: true });
        }
        btUpdateUI();
    }

    function btReveal() {
        bt.revealed = true;
        highlightCurrentSong();
        btUpdateUI();
    }

    function btAnswer(isCorrect) {
        bt.results.push(isCorrect);
        if (isCorrect) bt.correct++;
        bt.played++;
        bt.currentRound++;
        btUpdateUI();
        if (bt.currentRound >= bt.total) {
            setTimeout(btEnd, 600);
            return;
        }
        setTimeout(btPlayRound, 800);
    }

    function btEnd() {
        bt.active      = false;
        bt.revealed    = false;
        bt.listVisible = false;
        btUpdateUI();
        const endModal = document.getElementById("bt-end-modal");
        if (endModal) {
            document.getElementById("bt-end-correct").textContent = bt.correct;
            document.getElementById("bt-end-total").textContent   = bt.total;
            endModal.style.display = "flex";
        }
    }

    async function btLoadAnswerPool() {
        bt.answerPool = state.musicData.map(function(s) {
            return { songName: s.songName || "", animeJPName: s.animeJPName || "", songArtist: s.songArtist || "" };
        });
        try {
            const res = await fetch(
                "https://hrqfykhakqngavtnxaxw.supabase.co/rest/v1/songs?select=titre,song_data",
                { headers: {
                    "apikey": "sb_publishable_5LFQPCK28SzPwlGOYQ_fuA_18Qt54T9",
                    "Authorization": "Bearer sb_publishable_5LFQPCK28SzPwlGOYQ_fuA_18Qt54T9"
                }}
            );
            if (res.ok) {
                const rows = await res.json();
                rows.forEach(function(row) {
                    const sd = row.song_data || {};
                    bt.answerPool.push({
                        songName:    sd.songName    || row.titre || "",
                        animeJPName: sd.animeJPName || "",
                        songArtist:  sd.songArtist  || ""
                    });
                });
            }
        } catch (_) {}
        const seen = new Set();
        bt.answerPool = bt.answerPool.filter(function(e) {
            const k = (e.songName || "").toLowerCase() + "|" + (e.animeJPName || "").toLowerCase();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }

    function btNorm(s) {
        return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    }

    function btGetSuggestions(query) {
        if (!query) return [];
        const q = btNorm(query);
        return bt.answerPool.filter(function(e) {
            return btNorm(e.songName).includes(q) ||
                   btNorm(e.animeJPName).includes(q) ||
                   btNorm(e.songArtist).includes(q);
        }).slice(0, 8);
    }

    function btEvalTextAnswer(entry) {
        const song  = state.musicData[bt.songIndices[bt.currentRound]];
        const match =
            (btNorm(entry.songName)    && btNorm(entry.songName)    === btNorm(song.songName))    ||
            (btNorm(entry.animeJPName) && btNorm(entry.animeJPName) === btNorm(song.animeJPName));
        const wrap = document.getElementById("bt-text-wrap");
        if (wrap) wrap.classList.add(match ? "bt-text-ok" : "bt-text-ko");
        bt.revealed = true;
        btUpdateUI();
        setTimeout(function() {
            if (wrap) wrap.classList.remove("bt-text-ok", "bt-text-ko");
            btAnswer(match);
        }, 1500);
    }

    function initBlindtestUI() {
        const controlsEl = document.querySelector(".controls");
        if (!controlsEl) return;
        const isMobile = !!document.getElementById("mobile-player");

        // Score : tout en haut, avant la video
        const scoreEl = document.createElement("div");
        scoreEl.id        = "bt-score";
        scoreEl.className = "bt-score";
        scoreEl.style.display = "none";

        const scoreTop = document.createElement("div");
        scoreTop.className = "bt-score-top";

        const scoreStats = document.createElement("div");
        scoreStats.id        = "bt-score-stats";
        scoreStats.className = "bt-score-stats";

        const pauseBtn = document.createElement("button");
        pauseBtn.id        = "bt-pause-btn";
        pauseBtn.className = "bt-pause-btn";
        pauseBtn.textContent = "⏸";
        pauseBtn.addEventListener("click", function() {
            const med = (videoPlayer && videoPlayer.style.display !== "none") ? videoPlayer : audioPlayer;
            if (!med) return;
            if (med.paused) {
                med.play().catch(function() {});
                this.textContent = "⏸";
            } else {
                med.pause();
                this.textContent = "▶";
            }
        });

        function syncPauseBtnIcon() {
            if (!bt.active) return;
            const btn = document.getElementById("bt-pause-btn");
            if (!btn) return;
            const med = (videoPlayer && videoPlayer.style.display !== "none") ? videoPlayer : audioPlayer;
            btn.textContent = (med && !med.paused) ? "⏸" : "▶";
        }
        if (videoPlayer) {
            videoPlayer.addEventListener("play",  syncPauseBtnIcon);
            videoPlayer.addEventListener("pause", syncPauseBtnIcon);
        }
        if (audioPlayer) {
            audioPlayer.addEventListener("play",  syncPauseBtnIcon);
            audioPlayer.addEventListener("pause", syncPauseBtnIcon);
        }

        const scoreProg = document.createElement("span");
        scoreProg.id        = "bt-score-prog";
        scoreProg.className = "bt-s-prog";

        scoreTop.appendChild(scoreStats);
        scoreTop.appendChild(scoreProg);
        scoreTop.appendChild(pauseBtn);

        const segsEl = document.createElement("div");
        segsEl.id        = "bt-segs";
        segsEl.className = "bt-segs";

        scoreEl.appendChild(scoreTop);
        scoreEl.appendChild(segsEl);

        if (isMobile) {
            const collapsible = document.querySelector(".player-collapsible");
            if (collapsible) collapsible.insertAdjacentElement("beforebegin", scoreEl);
            else controlsEl.insertAdjacentElement("beforebegin", scoreEl);
        } else {
            if (videoPlayer) videoPlayer.insertAdjacentElement("beforebegin", scoreEl);
            else controlsEl.insertAdjacentElement("beforebegin", scoreEl);
        }

        // Bouton Reveler
        const revealBtn = document.createElement("button");
        revealBtn.id        = "bt-reveal-btn";
        revealBtn.className = "btn";
        revealBtn.textContent   = "Révéler";
        revealBtn.style.display = "none";
        revealBtn.addEventListener("click", btReveal);
        controlsEl.insertAdjacentElement("beforebegin", revealBtn);

        // Boutons Juste / Faux
        const answerBtns = document.createElement("div");
        answerBtns.id        = "bt-answer-btns";
        answerBtns.className = "bt-answer-btns";
        answerBtns.style.display = "none";
        const correctBtn = document.createElement("button");
        correctBtn.className   = "btn bt-correct-btn";
        correctBtn.textContent = "✓ Juste";
        correctBtn.addEventListener("click", function() { btAnswer(true); });
        const wrongBtn = document.createElement("button");
        wrongBtn.className   = "btn bt-wrong-btn";
        wrongBtn.textContent = "✗ Faux";
        wrongBtn.addEventListener("click", function() { btAnswer(false); });
        answerBtns.appendChild(correctBtn);
        answerBtns.appendChild(wrongBtn);
        controlsEl.insertAdjacentElement("beforebegin", answerBtns);

        // Mode texte : input + autocomplete + passer
        const textWrap = document.createElement("div");
        textWrap.id        = "bt-text-wrap";
        textWrap.className = "bt-text-wrap";
        textWrap.style.display = "none";

        const textInput = document.createElement("input");
        textInput.type         = "text";
        textInput.id           = "bt-text-input";
        textInput.className    = "bt-text-input";
        textInput.placeholder  = "Titre, anime ou artiste...";
        textInput.autocomplete = "off";

        const textDropdown = document.createElement("div");
        textDropdown.id        = "bt-text-dropdown";
        textDropdown.className = "bt-text-dropdown";
        textDropdown.style.display = "none";

        textInput.addEventListener("input", function() {
            const suggestions = btGetSuggestions(this.value);
            if (!this.value || suggestions.length === 0) { textDropdown.style.display = "none"; return; }
            textDropdown.innerHTML = "";
            suggestions.forEach(function(entry) {
                const item  = document.createElement("div");
                item.className = "bt-dd-item";
                const title = entry.songName || entry.animeJPName || "";
                const sub   = (entry.songName && entry.animeJPName) ? entry.animeJPName : "";
                item.innerHTML = "<span class='bt-dd-title'>" + title + "</span>" +
                    (sub ? "<span class='bt-dd-sub'> — " + sub + "</span>" : "");
                item.addEventListener("mousedown", function(e) {
                    e.preventDefault();
                    textInput.value = "";
                    textDropdown.style.display = "none";
                    btEvalTextAnswer(entry);
                });
                textDropdown.appendChild(item);
            });
            textDropdown.style.display = "block";
        });
        textInput.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                const suggestions = btGetSuggestions(this.value);
                if (suggestions.length > 0) {
                    this.value = "";
                    textDropdown.style.display = "none";
                    btEvalTextAnswer(suggestions[0]);
                }
                e.preventDefault();
            } else if (e.key === "Escape") {
                textDropdown.style.display = "none";
            }
        });
        textInput.addEventListener("blur", function() {
            setTimeout(function() { textDropdown.style.display = "none"; }, 150);
        });

        const skipBtn = document.createElement("button");
        skipBtn.className   = "btn bt-skip-btn";
        skipBtn.textContent = "Passer";
        skipBtn.addEventListener("click", function() {
            textInput.value = "";
            textDropdown.style.display = "none";
            btEvalTextAnswer({ songName: "«»", animeJPName: "«»" });
        });

        textWrap.appendChild(textInput);
        textWrap.appendChild(textDropdown);
        textWrap.appendChild(skipBtn);
        controlsEl.insertAdjacentElement("beforebegin", textWrap);

        // Slider de volume
        const volumeRow = document.createElement("div");
        volumeRow.id        = "bt-volume-row";
        volumeRow.className = "bt-volume-row";
        volumeRow.style.display = "none";
        const volIcon = document.createElement("span");
        volIcon.textContent = "🔊";
        const volSlider = document.createElement("input");
        volSlider.type  = "range";
        volSlider.id    = "bt-volume-slider";
        volSlider.min   = "0";
        volSlider.max   = "1";
        volSlider.step  = "0.05";
        volSlider.value = state.savedVolume;
        volSlider.addEventListener("input", function() {
            const v = parseFloat(this.value);
            if (videoPlayer) videoPlayer.volume = v;
            if (audioPlayer) audioPlayer.volume = v;
            state.savedVolume = v;
            localStorage.setItem("savedVolume", v);
        });
        volumeRow.appendChild(volIcon);
        volumeRow.appendChild(volSlider);
        if (audioPlayer) audioPlayer.insertAdjacentElement("afterend", volumeRow);
        else controlsEl.insertAdjacentElement("beforebegin", volumeRow);

        // Bouton 🎮 (fixe, bas droite)
        const btBtn = document.createElement("button");
        btBtn.id        = "bt-toggle-btn";
        btBtn.className = "bt-fab";
        btBtn.textContent = "🎮";
        btBtn.setAttribute("aria-label", "Mode Blindtest");
        btBtn.addEventListener("click", btShowSetup);
        if (isMobile) {
            btBtn.style.position     = "fixed";
            btBtn.style.left         = "0";
            btBtn.style.bottom       = "0";
            btBtn.style.background   = "transparent";
            btBtn.style.boxShadow    = "none";
            btBtn.style.fontSize     = "1.1em";
            btBtn.style.padding      = "8px";
            btBtn.style.fontWeight   = "normal";
            btBtn.style.color        = "#555";
            btBtn.style.borderRadius = "8px";
            btBtn.style.width        = "auto";
            btBtn.style.height       = "auto";
        } else {
            btBtn.style.bottom = "20px";
            btBtn.style.right  = "20px";
        }
        document.body.appendChild(btBtn);

        // Bouton toggle liste (fixe, au-dessus du 🎮)
        const listToggle = document.createElement("button");
        listToggle.id        = "bt-list-toggle";
        listToggle.className = "bt-fab";
        listToggle.textContent = "🦋";
        listToggle.title   = "Afficher la liste";
        listToggle.style.display = "none";
        listToggle.style.bottom = isMobile ? "70px" : "75px";
        if (isMobile) {
            listToggle.style.left            = "50%";
            listToggle.style.transform       = "translateX(-50%)";
            listToggle.style.background      = "transparent";
            listToggle.style.boxShadow       = "none";
            listToggle.style.fontSize        = "1.1em";
            listToggle.style.padding         = "8px";
            listToggle.style.fontWeight      = "normal";
            listToggle.style.color           = "#555";
            listToggle.style.borderRadius    = "8px";
            listToggle.style.width           = "auto";
            listToggle.style.height          = "auto";
        } else {
            listToggle.style.right = "20px";
        }
        listToggle.addEventListener("click", btToggleList);
        document.body.appendChild(listToggle);

        // Modal setup
        const setupModal = document.createElement("div");
        setupModal.id        = "bt-setup-modal";
        setupModal.className = "bt-modal-overlay";
        setupModal.style.display = "none";
        setupModal.innerHTML = [
            '<div class="bt-modal">',
            '  <h3>Blindtest</h3>',
            '  <div class="bt-mode-row">',
            '    <button class="bt-mode-btn active" data-mode="buttons">Validation</button>',
            '    <button class="bt-mode-btn" data-mode="text">Saisie</button>',
            '  </div>',
            '  <label for="bt-count-input">Nombre de chansons</label>',
            '  <input type="number" id="bt-count-input" min="1" value="10" class="bt-count-input">',
            '  <div class="bt-modal-btns">',
            '    <button id="bt-start-btn" class="btn">Lancer</button>',
            '    <button id="bt-cancel-btn" class="btn bt-cancel-btn">Annuler</button>',
            '  </div>',
            '</div>'
        ].join("");
        document.body.appendChild(setupModal);
        setupModal.querySelector("#bt-start-btn").addEventListener("click", function() {
            const n = parseInt(setupModal.querySelector("#bt-count-input").value);
            if (n > 0) { setupModal.style.display = "none"; btStart(n); }
        });
        setupModal.querySelector("#bt-cancel-btn").addEventListener("click", function() {
            setupModal.style.display = "none";
        });
        setupModal.querySelectorAll(".bt-mode-btn").forEach(function(btn) {
            btn.addEventListener("click", function() {
                setupModal.querySelectorAll(".bt-mode-btn").forEach(function(b) { b.classList.remove("active"); });
                this.classList.add("active");
                bt.mode = this.dataset.mode;
            });
        });

        // Modal fin
        const endModal = document.createElement("div");
        endModal.id        = "bt-end-modal";
        endModal.className = "bt-modal-overlay";
        endModal.style.display = "none";
        endModal.innerHTML = [
            '<div class="bt-modal">',
            '  <h3>Resultat</h3>',
            '  <div class="bt-result-score">',
            '    <span id="bt-end-correct" class="bt-s-ok">0</span>',
            '    <span class="bt-result-sep"> / </span>',
            '    <span id="bt-end-total">0</span>',
            '  </div>',
            '  <button id="bt-close-btn" class="btn">Fermer</button>',
            '</div>'
        ].join("");
        document.body.appendChild(endModal);
        endModal.querySelector("#bt-close-btn").addEventListener("click", function() {
            endModal.style.display = "none";
        });
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
                if (bt.active) return;
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
                if (bt.active) return;
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

        initBlindtestUI();

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
