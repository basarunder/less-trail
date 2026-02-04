// --- Global Variables ---
let currentPhrase = ""; // Empty initially
let usedWords = new Set();
let currentFontSize = 60;
let isLoading = false;
let hasStarted = false; // New state: waiting for first interaction

// Dice Face State Variables
let currentDiceRoll = { d1: 1, d2: 1 };
let lastRollTime = 0;
const ROLL_DURATION = 3000; // Slower animation (3 seconds)
const ANIMATION_SPEED = 10; // Update dice every X frames

// ASCII Dice Faces (Monospaced)
// 9 chars wide, 5 lines tall (approx)
const ASCII_FACES = {
    1: "+-------+\n|       |\n|   O   |\n|       |\n+-------+",
    2: "+-------+\n| O     |\n|       |\n|     O |\n+-------+",
    3: "+-------+\n| O     |\n|   O   |\n|     O |\n+-------+",
    4: "+-------+\n| O   O |\n|       |\n| O   O |\n+-------+",
    5: "+-------+\n| O   O |\n|   O   |\n| O   O |\n+-------+",
    6: "+-------+\n| O   O |\n| O   O |\n| O   O |\n+-------+"
};

// --- p5.js Setup Function ---
function setup() {
    createCanvas(windowWidth, windowHeight);
    console.log(`[Setup] Canvas created: width=${windowWidth}, height=${windowHeight}`);
    colorMode(RGB);
    textAlign(CENTER, CENTER); // Critical for alignment
    console.log("[Setup] textAlign set to (CENTER, CENTER)");

    // Set default font (will be overridden for specific elements)
    textFont('Doto', currentFontSize);
    fill(255); // White text
    console.log("[Setup] Setup complete. Tap or Click.");
    calculateMetrics();
}

// --- p5.js Draw Function ---
function draw() {
    background(0); // Black background
    let centerX = width / 2;
    let centerY = height / 2; // Absolute center for Intro State

    // --- Fixed Layout Calculation ---
    // Decouple dice size from adaptive text size to prevent jumping.
    // Calculate a fixed size for the dice based purely on screen dimensions.
    let fixedDiceFontSize = min(height * 0.15, width / 20);

    // Dice Block Height approx: 5 lines * leading(1.15) * fontSize
    let diceBlockHeight = 5 * fixedDiceFontSize * 1.15;

    // Reference Text Height (for positioning reference only)
    // Used to calculate the center point of the layout group.
    let refTextHeight = height * 0.15;

    let gap = height * 0.05; // 5% height gap

    let totalGroupHeight = diceBlockHeight + gap + refTextHeight;
    let groupStartY = (height - totalGroupHeight) / 2;

    // Fixed vertical centers for drawing
    let diceY = groupStartY + (diceBlockHeight / 2);
    let textY = groupStartY + diceBlockHeight + gap + (refTextHeight / 2);


    if (!hasStarted) {
        // --- State 0: Intro ---
        // Single die (6) in the absolute center
        // We use centerY (absolute center) instead of diceY (layout center) for the intro
        // so it looks perfectly centered before the game layout takes over.
        drawSingleDie(6, centerX, centerY, fixedDiceFontSize);
    } else if (isLoading) {
        let timeSinceLastRoll = millis() - lastRollTime;

        if (timeSinceLastRoll < ROLL_DURATION) {
            // Animating Dice
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
            // Final Dice
            drawDice(currentDiceRoll.d1, currentDiceRoll.d2, centerX, diceY, fixedDiceFontSize);
        }

    } else {
        // State 2: Result
        drawDice(currentDiceRoll.d1, currentDiceRoll.d2, centerX, diceY, fixedDiceFontSize);

        // Draw Phrase (if exists)
        if (currentPhrase) {
            textFont('Doto');
            textSize(currentFontSize); // Keeps text adaptive
            fill(255);
            text(currentPhrase, centerX, textY);
        }
    }
}

// --- Helper function to draw dice faces ---
function drawDice(d1Value, d2Value, centerX, centerY, fontSize) {
    if (!ASCII_FACES[d1Value] || !ASCII_FACES[d2Value]) { return; }

    const face1 = ASCII_FACES[d1Value];
    const face2 = ASCII_FACES[d2Value];

    textFont('Doto'); // Blocky terminal font for dice
    textSize(fontSize);

    // Adjust leading to make them look more square
    textLeading(fontSize * 1.15);

    // Calculate spacing dynamically to prevent edge overlap
    // Distance from center to dice center
    let offset = width * 0.25;

    // Draw Die 1 (Left)
    text(face1, centerX - offset, centerY);

    // Draw Die 2 (Right)
    text(face2, centerX + offset, centerY);
}

// --- Helper function to draw a single die (Intro State) ---
function drawSingleDie(dValue, x, y, fontSize) {
    if (!ASCII_FACES[dValue]) return;
    textFont('Doto');
    textSize(fontSize);
    textLeading(fontSize * 1.15);
    text(ASCII_FACES[dValue], x, y);
}


// --- Trigger Function ---
async function triggerPhraseGeneration() {
    if (isLoading) { console.log("[Trigger] Ignored: Already loading."); return; }

    // Start game on first click
    hasStarted = true;

    // Hide cursor on interaction
    noCursor();

    // 1. Initiate Roll State (Show Dice Animation/Stops)
    isLoading = true;
    let d1 = floor(random(1, 7)), d2 = floor(random(1, 7));
    currentDiceRoll = { d1: d1, d2: d2 };
    lastRollTime = millis();

    // Clear phrase so nothing shows below dice while rolling
    currentPhrase = "";
    console.log(`[Trigger] Set loading state TRUE. Rolled initial dice: D1=${d1}, D2=${d2}`);

    // 2. Wait for the user to observe the dice for ROLL_DURATION
    await new Promise(resolve => setTimeout(resolve, ROLL_DURATION));

    // 3. Proceed with API call (which will update the display again briefly)
    console.log("\n--- Trigger Received: Generating Phrase via API ---");
    try {
        const resultPhrase = await generatePhrase(); // generatePhrase is async
        currentPhrase = resultPhrase;
        console.log(`[Trigger] Phrase generated: "${currentPhrase}"`);
    } catch (error) {
        console.error("[Trigger] Error generating phrase:", error);
        currentPhrase = "ERROR: COULD NOT GENERATE PHRASE"; // Uppercase error
    } finally {
        // 4. Final State: Show Phrase
        isLoading = false;
        console.log("[Trigger] Set loading state FALSE");
    }
}
// --- Event Handlers ---
function mousePressed() {
    console.log("[Event] Mouse Pressed");
    triggerPhraseGeneration();
}

function touchStarted() {
    console.log("[Event] Touch Started");
    triggerPhraseGeneration();
    return false; // Prevent default touch actions
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    console.log(`[Window Resized] New dimensions: width=${windowWidth}, height=${windowHeight}`);
    calculateMetrics();
}


// --- Helper: Fetch Word from Datamuse API ---
// (Remains the same)
async function fetchWordFromAPI(length, typeHint = 'any') {
    if (length < 1 || length > 15) { console.log(`Invalid length requested: ${length}`); return null; }
    console.log(`  Fetching API: length=${length}, hint=${typeHint}`);
    const spellingPattern = '?'.repeat(length);
    const apiUrl = `https://api.datamuse.com/words?sp=${spellingPattern}&max=100&md=p`;
    // console.log(`    API URL: ${apiUrl}`);
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        const data = await response.json();
        // console.log(`    API returned ${data.length} potential words.`);
        const candidates = data.filter(item => {
            const word = item.word;
            if (word.length !== length) return false;
            if (!/^[a-z]+$/i.test(word)) return false;
            if (usedWords.has(word.toLowerCase())) return false;
            if (typeHint === 'noun') return item.tags && item.tags.includes('n');
            return true;
        });
        // console.log(`    Found ${candidates.length} valid, unused candidates matching criteria.`);
        if (candidates.length > 0) {
            const chosenItem = random(candidates);
            console.log(`    Chose API word: '${chosenItem.word}' (Tags: ${chosenItem.tags?.join(', ') || 'N/A'})`);
            return chosenItem.word.toLowerCase();
        } else {
            console.log(`    No suitable candidates found after filtering.`);
            return null;
        }
    } catch (error) {
        console.error(`    Error fetching or processing API data: ${error}`);
        return null;
    }
}


// --- Helper: Generate Phrase using API ---
async function generatePhrase() {
    let d1 = currentDiceRoll.d1, d2 = currentDiceRoll.d2; // Use the *final* dice values
    console.log(`Generating phrase based on final roll: D1=${d1}, D2=${d2}`);
    let word1_base = null, word2_base = null;
    let word1_display = null, word2_display = null;

    // --- Rule for Word 1 ---
    console.log("Attempting to find Word 1...");
    if (d1 === 1) {
        // Special characters/digits for D1=1
        let specials = ['A', 'I', 'O', '!', '?', '2', '3', '4']; // Use uppercase A, I, O directly
        word1_base = random(specials);
        console.log(`  D1=1, chose special character: '${word1_base}'`);
        word1_display = word1_base; // Use directly (already uppercase or symbol/digit)
    } else {
        // Fetch word of length d1 from API
        word1_base = await fetchWordFromAPI(d1, 'any');
        if (word1_base) {
            word1_display = word1_base; // Keep as base for now, will uppercase later
        } else {
            console.log("  Failed to fetch suitable Word 1 from API.");
            return `RE-ROLL (API FAIL WORD 1 LEN=${d1})`; // Uppercase error
        }
    }

    // --- Rule for Word 2 ---
    console.log("Attempting to find Word 2 (prefer noun)...");
    // Fetch word of length d2, hinting for noun
    word2_base = await fetchWordFromAPI(d2, 'noun');
    if (!word2_base) {
        console.log("  Could not fetch Noun for D2. Falling back to ANY word type...");
        word2_base = await fetchWordFromAPI(d2, 'any'); // Fallback fetch
    }

    if (!word2_base) {
        console.log("  Failed to fetch suitable Word 2 (any type) from API.");
        let word1_info = word1_base ? `'${word1_base}'` : `(Special D1=${d1})`;
        // Uppercase error
        return `RE-ROLL (GOT WORD 1: ${word1_info}, API FAIL WORD 2 LEN=${d2})`;
    }
    // Word 2 display is just the base form now
    word2_display = word2_base;

    // --- NO PLURALIZATION BLOCK ---

    // --- Final Phrase Construction ---
    // Combine words. Randomize case (50% Lowercase, 50% Uppercase) as requested.
    let finalPhrase = `${word1_display} ${word2_display}`;
    if (random() < 0.5) {
        finalPhrase = finalPhrase.toLowerCase();
    } else {
        finalPhrase = finalPhrase.toUpperCase();
    }
    console.log(`Constructed phrase: '${finalPhrase}'`);

    // --- Update Global Used Words ---
    // Add BASE forms only
    if (word1_base && typeof word1_base === 'string' && /^[a-z]+$/i.test(word1_base)) {
        console.log(`  Adding Word 1 base '${word1_base}' to used set.`);
        usedWords.add(word1_base);
    }
    if (word2_base) {
        console.log(`  Adding Word 2 base '${word2_base}' to used set.`);
        usedWords.add(word2_base);
    }
    console.log(`Used words count: ${usedWords.size}`);

    return finalPhrase;
}


// --- Helper Function: Calculate Fixed Font Size ---
function calculateMetrics() {
    // We calculate a size that fits the MAXIMUM possible phrase length (6+1+6 = 13 chars).
    // This ensures the font size is constant ("fixed") and doesn't jump between rolls.
    // 'M' is typically the widest char, though Doto is monospace, so any 13 chars work.
    let dummyText = "MMMMMM MMMMMM";

    // Logic similar to before, but fitting this dummy text
    let testFontSize = height * 1.0;
    let margin = width * 0.05;
    let availableWidth = width - margin;
    let availableHeight = height * 0.5; // Reserved text area

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
    console.log(`[Metrics] Fixed font size calculated: ${currentFontSize.toFixed(1)}px (based on '${dummyText}')`);
}
