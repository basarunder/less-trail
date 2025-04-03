// --- Global Variables ---
let currentPhrase = "Tap or Click to Roll (uses API)";
let usedWords = new Set();
let currentFontSize = 60;
let isLoading = false;
let showDebugShapes = true; // <<< Set to false to hide debug visuals later

// --- p5.js Setup Function ---
function setup() {
    createCanvas(windowWidth, windowHeight);
    console.log(`[Setup] Canvas created: width=${windowWidth}, height=${windowHeight}`);
    console.log(`[Setup] p5 internal width=${width}, height=${height}`);
    colorMode(RGB);
    textAlign(CENTER, CENTER);
    console.log("[Setup] textAlign set to (CENTER, CENTER)");
    textFont('Arial, Helvetica, sans-serif', currentFontSize);
    fill(255);
    console.log("[Setup] Setup complete. Tap or Click.");
    calculateAdaptiveFontSize(currentPhrase);
}

// --- p5.js Draw Function ---
function draw() {
    background(0);
    textSize(currentFontSize);
    fill(255); // Set text color to white

    let displayPhrase = isLoading ? "Rolling..." : currentPhrase;

    // --- Calculations for Text Box ---
    let padding = width * 0.05;
    let textBoxWidth = width - (padding * 2);
    let textBoxHeight = height - (padding * 2);
    let centerX = width / 2;
    let centerY = height / 2;

    // --- Optional: Visual Debugging ---
    if (showDebugShapes) {
        push(); // Isolate debug drawing styles
        noFill(); // Don't fill the shapes
        strokeWeight(1);

        // Draw a red box representing the text bounding box
        stroke(255, 0, 0); // Red
        rectMode(CENTER); // Draw rectangle from its center
        rect(centerX, centerY, textBoxWidth, textBoxHeight);

        // Draw a small green circle at the calculated center point
        stroke(0, 255, 0); // Green
        ellipse(centerX, centerY, 10, 10); // 10px diameter circle

        pop(); // Restore original drawing styles
    }
    // --- End Visual Debugging ---


    // Draw the actual text (should be centered within the red box)
    fill(255); // Make sure text fill is reset to white after debug shapes
    text(displayPhrase, centerX, centerY, textBoxWidth, textBoxHeight);
}


// --- Trigger Function ---
async function triggerPhraseGeneration() {
    if (isLoading) { console.log("[Trigger] Ignored: Already loading."); return; }
    isLoading = true;
    currentPhrase = "Rolling...";
    console.log("[Trigger] Set loading state TRUE");
    // No need to call draw(), it loops

    console.log("\n--- Trigger Received: Generating Phrase via API ---");
    try {
        currentPhrase = await generatePhrase();
        console.log(`[Trigger] Phrase generated: "${currentPhrase}"`);
    } catch (error) {
        console.error("[Trigger] Error generating phrase:", error);
        currentPhrase = "Error: Could not generate phrase";
    } finally {
        isLoading = false;
        console.log("[Trigger] Set loading state FALSE");
        calculateAdaptiveFontSize(currentPhrase);
        console.log("[Trigger] Adaptive font size recalculated.");
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
    console.log(`[Window Resized] p5 internal width=${width}, height=${height}`);
    calculateAdaptiveFontSize(currentPhrase);
}


// --- Helper: Fetch Word from Datamuse API ---
// (Remains the same)
async function fetchWordFromAPI(length, typeHint = 'any') {
    if (length < 1 || length > 15) { console.log(`Invalid length requested: ${length}`); return null; }
    console.log(`  Fetching API: length=${length}, hint=${typeHint}`);
    const spellingPattern = '?'.repeat(length);
    const apiUrl = `https://api.datamuse.com/words?sp=${spellingPattern}&max=100&md=p`;
    console.log(`    API URL: ${apiUrl}`);
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        const data = await response.json();
        console.log(`    API returned ${data.length} potential words.`);
        const candidates = data.filter(item => {
            const word = item.word;
            if (word.length !== length) return false;
            if (!/^[a-z]+$/i.test(word)) return false;
            if (usedWords.has(word.toLowerCase())) return false;
            if (typeHint === 'noun') return item.tags && item.tags.includes('n');
            return true;
        });
        console.log(`    Found ${candidates.length} valid, unused candidates matching criteria.`);
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
// (Remains the same)
async function generatePhrase() {
    let d1 = floor(random(1, 7)), d2 = floor(random(1, 7));
    console.log(`Rolled: D1=${d1}, D2=${d2}`);
    let word1_base = null, word2_base = null, word1_display = null, word2_display = null;
    console.log("Attempting to find Word 1...");
    if (d1 === 1) {
        let specials = ['a', 'i', 'o', '!', '?', '2', '3', '4'];
        word1_base = random(specials);
        console.log(`  D1=1, chose special character: '${word1_base}'`);
        word1_display = word1_base;
    } else {
        word1_base = await fetchWordFromAPI(d1, 'any');
        if (word1_base) word1_display = word1_base;
        else { console.log("  Failed to fetch suitable Word 1 from API."); return `Re-roll (API fail Word 1 len=${d1})`; }
    }
    console.log("Attempting to find Word 2 (prefer noun)...");
    word2_base = await fetchWordFromAPI(d2, 'noun');
    if (!word2_base) {
        console.log("  Could not fetch Noun for D2. Falling back to ANY word type...");
        word2_base = await fetchWordFromAPI(d2, 'any');
    }
    if (!word2_base) {
        console.log("  Failed to fetch suitable Word 2 (any type) from API.");
        let word1_info = word1_base ? `'${word1_base}'` : `(Special D1=${d1})`;
        return `Re-roll (Got Word 1: ${word1_info}, API fail Word 2 len=${d2})`;
    }
    word2_display = word2_base;
    console.log(`Checking pluralization: D1=${d1}, base='${word2_base}'`);
    if (d1 % 2 === 0 && word2_base.length > 1) {
        console.log(`  Attempting pluralization (D1 is even)...`);
        try {
            let plural_form = pluralize(word2_base); // Requires pluralize.js library
            console.log(`  Plural form: '${plural_form}'`);
            if (plural_form !== word2_base && plural_form.length === d2) {
                console.log(`  Plural length (${plural_form.length}) matches D2 (${d2}).`);
                if (!usedWords.has(plural_form) && plural_form !== word1_base) {
                    console.log(`  Plural form '${plural_form}' is available. Using plural.`);
                    word2_display = plural_form;
                } else console.log(`  Plural form '${plural_form}' is used or is Word 1. Keeping base: '${word2_base}'`);
            } else if (plural_form !== word2_base) console.log(`  Plural form '${plural_form}' length does not match D2 (${d2}). Keeping base: '${word2_base}'`);
            else console.log(`  Word '${word2_base}' unchanged by pluralize. Keeping base.`);
        } catch (e) { console.error("  Error during pluralization:", e); }
    } else console.log(`  Not attempting pluralization (D1 odd or word too short).`);
    if (typeof word1_display === 'string') {
        if (word1_display === 'i') word1_display = 'I';
        else if (word1_display.length > 0 && /^[a-z]/i.test(word1_display)) word1_display = word1_display.charAt(0).toUpperCase() + word1_display.slice(1);
    }
    let finalPhrase = `${word1_display} ${word2_display}`;
    console.log(`Constructed phrase: '${finalPhrase}'`);
    if (word1_base && typeof word1_base === 'string' && /^[a-z]+$/i.test(word1_base)) { console.log(`  Adding Word 1 base '${word1_base}' to used set.`); usedWords.add(word1_base); }
    if (word2_base) { console.log(`  Adding Word 2 base '${word2_base}' to used set.`); usedWords.add(word2_base); }
    console.log(`Used words count: ${usedWords.size}`);
    return finalPhrase;
}


// --- Helper Function: Adaptive Font Size ---
// (Remains the same)
function calculateAdaptiveFontSize(text) {
    if (!text || text.length === 0) { console.log("[FontCalc] No text to calculate size for."); return; }
    let currentText = String(text);
    console.log(`[FontCalc] Calculating for text: "${currentText}"`);
    let testFontSize = height * 0.7;
    let margin = width * 0.1;
    let availableWidth = width - margin;
    let availableHeight = height * 0.8;
    console.log(`[FontCalc] Initial check: MaxW=${availableWidth.toFixed(1)}, MaxH=${availableHeight.toFixed(1)}, StartSize=${testFontSize.toFixed(1)}`);
    textSize(testFontSize);
    let currentTextWidth = textWidth(currentText);
    console.log(`[FontCalc] Initial text width at ${testFontSize.toFixed(1)}px: ${currentTextWidth.toFixed(1)}px`);
    while (currentTextWidth > availableWidth && testFontSize > 10) {
        testFontSize -= 2;
        textSize(testFontSize);
        currentTextWidth = textWidth(currentText);
    }
    let currentTextHeight = textAscent() + textDescent();
    while (currentTextHeight > availableHeight && testFontSize > 10) {
         testFontSize -= 2;
         textSize(testFontSize);
         currentTextHeight = textAscent() + textDescent();
    }
    currentFontSize = max(10, testFontSize);
    console.log(`[FontCalc] Final adaptive font size: ${currentFontSize.toFixed(1)}px`);
}
