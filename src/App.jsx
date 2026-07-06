import { useEffect, useMemo, useState } from "react";
import { difficultyQuotes } from "./gameData";
import { evaluateGuess, getTodayKey } from "./gameLogic";
import "./App.css";

function getTodayQuote(difficulty) {
  const today = getTodayKey();
  return difficultyQuotes[difficulty].find((quote) => quote.date === today) || difficultyQuotes[difficulty][0] || null;
}

function getDifficultyLabel(difficulty) {
  return {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard"
  }[difficulty] || difficulty;
}

function getNextMidnight() {
  const next = new Date();
  next.setHours(24, 0, 0, 0);
  return next;
}

function formatTimeLeft(targetTime) {
  const difference = Math.max(0, targetTime - Date.now());
  const hours = Math.floor(difference / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function HomeScreen({ onSelectDifficulty }) {
  const [timeLeft, setTimeLeft] = useState(() => formatTimeLeft(getNextMidnight()));

  useEffect(() => {
    const targetTime = getNextMidnight();
    const timer = window.setInterval(() => {
      const nextTarget = getNextMidnight();
      if (Date.now() >= nextTarget.getTime()) {
        setTimeLeft(formatTimeLeft(getNextMidnight()));
      } else {
        setTimeLeft(formatTimeLeft(nextTarget));
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="quotle-page">
      <section className="home-shell" aria-labelledby="home-title">
        <header className="page-header">
          <h1 id="home-title">Quotle</h1>
          <p className="page-subtitle">Choose a difficulty and test your quote-guessing skills.</p>
        </header>

        <div className="countdown-banner" role="status" aria-live="polite">
          <span className="countdown-label">New quotes released</span>
          <span className="countdown-value">{timeLeft}</span>
        </div>

        <div className="home-card">
          <h2>Welcome to Quotle</h2>
          <p>Pick a mode for today’s quote challenge. Each difficulty keeps its own score and streak.</p>
          <p>Read the quote and guess the full name of who said it!</p>
          <p>Good luck!</p>

          <div className="difficulty-grid">
            <button type="button" className="difficulty-button" onClick={() => onSelectDifficulty("easy")}>
              Easy
            </button>
            <button type="button" className="difficulty-button" onClick={() => onSelectDifficulty("medium")}>
              Medium
            </button>
            <button type="button" className="difficulty-button" onClick={() => onSelectDifficulty("hard")}>
              Hard
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function GameScreen({ difficulty, onHome }) {
  const quote = useMemo(() => getTodayQuote(difficulty), [difficulty]);
  const todayKey = getTodayKey();

  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(`guesses-${difficulty}-${todayKey}`) || "[]");
  });
  const [evaluations, setEvaluations] = useState(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(`eval-${difficulty}-${todayKey}`) || "[]");
  });
  const [messages, setMessages] = useState(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(`msg-${difficulty}-${todayKey}`) || "[]");
  });
  const [score, setScore] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(`score-${difficulty}`) || 0);
  });
  const [streak, setStreak] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(`streak-${difficulty}`) || 0);
  });
  const [gameOver, setGameOver] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`gameover-${difficulty}-${todayKey}`) === "true";
  });

  const attempts = guesses.length;
  const didWin = evaluations.includes("correct");

  useEffect(() => {
    localStorage.setItem(`guesses-${difficulty}-${todayKey}`, JSON.stringify(guesses));
    localStorage.setItem(`eval-${difficulty}-${todayKey}`, JSON.stringify(evaluations));
    localStorage.setItem(`msg-${difficulty}-${todayKey}`, JSON.stringify(messages));
    localStorage.setItem(`gameover-${difficulty}-${todayKey}`, gameOver);
  }, [difficulty, evaluations, gameOver, guesses, messages, todayKey]);

  useEffect(() => {
    localStorage.setItem(`score-${difficulty}`, String(score));
    localStorage.setItem(`streak-${difficulty}`, String(streak));
  }, [difficulty, score, streak]);

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
    let text = `QUOTLE ${getDifficultyLabel(difficulty)} ${todayKey}\n\n`;
    evaluations.forEach((entry) => {
      if (entry === "correct") {
        text += "🟩\n";
      } else if (entry === "partial") {
        text += "🟨\n";
      } else {
        text += "⬜\n";
      }
    });
    text += `\nAttempts: ${attempts}/6`;
    text += `\nScore: ${score}`;
    text += `\nStreak: ${streak}`;
    return text;
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
      setScore((prev) => prev + 1);
      setStreak((prev) => prev + 1);
      setGuess("");
      return;
    }

    if (newGuesses.length >= 6) {
      setGameOver(true);
      setStreak(0);
      setGuess("");
      return;
    }

    setGuess("");
  }

  return (
    <main className="quotle-page">
      <section className="game-shell" aria-labelledby="page-title">
        <header className="page-header">
          <button type="button" className="home-button" onClick={onHome}>
            🏠 Home
          </button>
          <h1 id="page-title">Quotle</h1>
          <p className="page-subtitle">{getDifficultyLabel(difficulty)} mode</p>
        </header>

        <div className="stats-bar">
          <div>🎯 {attempts}/6</div>
          <div>🏅 {score}</div>
          <div>🔥 {streak}</div>
          <div>{gameOver ? "DONE" : "LIVE"}</div>
        </div>

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

        <div className="quote-card">“{quote.text}”</div>

        <div className="guess-form">
          <input
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
            disabled={gameOver}
            aria-label="Guess the speaker"
          />

          <button type="button" onClick={handleSubmit} disabled={gameOver}>
            Submit
          </button>
        </div>

        <div className="panel guesses-panel">
          <h3>🧾 Guesses</h3>

          {guesses.map((entry, index) => (
            <div
              key={`${entry}-${index}`}
              className={`guess-row ${evaluations[index] === "correct" ? "guess-row-correct" : ""}`}
            >
              <span>{entry}</span>
              <span>{messages[index]}</span>
            </div>
          ))}
        </div>

        <div className="panel hints-panel">
          <h3>💡 Hints</h3>
          {hints.map((hint, index) => (
            <div key={`${hint}-${index}`} className="hint-row">
              {hint}
            </div>
          ))}
        </div>

        {gameOver && (
          <div className="panel share-panel">
            <h3>📤 Share</h3>
            <pre>{shareText()}</pre>
            <button type="button" onClick={() => navigator.clipboard.writeText(shareText())}>
              Copy Share
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const [difficulty, setDifficulty] = useState("easy");

  return view === "home" ? (
    <HomeScreen onSelectDifficulty={(selectedDifficulty) => {
      setDifficulty(selectedDifficulty);
      setView("game");
    }} />
  ) : (
    <GameScreen difficulty={difficulty} onHome={() => setView("home")} />
  );
}
