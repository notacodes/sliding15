let results = {};
let bestTimes = {};
const puzzleContainer = document.querySelector("#puzzle-container");
let puzzle = [];
let size = 3;
let tilesize = 100;
let counter = 0;
let madeFirstMove = false;
let timerInterval;
let startTime;

puzzleContainer.style.width = `${size * tilesize}px`;
puzzleContainer.style.height = `${size * tilesize}px`;

document.addEventListener("DOMContentLoaded", () => {
    loadPuzzleFromURL();
    loadBestResults();
    loadDailySeedFromLocalStorage();
    loadDailyStreakFromLocalStorage();
    renderPuzzle();
    handleInput();
});

function seededRandom(seed) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function randomizePuzzleWithSeed(seed) {
    let attempt = 0;

    do {
        const randomValues = getRandomValuesWithSeed(seed);
        let i = 0;
        for (let puzzleItem of puzzle) {
            puzzleItem.value = randomValues[i];
            puzzleItem.disabled = false;
            i++;
        }

        const emptyPuzzle = puzzle.find((item) => item.value === size * size);
        emptyPuzzle.disabled = true;

        seed++;
        attempt++;
        if (attempt > 10000) {
            console.error("Zu viele Versuche, ein lösbares Puzzle zu erstellen.");
            return;
        }
    } while (!isPuzzleSolvable());

    renderPuzzle();
}


function isPuzzleSolvable() {
    let inversions = 0;
    const flatPuzzle = puzzle.filter(tile => !tile.disabled).map(tile => tile.value);

    // Count inversions
    for (let i = 0; i < flatPuzzle.length - 1; i++) {
        for (let j = i + 1; j < flatPuzzle.length; j++) {
            if (flatPuzzle[i] > flatPuzzle[j]) {
                inversions++;
            }
        }
    }

    const emptyTile = puzzle.find(tile => tile.disabled);
    const emptyRow = Math.ceil(emptyTile.position / size);
    const rowFromBottom = size - emptyRow + 1;

    if (size % 2 === 1) {
        return inversions % 2 === 0;
    }

    else {
        return (inversions + rowFromBottom) % 2 === 1;
    }
}

function getRandomValuesWithSeed(seed) {
    const values = Array.from({ length: size * size }, (_, i) => i + 1);
    const randomValues = [];

    for (let i = 0; i < size * size; i++) {
        const randomIndex = Math.floor(seededRandom(seed) * values.length);
        randomValues.push(values.splice(randomIndex, 1)[0]);
        seed++;
    }

    return randomValues;
}

function loadPuzzleFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const seed = urlParams.get("seed");
    const urlSize = urlParams.get("size");

    if (urlSize) {
        size = parseInt(urlSize);
        puzzleContainer.style.width = `${size * tilesize}px`;
        puzzleContainer.style.height = `${size * tilesize}px`;
    }

    generatePuzzle();
    if (seed) {
        randomizePuzzleWithSeed(parseInt(seed));
        const puzzlename = document.getElementById("puzzle-seed");
        puzzlename.innerHTML = `Puzzle#${seed}`;
    } else {
        const newSeed = Math.floor(Math.random() * 1000000);
        randomizePuzzleWithSeed(newSeed);
        updateURLWithSeed(newSeed);
        const puzzlename = document.getElementById("puzzle-seed");
        puzzlename.innerHTML = `Puzzle#${newSeed}`;
    }
}

function updateURLWithSeed(seed) {
    const newURL = `${window.location.origin}${window.location.pathname}?seed=${seed}&size=${size}`;
    history.replaceState(null, "", newURL);
}

function generatePuzzle() {
    puzzle = [];
    for (let i = 1; i <= size * size; i++) {
        puzzle.push({
            value: i,
            position: i,
            x: (getCol(i) - 1) * tilesize,
            y: (getRow(i) - 1) * tilesize,
            disabled: false,
        });
    }
}

function getRow(pos) {
    return Math.ceil(pos / size);
}

function getCol(pos) {
    const col = pos % size;
    return col === 0 ? size : col;
}

function renderPuzzle() {
    puzzleContainer.innerHTML = "";
    for (let puzzleItem of puzzle) {
        const tile = document.createElement("wired-button");
        tile.classList.add("puzzle-item");
        tile.style.left = `${puzzleItem.x}px`;
        tile.style.top = `${puzzleItem.y}px`;
        tile.innerHTML = puzzleItem.disabled ? "" : `<p id="puzzle-number">${puzzleItem.value}</p>`;

        if (puzzleItem.disabled) tile.classList.add("empty");

        tile.addEventListener("click", () => handleTileClick(puzzleItem));
        puzzleContainer.appendChild(tile);
        const copyButton = document.getElementById('copyButton');
        if (copyButton) {
            copyButton.addEventListener('click', copyLinkToClipboard);
        }
    }
}

function handleTileClick(clickedTile) {
    const emptyTile = getEmptyPuzzle();
    moveTileIfValid(clickedTile, emptyTile);
    if (!madeFirstMove) {
        startTimer();
        madeFirstMove = true;
    }
}

function getEmptyPuzzle() {
    return puzzle.find((tile) => tile.disabled);
}

function isPuzzleSolved() {
    for (let tile of puzzle) {
        const expectedX = ((tile.value - 1) % size) * tilesize;
        const expectedY = Math.floor((tile.value - 1) / size) * tilesize;

        if (tile.x !== expectedX || tile.y !== expectedY) {
            return false;
        }
    }
    return true;
}

function moveTileIfValid(tile, emptyTile) {
    const isAdjacent = Math.abs(tile.x - emptyTile.x) + Math.abs(tile.y - emptyTile.y) === tilesize;
    if (isAdjacent) {
        [tile.x, emptyTile.x] = [emptyTile.x, tile.x];
        [tile.y, emptyTile.y] = [emptyTile.y, tile.y];
        [tile.position, emptyTile.position] = [emptyTile.position, tile.position];
        counter++;
        updateCounter();
        renderPuzzle();
        if (isPuzzleSolved()) {
            solved();
            updateResults();
            counter = 0;
            updateCounter();
            solved = isdailyChallengeSolved();
            console.log(solved)
            if (solved === true){
                markDailyChallengeAsSolved();
            }
        }
    }
}

const shuffel = document.getElementById("shuffle");
shuffel.addEventListener("click", shufflePuzzle);

function shufflePuzzle() {
    madeFirstMove = false;
    counter = 0;
    updateCounter();
    resetTimer();
    const newSeed = Math.floor(Math.random() * 1000000);
    randomizePuzzleWithSeed(newSeed);
    updateURLWithSeed(newSeed);
    const puzzlename = document.getElementById("puzzle-seed");
    puzzlename.innerHTML = `Puzzle#${newSeed}`;

}

const goBigger = document.getElementById("goBigger");
goBigger.addEventListener("click", biggerPuzzle);

function biggerPuzzle() {
    resetTimer();
    madeFirstMove = false;
    if(size < 6){
        size++;
    }else{
        showCustomAlertW("Whoops! You've hit the puzzle limit. Time to take a breather!")
    }
    puzzle = [];
    puzzleContainer.style.width = `${size * tilesize}px`;
    puzzleContainer.style.height = `${size * tilesize}px`;
    generatePuzzle();

    const urlParams = new URLSearchParams(window.location.search);
    const currentSeed = urlParams.get("seed");
    const newSeed = currentSeed ? parseInt(currentSeed) : Math.floor(Math.random() * 1000000);

    randomizePuzzleWithSeed(newSeed);
    updateURLWithSeed(newSeed);
    renderPuzzle();
    handleInput();
    counter = 0;
    updateCounter();
}

const counterHTML = document.getElementById("counter");

function updateCounter() {
    counterHTML.innerHTML = counter;
}

function updateResults() {
    const sizeKey = `${size}x${size}`;
    const elapsedTime = Date.now() - startTime;
    const timeInSeconds = Math.floor(elapsedTime / 1000);

    if (!results[sizeKey] || counter < results[sizeKey]) {
        results[sizeKey] = counter;
    }

    if (!bestTimes[sizeKey] || timeInSeconds < bestTimes[sizeKey]) {
        bestTimes[sizeKey] = timeInSeconds;
    }

    saveResults();
    displayResults();
}

function displayResults() {
    const sizeKey = `${size}x${size}`;
    const bestMoves = results[sizeKey] || "N/A";
    const bestTime = bestTimes[sizeKey] ? `${Math.floor(bestTimes[sizeKey] / 60)}:${String(bestTimes[sizeKey] % 60).padStart(2, '0')}` : "N/A";

    document.getElementById("best-moves").textContent = bestMoves;
    document.getElementById("best-time").textContent = bestTime;
}
function saveResults() {
    localStorage.setItem("puzzleResults", JSON.stringify(results));
    localStorage.setItem("puzzleBestTimes", JSON.stringify(bestTimes));
}

function loadBestResults() {
    const savedResults = localStorage.getItem("puzzleResults");
    const savedBestTimes = localStorage.getItem("puzzleBestTimes");

    if (savedResults) {
        results = JSON.parse(savedResults);
    }

    if (savedBestTimes) {
        bestTimes = JSON.parse(savedBestTimes);
    }

    displayResults();
}

function Celebration() {
    const count = 230;
    const defaults = {
        origin: { y: 0.7 }
    };

    function fire(particleRatio, opts) {
        confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
        });
    }

    fire(0.25, {
        spread: 26,
        startVelocity: 55,
    });
    fire(0.2, {
        spread: 60,
    });
    fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8
    });
    fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2
    });
    fire(0.1, {
        spread: 120,
        startVelocity: 45,
    });
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsedTime = Date.now() - startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    document.getElementById('timer').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function stopTimer() {
    clearInterval(timerInterval);
}

function resetTimer() {
    stopTimer();
    document.getElementById('timer').textContent = '00:00';
}

function handleInput() {
    document.addEventListener("keydown", handleKeyDown);
}
function handleKeyDown(e) {
    const emptyTile = getEmptyPuzzle();
    let neighbor;

    switch (e.key) {
        case "ArrowLeft":
            neighbor = getTileByPosition(emptyTile.position + 1, getCol(emptyTile.position) < size);
            break;
        case "ArrowRight":
            neighbor = getTileByPosition(emptyTile.position - 1, getCol(emptyTile.position) > 1);
            break;
        case "ArrowUp":
            neighbor = getTileByPosition(emptyTile.position + size, getRow(emptyTile.position) < size);
            break;
        case "ArrowDown":
            neighbor = getTileByPosition(emptyTile.position - size, getRow(emptyTile.position) > 1);
            break;
    }

    if (neighbor) {
        moveTileIfValid(neighbor, emptyTile);

        if (!madeFirstMove) {
            startTimer();
            madeFirstMove = true;
        }
    }
}

function getTileByPosition(pos, condition) {
    return condition ? puzzle.find((tile) => tile.position === pos) : null;
}
function copyLinkToClipboard() {
    const currentUrl = window.location.href;
    const tempInput = document.createElement('input');
    document.body.appendChild(tempInput);
    tempInput.value = currentUrl;
    tempInput.select();
    tempInput.setSelectionRange(0, 99999);
    try {
        document.execCommand('copy');
        const button = document.getElementById('copyButton');
            const originalText = button.textContent;
            button.textContent = 'Copied, now paste!';

            setTimeout(() => {
                button.textContent = originalText;
            }, 1200);
    } catch (err) {
        console.error('Fehler beim Kopieren des Links:', err);
    }

    document.body.removeChild(tempInput);
}

function solved() {
    stopTimer();
    puzzleContainer.innerHTML = "";
    Celebration();
}
function loadDailySeedFromLocalStorage() {
    const today = new Date();
    let dateString = today.getFullYear() + today.getMonth() + today.getDate();
    let storedSeedData = localStorage.getItem('dailySeed');
    if (storedSeedData) {
        let parsedData = JSON.parse(storedSeedData);
        if (parsedData.date === dateString) {
                return;
        }
    }
    storedSeedData = {
        date: dateString,
        seed: dateString,
        isSolved: false
    };
    localStorage.setItem('dailySeed', JSON.stringify(storedSeedData));
}
function loadDailyStreakFromLocalStorage() {
    let streakData = JSON.parse(localStorage.getItem('dailyStreak'));
    if (!streakData) {
        streakData = {
            currentStreak: 0,
            lastSolvedDate: null
        };
        localStorage.setItem('dailyStreak', JSON.stringify(streakData));
    }else{
        console.log(new Date());
        console.log(new  Date(streakData.lastSolvedDate));
        console.log(getDateDifferenceInDays(new Date(), new  Date(streakData.lastSolvedDate)));
        if(getDateDifferenceInDays(new Date(), new Date(streakData.lastSolvedDate)) > 1) {
            streakData.currentStreak = 0;
            localStorage.setItem('dailyStreak', JSON.stringify(streakData));
        }
    }
    displayStreak();

}

function markDailyChallengeAsSolved() {
    let storedSeedData = localStorage.getItem('dailySeed');
    if (storedSeedData) {
        let parsedData = JSON.parse(storedSeedData);
        parsedData.isSolved = true;
        localStorage.setItem('dailySeed', JSON.stringify(parsedData));
        updateStreak();
        window.location.href = "daily-challenge.html";
    }
}
function isdailyChallengeSolved(){
    const urlParams = new URLSearchParams(window.location.search);
    const seed = urlParams.get("seed");
    console.log(seed);
    const storedSeedData = localStorage.getItem('dailySeed');
    const storedSeed = JSON.parse(storedSeedData);
    console.log(storedSeed.seed);

    return String(storedSeed.seed) === String(seed);

}

const link = document.getElementById("daily-challange");
link.addEventListener("click", onClickDailyChallenge)

function onClickDailyChallenge() {
    let storedSeedData = localStorage.getItem('dailySeed');
    let parsedData = JSON.parse(storedSeedData);
    if (parsedData.isSolved) {
        window.location.href = `daily-challenge.html`;
    }else{
        window.location.href = `index.html?seed=${parsedData.seed}&size=4`;
    }
}

function getDateDifferenceInDays(today, lastSolvedDate) {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.floor((today - lastSolvedDate) / MS_PER_DAY);
}

function updateStreak() {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];

    let streakData = JSON.parse(localStorage.getItem('dailyStreak')) || { currentStreak: 0, lastSolvedDate: null };

    if (streakData.lastSolvedDate === dateString) {
        return;
    }

    if (streakData.lastSolvedDate) {
        const lastSolvedDate = new  Date(streakData.lastSolvedDate);
        console.log((today - lastSolvedDate));
        const differenceInDays = getDateDifferenceInDays(today, lastSolvedDate);
        if (differenceInDays === 1) {
            streakData.currentStreak++;
        } else if (differenceInDays > 1) {
            streakData.currentStreak = 1;
        }
    } else {
        streakData.currentStreak = 1;
    }

    streakData.lastSolvedDate = dateString;
    localStorage.setItem('dailyStreak', JSON.stringify(streakData));

    displayStreak();
}

function displayStreak() {
    const streakData = JSON.parse(localStorage.getItem('dailyStreak'));
    const streakElement = document.getElementById('streak');
    streakElement.textContent = streakData.currentStreak;
}

function showCustomAlertW(message) {
    const alertContainer = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.setAttribute('role', 'alert');
    alert.className = 'alert alert-warning';
    alert.innerHTML = `
        <svg
    xmlns="http://www.w3.org/2000/svg"
    class="h-6 w-6 shrink-0 stroke-current"
    fill="none"
    viewBox="0 0 24 24">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
        <span>${message}</span>
    `;
    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 3000);
}


