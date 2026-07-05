import { useState, useMemo, useEffect } from "react";
import { quotes } from "./gameData";

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

  const hintOrder = [
    `🌍 Nationality: ${quote.nationality}`,
    `⚧ Gender: ${quote.gender}`,
    `📅 Year: ${quote.year}`,
    `📍 Place: ${quote.place}`
  ];

  const hints = hintOrder.slice(0, Math.max(0, attempts - 1));

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
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#0f172a,#1e293b)",
      color: "white",
      fontFamily: "system-ui",
      padding: 24,
      display: "flex",
      justifyContent: "center"
    }}>
      <div style={{ maxWidth: 520, width: "100%" }}>

        <h1 style={{ textAlign: "center", letterSpacing: 3 }}>
          QUOTLE
        </h1>

        {/* STATS */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          background: "rgba(255,255,255,0.06)",
          padding: 12,
          borderRadius: 12,
          marginBottom: 16
        }}>
          <div>🎯 {attempts}/6</div>
          <div>🔥 {streak}</div>
          <div>{gameOver ? "DONE" : "LIVE"}</div>
        </div>

        {/* WIN / LOSE END SCREEN (NEW) */}
        {gameOver && (
          <div style={{
            padding: 20,
            borderRadius: 14,
            marginBottom: 16,
            textAlign: "center",
            background: didWin
              ? "linear-gradient(135deg, rgba(34,197,94,0.3), rgba(16,185,129,0.2))"
              : "linear-gradient(135deg, rgba(239,68,68,0.25), rgba(127,29,29,0.35))",
            boxShadow: didWin
              ? "0 0 30px rgba(34,197,94,0.3)"
              : "0 0 30px rgba(239,68,68,0.25)",
            animation: "pop 0.5s ease"
          }}>
            <style>{`
              @keyframes pop {
                0% { transform: scale(0.9); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
              }
            `}</style>

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

            <h3 style={{ marginTop: 10 }}>
              {quote.answer}
            </h3>
          </div>
        )}

        {/* QUOTE */}
        <div style={{
          background: "rgba(255,255,255,0.06)",
          padding: 16,
          borderRadius: 14,
          marginBottom: 14,
          textAlign: "center",
          fontStyle: "italic"
        }}>
          “{quote.text}”
        </div>

        {/* INPUT */}
        <div style={{ display: "flex", gap: 10 }}>
          <input
            style={{ flex: 1, padding: 12, borderRadius: 10, border: "none" }}
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={gameOver}
          />

          <button
            onClick={handleSubmit}
            disabled={gameOver}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              background: "#6366f1",
              color: "white"
            }}
          >
            Submit
          </button>
        </div>

        {/* BOARD */}
        <div style={{
          marginTop: 16,
          background: "rgba(255,255,255,0.06)",
          padding: 16,
          borderRadius: 14
        }}>
          <h3>🧾 Guesses</h3>

          {guesses.map((g, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: "space-between",
              padding: 10,
              marginTop: 6,
              borderRadius: 10,
              background:
                evaluations[i] === "correct"
                  ? "rgba(34,197,94,0.25)"
                  : "rgba(255,255,255,0.04)"
            }}>
              <span>{g}</span>
              <span>{messages[i]}</span>
            </div>
          ))}
        </div>

        {/* HINTS */}
        <div style={{
          marginTop: 14,
          background: "rgba(99,102,241,0.12)",
          padding: 16,
          borderRadius: 14
        }}>
          <h3>💡 Hints</h3>
          {hints.map((h, i) => (
            <div key={i} style={{ marginTop: 6 }}>
              {h}
            </div>
          ))}
        </div>

        {/* SHARE */}
        {gameOver && (
          <div style={{
            marginTop: 14,
            background: "rgba(255,255,255,0.06)",
            padding: 16,
            borderRadius: 14
          }}>
            <h3>📤 Share</h3>

            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
              {shareText()}
            </pre>

            <button
              onClick={() => navigator.clipboard.writeText(shareText())}
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 10,
                border: "none",
                background: "#22c55e",
                color: "black",
                fontWeight: "bold"
              }}
            >
              Copy Share
            </button>
          </div>
        )}

      </div>
    </div>
  );
}