// --- Global Variables ---
let currentPhrase = "Press 'R' to roll (uses API)";
let usedWords = new Set(); // Stores used BASE words for this session
let currentFontSize = 60;
let isLoading = false; // Flag to show loading state

// --- p5.js Setup Function ---
function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(RGB);

    // *** CRITICAL FOR CENTERING ***
    // Set text alignment to center both horizontally and vertically
    textAlign(CENTER, CENTER);
    // ****************************

    textFont('Arial, Helvetica, sans-serif', currentFontSize); // Use a common font stack
    fill(255); // White text

    console.log("Setup complete. Press 'R' to fetch words and generate.");
    calculateAdaptiveFontSize(currentPhrase); // Calculate initial size
}

// --- p5.js Draw Function ---
function draw() {
    background(0); // Black background each frame
    textSize(currentFontSize); // Apply the calculated font size
    fill(255); // Ensure text color is white

    let displayPhrase = isLoading ? "Rolling..." : currentPhrase;

    // *** MODIFIED TEXT DRAWING ***
    // Use width/2 and height/2 as the CENTER point for the text anchor,
    // because textAlign is (CENTER, CENTER).
    // Provide a bounding box slightly smaller than the canvas to add padding
    // and allow for text wrapping.

    let padding = width * 0.05; // e.g., 5% padding on each side (10% total)
    let textBoxWidth = width - (padding * 2);
    let textBoxHeight = height - (padding * 2); // Use most of the height

    // Draw the text centered at (width/2, height/2) within the calculated bounding box
    text(displayPhrase, width / 2, height / 2, textBoxWidth, textBoxHeight);
    // ***************************
}

// --- p5.js Key Press Handler ---
async function keyPressed() {
    // Use keyCode for 'R' (82) or check key character
    if (!isLoading && (key === 'r' || key === 'R' || keyCode === 82)) {
        isLoading = true; // Set loading state
        currentPhrase = "Rolling..."; // Update display immediately
        draw(); // Redraw to show "Rolling..."

        console.log("\n--- 'R' Pressed: Generating Phrase via API ---");
        try {
            // generatePhrase is now async because it fetches data
            currentPhrase = await generatePhrase();
        } catch (error) {
            console.error("Error generating phrase:", error);
            currentPhrase = "Error: Could not generate phrase";
        } finally {
            isLoading = false; // Reset loading state
            calculateAdaptiveFontSize(currentPhrase); // Recalculate size for the result
            // draw() will pick up the new currentPhrase and isLoading=false on its next loop
        }
    }
}

// --- p5.js Window Resize Handler ---
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    // Recalculate font size on resize to maintain fit
    calculateAdaptiveFontSize(currentPhrase);
}

// --- Helper: Fetch Word from Datamuse API ---
async function fetchWordFromAPI(length, typeHint = 'any') {
    if (length < 1 || length > 15) { // Set a reasonable max length for API sanity
        console.log(`Invalid length requested: ${length}`);
        return null;
    }
    console.log(`  Fetching API: length=${length}, hint=${typeHint}`);

    // Use '?' wildcard for each character to suggest length
    const spellingPattern = '?'.repeat(length);
    // Request part-of-speech tags (md=p)
    const apiUrl = `https://api.datamuse.com/words?sp=${spellingPattern}&max=100&md=p`; // Fetch up to 100 candidates

    console.log(`    API URL: ${apiUrl}`);

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log(`    API returned ${data.length} potential words.`);

        // Filter results client-side
        const candidates = data.filter(item => {
            const word = item.word;
            // 1. Check exact length
            if (word.length !== length) return false;
            // 2. Check if alphabetic (allow only a-z)
            if (!/^[a-z]+$/i.test(word)) return false;
            // 3. Check if already used (base form)
            if (usedWords.has(word.toLowerCase())) return false;
            // 4. Check part-of-speech hint (if 'noun')
            if (typeHint === 'noun') {
                // Check if 'tags' array exists and includes 'n' (noun)
                return item.tags && item.tags.includes('n');
            }
            // If typeHint is 'any' or not 'noun', just return true at this point
            return true;
        });

        console.log(`    Found ${candidates.length} valid, unused candidates matching criteria.`);

        if (candidates.length > 0) {
            const chosenItem = random(candidates); // Pick a random valid candidate
            console.log(`    Chose API word: '${chosenItem.word}' (Tags: ${chosenItem.tags?.join(', ') || 'N/A'})`);
            return chosenItem.word.toLowerCase(); // Return the chosen word (lowercase base)
        } else {
            console.log(`    No suitable candidates found after filtering.`);
            return null;
        }

    } catch (error) {
        console.error(`    Error fetching or processing API data: ${error}`);
        return null; // Indicate failure
    }
}


// --- Helper: Generate Phrase using API ---
async function generatePhrase() {
    let d1 = floor(random(1, 7));
    let d2 = floor(random(1, 7));
    console.log(`Rolled: D1=${d1}, D2=${d2}`);

    let word1_base = null;
    let word2_base = null;
    let word1_display = null;
    let word2_display = null;

    // --- Rule for Word 1 ---
    console.log("Attempting to find Word 1...");
    if (d1 === 1) {
        let specials = ['a', 'i', 'o', '!', '?', '2', '3', '4'];
        word1_base = random(specials);
        console.log(`  D1=1, chose special character: '${word1_base}'`);
        word1_display = word1_base; // Use directly
    } else {
        // Fetch any word of length d1
        word1_base = await fetchWordFromAPI(d1, 'any');
        if (word1_base) {
            word1_display = word1_base; // Start display form as base
        } else {
            console.log("  Failed to fetch suitable Word 1 from API.");
            return `Re-roll (API fail Word 1 len=${d1})`;
        }
    }

    // --- Rule for Word 2 ---
    console.log("Attempting to find Word 2 (prefer noun)...");
    // Fetch a word of length d2, hinting for a noun
    word2_base = await fetchWordFromAPI(d2, 'noun');

    if (!word2_base) {
        console.log("  Could not fetch Noun for D2. Falling back to ANY word type...");
        word2_base = await fetchWordFromAPI(d2, 'any'); // Fallback fetch
    }

    if (!word2_base) {
        console.log("  Failed to fetch suitable Word 2 (any type) from API.");
        let word1_info = word1_base ? `'${word1_base}'` : `(Special D1=${d1})`;
        return `Re-roll (Got Word 1: ${word1_info}, API fail Word 2 len=${d2})`;
    }
    word2_display = word2_base; // Start display form as base


    // --- Pluralization Rule (if D1 is even, word2 is likely noun - check needed?) ---
    // We can't be 100% sure word2_base is a noun even if we hinted,
    // but let's try pluralizing anyway if D1 is even.
    console.log(`Checking pluralization: D1=${d1}, base='${word2_base}'`);

    if (d1 % 2 === 0 && word2_base.length > 1) { // Only pluralize if D1 even & word > 1 letter
        console.log(`  Attempting pluralization (D1 is even)...`);
        try {
            // Use pluralize.js library (make sure index.html includes it)
            let plural_form = pluralize(word2_base);
            console.log(`  Plural form: '${plural_form}'`);

            // Constraint: Only use plural if length matches D2 roll AND it's different
            if (plural_form !== word2_base && plural_form.length === d2) {
                console.log(`  Plural length (${plural_form.length}) matches D2 (${d2}).`);
                // Check if plural form itself is unused and not the same as word1_base
                if (!usedWords.has(plural_form) && plural_form !== word1_base) {
                    console.log(`  Plural form '${plural_form}' is available. Using plural.`);
                    word2_display = plural_form;
                    // We add word2_base to usedWords later, regardless.
                } else {
                    console.log(`  Plural form '${plural_form}' is used or is Word 1. Keeping base: '${word2_base}'`);
                }
            } else if (plural_form !== word2_base) {
                 console.log(`  Plural form '${plural_form}' length does not match D2 (${d2}). Keeping base: '${word2_base}'`);
            } else {
                 console.log(`  Word '${word2_base}' unchanged by pluralize. Keeping base.`);
            }
        } catch (e) {
            console.error("  Error during pluralization:", e); // Catch errors from pluralize lib if any
        }
    } else {
         console.log(`  Not attempting pluralization (D1 odd or word too short).`);
    }


    // --- Final Phrase Construction ---
    // Capitalize first word (handle 'i' specifically)
    if (typeof word1_display === 'string') {
        if (word1_display === 'i') {
            word1_display = 'I';
        } else if (word1_display.length > 0 && /^[a-z]/i.test(word1_display)) { // Check if it starts with a letter
             word1_display = word1_display.charAt(0).toUpperCase() + word1_display.slice(1);
        }
    }


    let finalPhrase = `${word1_display} ${word2_display}`;
    console.log(`Constructed phrase: '${finalPhrase}'`);

    // --- Update Global Used Words ---
    // Add BASE forms only
    if (word1_base && typeof word1_base === 'string' && /^[a-z]+$/i.test(word1_base)) { // Only add actual words
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


// --- Helper Function: Adaptive Font Size ---
// (This function remains the same as the previous version, it seemed correct)
function calculateAdaptiveFontSize(text) {
    if (!text || text.length === 0) return;
    let currentText = String(text);
    let testFontSize = height * 0.7;
    let margin = width * 0.1;
    let availableWidth = width - margin;
    let availableHeight = height * 0.8;

    textSize(testFontSize);
    while (textWidth(currentText) > availableWidth && testFontSize > 10) {
        testFontSize -= 2;
        textSize(testFontSize);
    }
    while ((textAscent() + textDescent()) > availableHeight && testFontSize > 10) {
        testFontSize -= 2;
        textSize(testFontSize);
    }
    currentFontSize = max(10, testFontSize);
    console.log(`Adaptive font size: ${currentFontSize}px for "${currentText}"`);
}
