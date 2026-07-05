import { useState, useMemo, useEffect } from "react";
import { quotes } from "./gameData";
import "./App.css";

/* ---------------------------
   FUZZY MATCHING ENGINE
----------------------------*/
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : Math.min(
              dp[i - 1][j + 1],
              dp[i][j - 1] + 1,
              dp[i - 1][j - 1] + 1
            );
    }
  }

  return dp[a.length][b.length];
}

function isFuzzyMatch(input, target) {
  const a = input.toLowerCase().trim();
  const b = target.toLowerCase().trim();
  const dist = levenshtein(a, b);
  return dist <= Math.max(2, Math.floor(b.length * 0.2));
}

function getNameParts(fullName) {
  const parts = fullName.trim().split(" ");
  return {
    first: parts[0] || "",
    last: parts.length > 1 ? parts[parts.length - 1] : ""
  };
}

function evaluateGuess(guess, answer) {
  const g = guess.trim().toLowerCase().split(" ");
  const a = getNameParts(answer);

  const firstMatch = isFuzzyMatch(g[0] || "", a.first.toLowerCase());
  const lastMatch = isFuzzyMatch(g[g.length - 1] || "", a.last.toLowerCase());

  if (firstMatch && lastMatch) return { status: "correct", label: "🟩 Correct" };
  if (firstMatch) return { status: "partial", label: "🟨 First name correct" };
  if (lastMatch) return { status: "partial", label: "🟨 Surname correct" };
  return { status: "wrong", label: "⬜ Wrong" };
}

/* ---------------------------
   DATA
----------------------------*/
function getTodayQuote() {
  const today = new Date().toLocaleDateString("en-CA");
  return quotes.find(q => q.date === today) || quotes[0];
}

function getTodayKey() {
  return new Date().toLocaleDateString("en-CA");
}

/* ---------------------------
   APP
----------------------------*/
export default function App() {
  const quote = useMemo(() => getTodayQuote(), []);
  const todayKey = getTodayKey();

  const [guess, setGuess] = useState("");

  const [guesses, setGuesses] = useState(() =>
    JSON.parse(localStorage.getItem(`guesses-${todayKey}`) || "[]")
  );

  const [evaluations, setEvaluations] = useState(() =>
    JSON.parse(localStorage.getItem(`eval-${todayKey}`) || "[]")
  );

  const [messages, setMessages] = useState(() =>
    JSON.parse(localStorage.getItem(`msg-${todayKey}`) || "[]")
  );

  const [streak, setStreak] = useState(() =>
    Number(localStorage.getItem("streak") || 0)
  );

  const [gameOver, setGameOver] = useState(
    localStorage.getItem(`gameover-${todayKey}`) === "true"
  );

  const attempts = guesses.length;

  /* WIN STATE (NEW DERIVED VALUE) */
  const didWin = evaluations.includes("correct");

  /* SAVE */
  useEffect(() => {
    localStorage.setItem(`guesses-${todayKey}`, JSON.stringify(guesses));
    localStorage.setItem(`eval-${todayKey}`, JSON.stringify(evaluations));
    localStorage.setItem(`msg-${todayKey}`, JSON.stringify(messages));
    localStorage.setItem(`gameover-${todayKey}`, gameOver);
  }, [guesses, evaluations, messages, gameOver, todayKey]);

  useEffect(() => {
    localStorage.setItem("streak", streak);
  }, [streak]);

  const clueText = quote?.clue ?? quote?.hint ?? "No clue available";

  const hintOrder = [
    `🌍 Nationality: ${quote?.nationality ?? "Unknown"}`,
    `⚧ Gender: ${quote?.gender ?? "Unknown"}`,
    `📅 Year: ${quote?.year ?? "Unknown"}`,
    `📍 Place: ${quote?.place ?? "Unknown"}`,
    `❔ Clue: ${clueText}`

  ];

  const hints = hintOrder.slice(0, Math.max(0, attempts));

  function shareText() {
    let t = `QUOTLE ${todayKey}\n\n`;
    evaluations.forEach(e => (t += e === "correct" ? "🟩\n" : "🟨\n"));
    t += `\nAttempts: ${attempts}/6`;
    t += `\nStreak: ${streak}`;
    return t;
  }

  function handleSubmit() {
    if (gameOver) return;

    const clean = guess.trim();
    if (!clean) return;

    const result = evaluateGuess(clean, quote.answer);

    const newGuesses = [...guesses, clean];
    const newEval = [...evaluations, result.status];
    const newMsg = [...messages, result.label];

    setGuesses(newGuesses);
    setEvaluations(newEval);
    setMessages(newMsg);

    if (result.status === "correct") {
      setGameOver(true);
      setStreak(prev => prev + 1);
      setGuess("");
      return;
    }

    if (newGuesses.length >= 6) {
      setGameOver(true);
      setGuess("");
      return;
    }

    setGuess("");
  }

  /* ---------------------------
     UI
  ----------------------------*/
  return (
    <main className="quotle-page">
      <section className="game-shell" aria-labelledby="page-title">
        <header className="page-header">
          <h1 id="page-title">Quotle</h1>
        </header>

        {/* STATS */}
        <div className="stats-bar">
          <div>🎯 {attempts}/6</div>
          <div>🔥 {streak}</div>
          <div>{gameOver ? "DONE" : "LIVE"}</div>
        </div>

        {/* WIN / LOSE END SCREEN (NEW) */}
        {gameOver && (
          <div className={`end-screen ${didWin ? "end-screen-win" : "end-screen-lose"}`}>
            {didWin ? (
              <>
                <h2>🎉 Victory!</h2>
                <p>You got it!</p>
              </>
            ) : (
              <>
                <h2>😈 Defeat</h2>
                <p>The correct answer was:</p>
              </>
            )}

            <h3>{quote.answer}</h3>
          </div>
        )}

        {/* QUOTE */}
        <div className="quote-card">
          “{quote.text}”
        </div>

        {/* INPUT */}
        <div className="guess-form">
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={gameOver}
            aria-label="Guess the speaker"
          />

          <button
            onClick={handleSubmit}
            disabled={gameOver}
          >
            Submit
          </button>
        </div>

        {/* BOARD */}
        <div className="panel guesses-panel">
          <h3>🧾 Guesses</h3>

          {guesses.map((g, i) => (
            <div
              key={i}
              className={`guess-row ${evaluations[i] === "correct" ? "guess-row-correct" : ""}`}
            >
              <span>{g}</span>
              <span>{messages[i]}</span>
            </div>
          ))}
        </div>

        {/* HINTS */}
        <div className="panel hints-panel">
          <h3>💡 Hints</h3>
          {hints.map((h, i) => (
            <div key={i} className="hint-row">
              {h}
            </div>
          ))}
        </div>

        {/* SHARE */}
        {gameOver && (
          <div className="panel share-panel">
            <h3>📤 Share</h3>

            <pre>
              {shareText()}
            </pre>

            <button
              onClick={() => navigator.clipboard.writeText(shareText())}
            >
              Copy Share
            </button>
          </div>
        )}

      </section>
    </main>
  );
}
