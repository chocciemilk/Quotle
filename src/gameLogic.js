export function levenshtein(a, b) {
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

export function isFuzzyMatch(input, target) {
  const a = input.toLowerCase().trim();
  const b = target.toLowerCase().trim();
  const dist = levenshtein(a, b);
  return dist <= Math.max(2, Math.floor(b.length * 0.2));
}

export function getNameParts(fullName) {
  const parts = fullName.trim().split(" ");
  return {
    first: parts[0] || "",
    last: parts.length > 1 ? parts[parts.length - 1] : ""
  };
}

export function evaluateGuess(guess, answer) {
  const g = guess.trim().toLowerCase().split(" ");
  const a = getNameParts(answer);

  const firstMatch = isFuzzyMatch(g[0] || "", a.first.toLowerCase());
  const lastMatch = isFuzzyMatch(g[g.length - 1] || "", a.last.toLowerCase());

  if (firstMatch && lastMatch) return { status: "correct", label: "🟩 Correct" };
  if (firstMatch) return { status: "partial", label: "🟨 First name correct" };
  if (lastMatch) return { status: "partial", label: "🟨 Surname correct" };
  return { status: "wrong", label: "⬜ Wrong" };
}

export function getTodayKey(today = new Date()) {
  return today.toLocaleDateString("en-CA");
}
