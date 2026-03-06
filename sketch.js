// --- Global Variables ---
let currentPhrase = ""; 
let usedWords = new Set();
let currentFontSize = 60;
let isLoading = false;
let hasStarted = false; 

// Dice State
let currentDiceRoll = { d1: 1, d2: 1 };
let lastRollTime = 0;
const ROLL_DURATION = 3000; 
const ANIMATION_SPEED = 10; 

// ASCII Dice Faces
const ASCII_FACES = {
    1: "+-------+\n|       |\n|   O   |\n|       |\n+-------+",
    2: "+-------+\n| O     |\n|       |\n|     O |\n+-------+",
    3: "+-------+\n| O     |\n|   O   |\n|     O |\n+-------+",
    4: "+-------+\n| O   O |\n|       |\n| O   O |\n+-------+",
    5: "+-------+\n| O   O |\n|   O   |\n| O   O |\n+-------+",
    6: "+-------+\n| O   O |\n| O   O |\n| O   O |\n+-------+"
};

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(RGB);
    textAlign(CENTER, CENTER);
    textFont('Doto', currentFontSize);
    fill(255);
    calculateMetrics();
}

function draw() {
    background(0); 
    let centerX = width / 2;
    let centerY = height / 2; 

    let fixedDiceFontSize = min(height * 0.15, width / 20);
    let diceBlockHeight = 5 * fixedDiceFontSize * 1.15;
    let refTextHeight = height * 0.15;
    let gap = height * 0.05; 
    let totalGroupHeight = diceBlockHeight + gap + refTextHeight;
    let groupStartY = (height - totalGroupHeight) / 2;

    let diceY = groupStartY + (diceBlockHeight / 2);
    let textY = groupStartY + diceBlockHeight + gap + (refTextHeight / 2);

    if (!hasStarted) {
        // --- State 0: Intro (LESS TRAIL Branding) ---
        drawIntroTitle(centerX, centerY, fixedDiceFontSize);
    } else if (isLoading) {
        let timeSinceLastRoll = millis() - lastRollTime;
        if (timeSinceLastRoll < ROLL_DURATION) {
            let d1, d2;
            if (frameCount % ANIMATION_SPEED === 0) {
                d1 = floor(random(1, 7));
                d2 = floor(random(1, 7));
                draw.tempD1 = d1;
                draw.tempD2 = d2;
            } else {
                d1 = draw.tempD1 || 1;
                d2 = draw.tempD2 || 1;
            }
            drawDice(d1, d2, centerX, diceY, fixedDiceFontSize);
        } else {
            drawDice(currentDiceRoll.d1, currentDiceRoll.d2, centerX, diceY, fixedDiceFontSize);
        }
    } else {
        drawDice(currentDiceRoll.d1, currentDiceRoll.d2, centerX, diceY, fixedDiceFontSize);
        if (currentPhrase) {
            textFont('Doto');
            textSize(currentFontSize);
            fill(255);
            text(currentPhrase, centerX, textY);
        }
    }
}

function drawDice(d1Value, d2Value, centerX, centerY, fontSize) {
    if (!ASCII_FACES[d1Value] || !ASCII_FACES[d2Value]) { return; }
    const face1 = ASCII_FACES[d1Value];
    const face2 = ASCII_FACES[d2Value];
    textFont('Doto');
    textSize(fontSize);
    textLeading(fontSize * 1.15);
    let offset = width * 0.25;
    text(face1, centerX - offset, centerY);
    text(face2, centerX + offset, centerY);
}

function drawIntroTitle(x, y, fontSize) {
    textFont('Doto');
    textSize(fontSize * 0.9);
    textLeading(fontSize * 1.0);
    fill(255, 255, 255, 180); 
    text("LESS\nTRAIL", x, y);
    
    textSize(14);
    fill(255, 255, 255, 100);
    text("TAP TO GENERATE", x, height - 60);
}

async function triggerPhraseGeneration() {
    if (isLoading) return;
    hasStarted = true;
    noCursor();
    isLoading = true;
    let d1 = floor(random(1, 7)), d2 = floor(random(1, 7));
    currentDiceRoll = { d1: d1, d2: d2 };
    lastRollTime = millis();
    currentPhrase = "";

    await new Promise(resolve => setTimeout(resolve, ROLL_DURATION));

    try {
        const resultPhrase = await generatePhrase(); 
        currentPhrase = resultPhrase;
    } catch (error) {
        currentPhrase = "ERROR: SIGNAL LOST"; 
    } finally {
        isLoading = false;
    }
}

function mousePressed() { triggerPhraseGeneration(); }
function touchStarted() { triggerPhraseGeneration(); return false; }

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    calculateMetrics();
}

async function fetchWordFromAPI(length, typeHint = 'any', constraint = null) {
    if (length < 1 || length > 15) return null;
    const spellingPattern = '?'.repeat(length);
    const apiUrl = `https://api.datamuse.com/words?sp=${spellingPattern}&max=100&md=p`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        const candidates = data.filter(item => {
            const word = item.word;
            if (word.length !== length || !/^[a-z]+$/i.test(word) || usedWords.has(word.toLowerCase())) return false;
            if (constraint === 'vowel' && !/^[aeiou]/i.test(word)) return false;
            if (constraint === 'consonant' && /^[aeiou]/i.test(word)) return false;
            if (typeHint === 'noun') return item.tags && item.tags.includes('n');
            return true;
        });
        if (candidates.length > 0) {
            const chosenItem = random(candidates);
            return chosenItem.word.toLowerCase();
        }
        return null;
    } catch (error) { return null; }
}

async function generatePhrase() {
    let d1 = currentDiceRoll.d1, d2 = currentDiceRoll.d2;
    let word1_base = null, word2_base = null;
    let word1_display = null, word2_display = null;

    if (d1 === 1) {
        let specials = ['A', 'I', 'O', '!', '?', '2', '3', '4'];
        word1_base = random(specials);
        word1_display = word1_base;
    } else {
        word1_base = await fetchWordFromAPI(d1, 'any');
        if (word1_base) word1_display = word1_base;
        else return "SIGNAL INTERRUPTED";
    }

    let constraint = null;
    if (word1_base && word1_base.toLowerCase() === 'a') constraint = 'consonant';
    else if (word1_base && word1_base.toLowerCase() === 'an') constraint = 'vowel';

    word2_base = await fetchWordFromAPI(d2, 'noun', constraint);
    if (!word2_base) word2_base = await fetchWordFromAPI(d2, 'any', constraint);
    if (!word2_base) return "DATA FRAGMENT MISSING";

    word2_display = word2_base;
    let finalPhrase = `${word1_display} ${word2_display}`;
    finalPhrase = (random() < 0.5) ? finalPhrase.toLowerCase() : finalPhrase.toUpperCase();

    if (word1_base && typeof word1_base === 'string' && /^[a-z]+$/i.test(word1_base)) usedWords.add(word1_base);
    if (word2_base) usedWords.add(word2_base);

    return finalPhrase;
}

function calculateMetrics() {
    let dummyText = "MMMMMM MMMMMM";
    let testFontSize = height * 1.0;
    let margin = width * 0.05;
    let availableWidth = width - margin;
    let availableHeight = height * 0.5; 

    textSize(testFontSize);
    let currentTextWidth = textWidth(dummyText);

    while (currentTextWidth > availableWidth && testFontSize > 10) {
        testFontSize -= 2;
        textSize(testFontSize);
        currentTextWidth = textWidth(dummyText);
    }
    let currentTextHeight = textAscent() + textDescent();
    while (currentTextHeight > availableHeight && testFontSize > 10) {
        testFontSize -= 2;
        textSize(testFontSize);
        currentTextHeight = textAscent() + textDescent();
    }
    currentFontSize = max(10, testFontSize);
}
