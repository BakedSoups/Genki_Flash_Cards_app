const homeScreen = document.querySelector("#home-screen");
const studyScreen = document.querySelector("#study-screen");
const scoreScreen = document.querySelector("#score-screen");
const homeButton = document.querySelector("#home-button");
const lessonSelect = document.querySelector("#lesson");
const modeSelect = document.querySelector("#mode");
const modeHelp = document.querySelector("#mode-help");
const directionSelect = document.querySelector("#direction");
const wordSetSelect = document.querySelector("#word-set");
const loopsSelect = document.querySelector("#loops");
const shuffleSelect = document.querySelector("#shuffle");
const hintsSelect = document.querySelector("#hints");
const startButton = document.querySelector("#start-button");
const restartButton = document.querySelector("#restart-button");
const answerForm = document.querySelector("#answer-form");
const answerInput = document.querySelector("#answer");
const readingAnswers = document.querySelector("#reading-answers");
const hintButton = document.querySelector("#hint-button");
const retryButton = document.querySelector("#retry-button");
const checkButton = document.querySelector("#check");
const questionLabel = document.querySelector("#question-label");
const promptLabel = document.querySelector("#prompt-label");
const promptWord = document.querySelector("#prompt-word");
const result = document.querySelector("#result");
const resultStatus = document.querySelector("#result-status");
const correction = document.querySelector("#correction");
const progress = document.querySelector("#progress");
const message = document.querySelector("#message");
const scorePercent = document.querySelector("#score-percent");
const scoreDetails = document.querySelector("#score-details");
const wordChart = document.querySelector("#word-chart");
const historyTitle = document.querySelector("#history-title");
const historySummary = document.querySelector("#history-summary");
const missedWords = document.querySelector("#missed-words");
const runHistory = document.querySelector("#run-history");
const SELECTED_LESSON_KEY = "kotoba-cards:selected-lesson";

let sentenceCorrectTokens = 0;
let sentenceTotalTokens = 0;
let sourceCards = [];
let cards = [];
let index = 0;
let targetLoops = 1;
let studyMode = "removal";
let direction = "english-romaji";
let correctAnswers = 0;
let hintedAnswers = 0;
let attempts = 0;
let wordStats = {};
let advancing = false;
let waitingForContinue = false;
let pendingCorrect = false;
let advanceTimer = null;
let history = [];
let historySaved = false;
let hintsEnabled = false;
let hintsMode = "off";
let hintLevel = 0;
let hintUsedForCurrent = false;
let fullHintUsedForCurrent = false;

function savedLessonSelection() {
  try {
    return window.localStorage.getItem(SELECTED_LESSON_KEY);
  } catch {
    return null;
  }
}

function saveLessonSelection(lesson) {
  try {
    window.localStorage.setItem(SELECTED_LESSON_KEY, lesson);
  } catch {
    // The app still works when browser storage is disabled.
  }
}

function selectLessonDirection() {
  directionSelect.disabled = ["learn-kanji.csv", "learn-katakana.csv", "lesson7-sentences.csv", "lesson8-1-katakana.csv"].includes(lessonSelect.value);
  if (lessonSelect.value === "lesson8-1-katakana.csv") {
    directionSelect.value = "english-romaji";
  } else if (lessonSelect.value === "lesson7-sentences.csv") {
    directionSelect.value = "english-romaji";
  } else if (lessonSelect.value === "learn-kanji.csv") {
    directionSelect.value = "kanji-romaji";
  } else if (lessonSelect.value === "learn-katakana.csv") {
    directionSelect.value = "katakana-romaji";
  } else if (lessonSelect.value === "lesson4.csv") {
    directionSelect.value = "kanji-readings";
  } else if (lessonSelect.value === "lesson4-2.csv") {
    directionSelect.value = "kanji-word-romaji";
  } else if (directionSelect.value.startsWith("kanji-") || directionSelect.value === "katakana-romaji") {
    directionSelect.value = "english-romaji";
  }
}

function showScreen(screen) {
  homeScreen.hidden = screen !== "home";
  studyScreen.hidden = screen !== "study";
  scoreScreen.hidden = screen !== "score";
  homeButton.hidden = screen === "home";
}

function normalize(value) {
  return value.trim().toLocaleLowerCase().replace(/[\s.,!?;:'"()-]+/g, "");
}

function hiraganaToRomaji(value) {
  const kana = {
    あ: "a", い: "i", う: "u", え: "e", お: "o",
    か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
    が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
    さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
    ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
    た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
    だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
    な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
    は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
    ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
    ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
    ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
    や: "ya", ゆ: "yu", よ: "yo",
    ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
    わ: "wa", を: "wo", ん: "n",
  };
  return [...value].map(character => kana[character] || character).join("");
}

function usesReadingFields(card) {
  return card.kind === "kanji" && !["kanji-english", "kanji-romaji"].includes(direction);
}

function directionFields(card) {
  if (card.kind === "reading-word") {
    return {prompt: card.spelling, answer: card.romaji, label: "Japanese → Romaji", instruction: "Type this word’s reading in romaji"};
  }
  if (card.kind === "sentence") {
    return {prompt: card.meaning, answer: card.romaji, label: "Lesson 7 Sentences",
      instruction: card.original ? "Translate only this phrase into romaji" : "Translate into romaji (separate words and particles with spaces)"};
  }
  if (direction === "katakana-romaji") {
    return { prompt: card.kana, answer: card.romaji, label: "Katakana → Romaji", instruction: "Write this character in romaji" };
  }
  if (direction === "kanji-romaji") {
    const readings = card.kana.split("|").map(value => hiraganaToRomaji(value.trim())).filter(Boolean);
    return {
      prompt: card.romaji,
      answer: readings.join(" · "),
      answers: readings,
      label: "Kanji → Romaji",
      instruction: card.kind === "kanji-word"
        ? "Write the full word in romaji"
        : "Write one reading of this kanji in romaji",
    };
  }
  if (card.kind === "kanji-word" && direction === "english-romaji") {
    return {
      prompt: card.meaning,
      answer: hiraganaToRomaji(card.kana),
      label: "Romaji word",
      instruction: "Write the full word in romaji",
    };
  }
  if (card.kind === "kanji-word" && direction === "kanji-word-romaji") {
    return {
      prompt: card.romaji,
      answer: hiraganaToRomaji(card.kana),
      label: "Kanji word",
      instruction: "Write the full word in romaji",
    };
  }
  if (card.kind === "kanji-word" && direction === "kanji-kana") {
    return {
      prompt: card.romaji,
      answer: card.kana,
      label: "Kanji word",
      instruction: "Write this word in hiragana",
    };
  }
  if (card.kind === "kanji" && direction === "kanji-english") {
    return {
      prompt: card.romaji,
      answer: card.meaning,
      answers: card.meaning.split("/").map(value => value.trim()).filter(Boolean),
      label: "Kanji meaning",
      instruction: "What does this kanji mean in English?",
    };
  }
  if (card.kind === "kanji") {
    const readings = card.kana.split("|").map(value => hiraganaToRomaji(value.trim())).filter(Boolean);
    return {
      prompt: card.romaji,
      answer: readings.join(" · "),
      answers: readings,
      label: "Kanji readings",
      instruction: "Enter every romaji reading (order does not matter)",
    };
  }
  if (direction === "kana-english") {
    return { prompt: card.kana, answer: card.meaning, label: "English practice", instruction: "What does this mean in English?" };
  }
  if (direction === "kana-romaji") {
    return { prompt: card.kana, answer: card.romaji, label: "Romaji practice", instruction: "Write this in romaji" };
  }
  if (direction === "english-kana") {
    return { prompt: card.meaning, answer: card.kana, label: "Hiragana practice", instruction: "Write this in hiragana" };
  }
  return { prompt: card.meaning, answer: card.romaji, label: "Romaji practice", instruction: "What is the romaji for" };
}

function shuffleCards(cardList) {
  for (let i = cardList.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cardList[i], cardList[j]] = [cardList[j], cardList[i]];
  }
  return cardList;
}

function crucialWordsForLesson(lesson) {
  const misses = {};
  history.filter(run => run.lesson === lesson && run.mode !== "introduction").forEach(run => (run.words || []).forEach(word => {
    const missed = Object.hasOwn(word, "wrong")
      ? Math.max(0, Number(word.wrong) || 0)
      : Math.max(0, Number(word.attempts) - Number(word.correct));
    misses[word.romaji] = (misses[word.romaji] || 0) + missed;
  }));
  return Object.entries(misses)
    .filter(([, missed]) => missed > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([romaji]) => romaji);
}

function renderCard() {
  const item = cards[index];
  if (!item) return finishLesson();
  const isIntroduction = studyMode === "introduction" && item.type === "intro";
  hintsEnabled = !isIntroduction && (hintsMode === "on" || hintsMode === "half");
  const card = studyMode === "introduction" ? item.card : item;
  const fields = directionFields(card);
  const isKanjiReadings = usesReadingFields(card);
  if (studyMode === "introduction") {
    progress.textContent = `${index + 1} of ${cards.length} · ${isIntroduction ? "new word" : "review"}`;
  } else if (studyMode === "fixed") {
    progress.textContent = `${cards.length} cards remaining`;
  } else {
    const mastered = sourceCards.length - cards.length;
    progress.textContent = `${cards.length} remaining · ${mastered} removed`;
  }
  questionLabel.textContent = fields.label;
  promptLabel.textContent = fields.instruction;
  promptWord.textContent = fields.prompt;
  document.querySelector(".card").classList.toggle("sentence-card", card.kind === "sentence");
  const original = document.querySelector("#sentence-original");
  original.hidden = !card.original;
  original.textContent = card.original || "";
  const answerLanguage = ["kana-english", "kanji-english"].includes(direction)
    ? "English"
    : ["english-romaji", "kana-romaji", "katakana-romaji", "kanji-word-romaji", "kanji-romaji"].includes(direction) ? "Romaji" : "Hiragana";
  answerInput.placeholder = `${answerLanguage} answer…`;
  answerInput.setAttribute("aria-label", `${answerLanguage} answer`);
  resultStatus.textContent = "";
  correction.textContent = "";
  result.className = "result";
  answerInput.value = "";
  answerInput.hidden = isIntroduction || isKanjiReadings;
  answerInput.disabled = isIntroduction || isKanjiReadings;
  readingAnswers.hidden = isIntroduction || !isKanjiReadings;
  readingAnswers.replaceChildren(...(isKanjiReadings ? Array.from({ length: 3 }, (_, readingIndex) => {
    const input = document.createElement("input");
    input.className = "reading-answer";
    input.type = "text";
    input.placeholder = `Reading ${readingIndex + 1}`;
    input.setAttribute("aria-label", `Romaji reading ${readingIndex + 1}`);
    input.setAttribute("autocapitalize", "none");
    input.setAttribute("spellcheck", "false");
    return input;
  }) : []));
  hintButton.hidden = isIntroduction || !hintsEnabled;
  retryButton.hidden = true;
  hintButton.disabled = false;
  hintLevel = 0;
  hintUsedForCurrent = false;
  fullHintUsedForCurrent = false;
  checkButton.disabled = false;
  checkButton.textContent = isIntroduction ? "Continue" : "Check answer";
  waitingForContinue = isIntroduction;

  if (isIntroduction) {
    questionLabel.textContent = "New word";
    promptLabel.textContent = card.meaning;
    promptWord.textContent = card.kind === "katakana" ? card.kana : card.romaji;
    resultStatus.textContent = card.kind === "katakana" ? card.romaji : card.kind === "kanji" ? fields.answer : card.kana || "";
    result.className = "result introduction";
    correction.textContent = "Study these readings. You will review them shortly.";
    checkButton.focus();
  } else {
    (isKanjiReadings ? readingAnswers.querySelector("input") : answerInput).focus();
  }
}

function introductionSequence(cardList) {
  const sequence = [];
  cardList.forEach((card, cardIndex) => {
    sequence.push({ type: "intro", card: { ...card } });
    if (cardIndex > 0) sequence.push({ type: "quiz", card: { ...cardList[cardIndex - 1] } });
  });
  if (cardList.length) sequence.push({ type: "quiz", card: { ...cardList.at(-1) } });
  return sequence;
}

function hintFor(answer) {
  return answer.replace(/[\p{L}\p{N}]+/gu, word => `${word[0]}${"•".repeat(Math.max(0, [...word].length - 1))}`);
}

function partialHintFor(answer) {
  return answer.replace(/[\p{L}\p{N}]+/gu, word => {
    const characters = [...word];
    const revealed = Math.min(characters.length, Math.max(2, Math.ceil(characters.length / 3)));
    return `${characters.slice(0, revealed).join("")}${"•".repeat(characters.length - revealed)}`;
  });
}

function answerLength(answer) {
  return [...answer].filter(character => /[\p{L}\p{N}]/u.test(character)).length;
}

function showHint() {
  if (!hintsEnabled || waitingForContinue || !cards[index]) return;
  const item = cards[index];
  const card = studyMode === "introduction" ? item.card : item;
  const answer = directionFields(card).answer;
  hintLevel = Math.min(3, hintLevel + 1);
  hintUsedForCurrent = true;
  if (hintLevel === 1) {
    const units = answerLength(answer);
    correction.textContent = `Hint 1: ${hintFor(answer)} · ${units} ${units === 1 ? "character" : "characters"}`;
  } else if (hintLevel === 2) {
    correction.textContent = `Hint 2: ${partialHintFor(answer)}`;
  } else if (direction === "english-romaji" && card.kana) {
    correction.textContent = `Full hint: ${card.kana}`;
  } else {
    correction.textContent = `Full hint: ${answer}`;
  }
  fullHintUsedForCurrent = hintLevel === 3;
  result.className = "result hint-visible";
  hintButton.disabled = fullHintUsedForCurrent;
  (usesReadingFields(card)
    ? readingAnswers.querySelector("input")
    : answerInput).focus();
}

function finishLesson() {
  const accuracy = attempts ? Math.round((correctAnswers / attempts) * 100) : 0;
  scorePercent.textContent = `${accuracy}%`;
  const assisted = hintedAnswers ? ` · ${hintedAnswers} correct with hints` : "";
  scoreDetails.textContent = `${correctAnswers} unassisted correct out of ${attempts} guesses${assisted} · ${targetLoops} ${targetLoops === 1 ? "loop" : "loops"} completed`;
  if (sentenceTotalTokens) {
    scorePercent.textContent = `${Number((100 * sentenceCorrectTokens / sentenceTotalTokens).toFixed(1))}%`;
    scoreDetails.textContent = `Token accuracy: ${sentenceCorrectTokens}/${sentenceTotalTokens} · ${scoreDetails.textContent}`;
  }
  wordChart.replaceChildren(...Object.values(wordStats).map(stat => {
    const guesses = stat.right + stat.wrong;
    const rate = guesses ? Math.round((stat.right / guesses) * 100) : 0;
    const row = document.createElement("div");
    row.className = "chart-row";

    const label = document.createElement("span");
    label.className = "chart-label";
    label.textContent = stat.romaji;
    label.title = `${stat.romaji} — ${stat.meaning}`;

    const track = document.createElement("div");
    track.className = "chart-track";
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.style.width = `${rate}%`;
    track.append(bar);

    const value = document.createElement("span");
    value.className = "chart-value";
    value.textContent = `${stat.right}/${stat.wrong} · ${rate}%`;
    value.title = `${stat.right} right, ${stat.wrong} wrong`;
    row.append(label, track, value);
    return row;
  }));
  showScreen("score");
  if (studyMode !== "introduction" && !historySaved) saveRunHistory();
}

async function saveRunHistory() {
  historySaved = true;
  try {
    const response = await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lesson: lessonSelect.value,
        mode: studyMode,
        direction,
        word_set: wordSetSelect.value,
        loops: targetLoops,
        correct: correctAnswers,
        attempts,
        words: Object.values(wordStats),
      }),
    });
    if (!response.ok) throw new Error("Could not save study history");
    history.push(await response.json());
    renderHistory();
  } catch (error) {
    message.textContent = error.message;
  }
}

function renderHistory() {
  const lesson = lessonSelect.value;
  const lessonName = lessonSelect.selectedOptions[0]?.textContent || "Lesson";
  const runs = history.filter(run => run.lesson === lesson && run.mode !== "introduction").reverse();
  historyTitle.textContent = `${lessonName} history`;
  historySummary.textContent = runs.length
    ? `${runs.length} completed ${runs.length === 1 ? "run" : "runs"}`
    : "No completed runs yet.";

  const totals = {};
  runs.forEach(run => (run.words || []).forEach(word => {
    // Records saved before right/wrong tracking treat all old guesses as right.
    const right = Object.hasOwn(word, "right")
      ? Math.max(0, Number(word.right) || 0)
      : Math.max(0, Number(word.attempts) || Number(word.correct) || 0);
    const wrong = Object.hasOwn(word, "wrong") ? Math.max(0, Number(word.wrong) || 0) : 0;
    if (!totals[word.romaji]) totals[word.romaji] = { romaji: word.romaji, meaning: word.meaning, right: 0, wrong: 0 };
    totals[word.romaji].right += right;
    totals[word.romaji].wrong += wrong;
  }));
  const ranked = Object.values(totals).sort((a, b) => {
    const aRate = a.right / Math.max(1, a.right + a.wrong);
    const bRate = b.right / Math.max(1, b.right + b.wrong);
    return aRate - bRate || b.wrong - a.wrong || a.romaji.localeCompare(b.romaji);
  });
  missedWords.replaceChildren(...(ranked.length ? ranked.map(word => {
    const item = document.createElement("span");
    item.className = "missed-word";
    const guesses = word.right + word.wrong;
    const rate = guesses ? Math.round((word.right / guesses) * 100) : 0;
    item.textContent = `${word.romaji} · ${word.right} right / ${word.wrong} wrong · ${rate}%`;
    item.title = word.meaning;
    return item;
  }) : [emptyMessage("No word results yet.")]));

  runHistory.replaceChildren(...(runs.length ? runs.slice(0, 10).map(run => {
    const accuracy = run.attempts ? Math.round((run.correct / run.attempts) * 100) : 0;
    const row = document.createElement("div");
    row.className = "run-row";
    const details = document.createElement("div");
    const date = new Date(run.timestamp);
    details.textContent = date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    const meta = document.createElement("div");
    meta.className = "run-meta";
    const setName = run.word_set === "crucial" ? "crucial words" : "all words";
    meta.textContent = `${run.correct}/${run.attempts} · ${setName} · ${run.direction} · ${run.loops} ${run.loops === 1 ? "loop" : "loops"}`;
    details.append(meta);
    const score = document.createElement("span");
    score.className = "run-score";
    score.textContent = `${accuracy}%`;
    row.append(details, score);
    return row;
  }) : [emptyMessage("Completed runs will appear here.")]));
}

function emptyMessage(text) {
  const item = document.createElement("span");
  item.className = "empty-history";
  item.textContent = text;
  return item;
}

async function loadHistory() {
  try {
    const response = await fetch("/api/history");
    if (!response.ok) throw new Error("Could not load study history");
    history = await response.json();
    renderHistory();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function startLesson() {
  try {
    message.textContent = "";
    startButton.disabled = true;
    const response = await fetch(`/api/lessons/${encodeURIComponent(lessonSelect.value)}`);
    if (!response.ok) throw new Error((await response.json()).error || "Could not load lesson");
    sourceCards = await response.json();
    if (wordSetSelect.value === "crucial") {
      const crucialWords = new Set(crucialWordsForLesson(lessonSelect.value));
      sourceCards = sourceCards.filter(card => crucialWords.has(card.romaji));
      if (!sourceCards.length) {
        throw new Error("No missed words yet. Complete a regular run first to build crucial-word practice.");
      }
    }
    targetLoops = Number(loopsSelect.value);
    studyMode = modeSelect.value;
    direction = directionSelect.value;
    if (direction === "kanji-romaji") {
      sourceCards = sourceCards.filter(card => ["kanji", "kanji-word"].includes(card.kind));
      if (!sourceCards.length) {
        throw new Error("This lesson has no kanji cards. Choose a kanji lesson, such as Lesson 4 or Lesson 4-2.");
      }
      if (sourceCards.some(card => !card.kana.trim())) {
        throw new Error("This lesson is missing kanji readings in the third CSV column.");
      }
    }
    if (direction === "katakana-romaji") {
      sourceCards = sourceCards.filter(card => card.kind === "katakana");
      if (!sourceCards.length) throw new Error("Choose Learn Katakana to practice katakana characters.");
    }
    hintsMode = hintsSelect.value;
    hintsEnabled = false;
    if (studyMode === "introduction") targetLoops = 1;
    if ((direction.startsWith("kana") || direction === "english-kana") && sourceCards.some(card => !card.kana)) {
      throw new Error("This lesson is missing kana in the third CSV column.");
    }
    let orderedCards = sourceCards.map(card => ({ ...card }));
    if (hintsMode === "half") {
      if (shuffleSelect.value === "yes") shuffleCards(orderedCards);
      orderedCards = orderedCards.slice(0, Math.max(1, Math.floor(orderedCards.length / 2)));
      sourceCards = orderedCards.map(card => ({ ...card }));
    }
    if (shuffleSelect.value === "yes") shuffleCards(orderedCards);
    wordStats = Object.fromEntries(orderedCards.map(card => [card.romaji, {
      romaji: card.romaji,
      meaning: card.meaning,
      attempts: 0,
      correct: 0,
      right: 0,
      wrong: 0,
      hinted: 0,
    }]));
    cards = studyMode === "introduction"
      ? introductionSequence(orderedCards)
      : studyMode === "fixed"
        ? Array.from({ length: targetLoops }, () => orderedCards.map(card => ({ ...card }))).flat()
        : orderedCards.map(card => ({ ...card, correctCount: 0 }));
    index = 0;
    sentenceCorrectTokens = 0;
    sentenceTotalTokens = 0;
    attempts = 0;
    correctAnswers = 0;
    hintedAnswers = 0;
    advancing = false;
    waitingForContinue = false;
    historySaved = false;
    showScreen("study");
    renderCard();
  } catch (error) {
    message.textContent = error.message;
  } finally {
    startButton.disabled = false;
  }
}

function checkAnswer() {
  const item = cards[index];
  const card = studyMode === "introduction" ? item?.card : item;
  if (waitingForContinue) {
    advanceCard(pendingCorrect, card);
    return;
  }
  if (!card || advancing) return;

  const fields = directionFields(card);
  const suppliedReadings = [...readingAnswers.querySelectorAll("input")]
    .map(input => normalize(input.value))
    .filter(Boolean);
  const isKanjiReadings = usesReadingFields(card);
  if (isKanjiReadings ? !suppliedReadings.length : !answerInput.value.trim()) return;
  const expectedReadings = (fields.answers || []).map(normalize).sort();
  const sentenceResult = card.kind === "sentence" ? compare(answerInput.value, fields.answer) : null;
  if (sentenceResult) {
    sentenceCorrectTokens += sentenceResult.correct;
    sentenceTotalTokens += sentenceResult.total;
  }
  const correct = sentenceResult ? sentenceResult.correct === sentenceResult.total : isKanjiReadings
    ? suppliedReadings.length === expectedReadings.length
      && suppliedReadings.sort().every((reading, readingIndex) => reading === expectedReadings[readingIndex])
    : direction === "kanji-romaji" || (card.kind === "kanji" && direction === "kanji-english")
      ? expectedReadings.includes(normalize(answerInput.value))
    : normalize(answerInput.value) === normalize(fields.answer);
  attempts += 1;
  wordStats[card.romaji].attempts += 1;
  if (correct) {
    wordStats[card.romaji].right += 1;
    if (hintUsedForCurrent) {
      hintedAnswers += 1;
      wordStats[card.romaji].hinted += 1;
    } else {
      correctAnswers += 1;
      wordStats[card.romaji].correct += 1;
      if (studyMode === "removal") card.correctCount += 1;
    }
  } else {
    wordStats[card.romaji].wrong += 1;
  }

  advancing = true;
  result.className = `result ${correct ? "correct" : "incorrect"}`;
  resultStatus.textContent = correct
    ? hintUsedForCurrent ? "Correct with hint" : "Correct!"
    : "Not quite";
  correction.replaceChildren();
  const answerLine = document.createElement("span");
  answerLine.textContent = isKanjiReadings
    ? `Readings: ${fields.answer}`
    : ["english-romaji", "kana-romaji", "katakana-romaji", "kanji-word-romaji", "kanji-romaji"].includes(direction)
    ? `Romaji: ${fields.answer}`
    : `Answer: ${fields.answer}`;
  if (sentenceResult) {
    const tokens = document.createElement("span");
    tokens.className = "sentence-tokens";
    for (const token of sentenceResult.tokens) {
      const word = document.createElement("span");
      word.className = token.correct ? "token-correct" : "token-incorrect";
      word.textContent = token.text;
      word.setAttribute("aria-label", `${token.correct ? "Correct" : "Incorrect"}: ${token.text}`);
      tokens.append(word);
    }
    correction.append(tokens);
    answerLine.textContent = `Correct answer: ${fields.answer}`;
    resultStatus.textContent += ` · ${Number((100 * sentenceResult.correct / sentenceResult.total).toFixed(1))}%`;
  }
  correction.append(answerLine);
  if (["english-romaji", "kana-romaji", "katakana-romaji", "kanji-word-romaji", "kanji-romaji"].includes(direction) && card.kind !== "kanji") {
    const kanaLine = document.createElement("strong");
    kanaLine.className = "revealed-kana";
    kanaLine.textContent = `${card.kind === "sentence" ? "Japanese" : (card.kind === "katakana" || /^[\p{Script=Katakana}ー]+$/u.test(card.kana)) ? "Katakana" : "Hiragana"}: `;
    if (sentenceResult && card.kana_tokens?.length === tokenize(fields.answer).length) {
      kanaLine.classList.add("sentence-kana");
      for (const token of sentenceResult.tokens) {
        if (token.expectedIndex === undefined) continue;
        const segment = document.createElement("span");
        segment.className = token.correct ? "token-correct" : "token-incorrect";
        segment.textContent = card.kana_tokens[token.expectedIndex];
        const status = token.correct ? "Correct" : token.missing ? "Missing" : "Incorrect";
        segment.title = `${status}: ${tokenize(fields.answer)[token.expectedIndex]}`;
        segment.setAttribute("aria-label", `${status}: ${segment.textContent}`);
        if (card.token_meanings?.[token.expectedIndex]) {
          const reading = document.createElement("small");
          reading.textContent = fields.answer.split(/\s+/)[token.expectedIndex];
          const meaning = document.createElement("small");
          meaning.textContent = card.token_meanings[token.expectedIndex];
          segment.append(reading, meaning);
          segment.setAttribute("aria-label", `${status}: ${segment.textContent}`);
        }
        kanaLine.append(segment);
      }
    } else {
      kanaLine.append(document.createTextNode(card.kana));
    }
    correction.append(kanaLine);
    if (card.kind === "reading-word") {
      const meaningLine = document.createElement("span");
      meaningLine.textContent = `Meaning: ${card.meaning}`;
      correction.append(meaningLine);
    }
    if (sentenceResult && card.grammar_note) {
      const note = document.createElement("span");
      note.className = "sentence-explanation";
      note.textContent = card.grammar_note;
      correction.append(note);
    }
  }
  if (direction === "english-romaji" && card.kind === "kanji-word") {
    const kanjiLine = document.createElement("strong");
    kanjiLine.className = "revealed-kana";
    kanjiLine.textContent = `Kanji: ${card.romaji}`;
    correction.append(kanjiLine);
  }
  answerInput.disabled = true;
  readingAnswers.querySelectorAll("input").forEach(input => { input.disabled = true; });
  hintButton.hidden = true;

  pendingCorrect = correct;
  waitingForContinue = true;
  checkButton.textContent = card.kind === "sentence" ? "Next" : "Continue";
  retryButton.hidden = card.kind !== "sentence" || !hintsEnabled;
  checkButton.disabled = false;
  checkButton.focus();
}

function advanceCard(correct, card) {
  // Sentence fixed loops honor the selected number of attempts, including mistakes.
  if (card.kind === "sentence" && studyMode === "fixed") {
    cards.shift();
    index = 0;
    advancing = false;
    waitingForContinue = false;
    renderCard();
    return;
  }
  if (!correct) {
    if (card.kind === "kanji" && hintsEnabled) {
      advancing = false;
      waitingForContinue = false;
      advanceTimer = null;
      renderCard();
      return;
    }
    // With hints, show one different card before retrying a missed word.
    // Without hints, put the missed word at a random point in the remaining deck.
    if (hintsEnabled) {
      if (studyMode === "introduction") {
        cards.splice(Math.min(index + 2, cards.length), 0, { type: "quiz", card: { ...card } });
        index += 1;
      } else {
        cards.shift();
        cards.splice(Math.min(1, cards.length), 0, card);
        index = 0;
      }
    } else if (studyMode === "introduction") {
      const firstRetryAt = Math.min(index + 2, cards.length);
      const retryAt = firstRetryAt + Math.floor(Math.random() * (cards.length - firstRetryAt + 1));
      cards.splice(retryAt, 0, { type: "quiz", card: { ...card } });
      index += 1;
    } else {
      cards.shift();
      const retryAt = cards.length ? 1 + Math.floor(Math.random() * cards.length) : 0;
      cards.splice(retryAt, 0, card);
      index = 0;
    }
    advancing = false;
    waitingForContinue = false;
    advanceTimer = null;
    renderCard();
    return;
  }
  if (studyMode === "introduction") {
    if (hintUsedForCurrent) {
      cards.splice(Math.min(index + 3, cards.length), 0, { type: "quiz", card: { ...card } });
    }
    index += 1;
  } else {
    // Removal and fixed modes use the deck as a queue. A hinted word is
    // scheduled behind the next two cards so it can be recalled soon.
    cards.shift();
    if (hintUsedForCurrent) {
      cards.splice(Math.min(2, cards.length), 0, card);
    } else if (studyMode === "removal" && !(correct && card.correctCount >= targetLoops)) {
      cards.push(card);
    }
    index = 0;
  }
  advancing = false;
  waitingForContinue = false;
  advanceTimer = null;
  renderCard();
}

function goHome() {
  if (advanceTimer) window.clearTimeout(advanceTimer);
  advanceTimer = null;
  advancing = false;
  waitingForContinue = false;
  cards = [];
  message.textContent = "";
  showScreen("home");
}

async function loadLessons() {
  try {
    const response = await fetch("/api/lessons");
    const lessons = await response.json();
    if (!lessons.length) throw new Error("No lesson CSV files were found.");
    lessonSelect.replaceChildren(...lessons.map(lesson => {
      const option = document.createElement("option");
      option.value = lesson.file;
      option.textContent = lesson.name;
      return option;
    }));
    const savedLesson = new URLSearchParams(window.location.search).get("lesson") || savedLessonSelection();
    if (savedLesson && lessons.some(lesson => lesson.file === savedLesson)) {
      lessonSelect.value = savedLesson;
    }
    selectLessonDirection();
    await loadHistory();
  } catch (error) {
    message.textContent = error.message;
    startButton.disabled = true;
  }
}

answerForm.addEventListener("submit", event => {
  event.preventDefault();
  checkAnswer();
});
readingAnswers.addEventListener("keydown", event => {
  const inputs = [...readingAnswers.querySelectorAll("input:not(:disabled)")];
  const currentIndex = inputs.indexOf(event.target);
  if (currentIndex < 0) return;
  const movement = ["ArrowRight", "ArrowDown"].includes(event.key)
    ? 1
    : ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
  if (!movement) return;
  const nextIndex = Math.max(0, Math.min(inputs.length - 1, currentIndex + movement));
  if (nextIndex === currentIndex) return;
  event.preventDefault();
  inputs[nextIndex].focus();
  inputs[nextIndex].select();
});
startButton.addEventListener("click", startLesson);
restartButton.addEventListener("click", startLesson);
homeButton.addEventListener("click", goHome);
lessonSelect.addEventListener("change", () => {
  saveLessonSelection(lessonSelect.value);
  selectLessonDirection();
  renderHistory();
});
modeSelect.addEventListener("change", () => {
  loopsSelect.disabled = modeSelect.value === "introduction";
  modeHelp.textContent = modeSelect.value === "introduction"
    ? "See each new word first, then review the previous word after the next introduction."
    : modeSelect.value === "fixed"
      ? "Every word appears once per loop, then leaves whether your answer is right or wrong."
      : "A word leaves the deck after you answer it correctly this many times.";
});
hintButton.addEventListener("click", showHint);
retryButton.addEventListener("click", () => {
  if (!waitingForContinue || retryButton.hidden) return;
  advancing = false;
  waitingForContinue = false;
  pendingCorrect = false;
  renderCard();
  // The correct answer was just revealed; count this immediate retry as assisted.
  hintUsedForCurrent = true;
});
document.addEventListener("keydown", event => {
  if (event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLocaleLowerCase() === "h"
      && !studyScreen.hidden && hintsEnabled && !hintButton.hidden) {
    event.preventDefault();
    showHint();
  }
});

loadLessons();
