function normalizeText(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, " ").trim();
}

export function levenshtein(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  const dp = Array.from({ length: left.length + 1 }, () =>
    Array(right.length + 1).fill(0)
  );

  for (let i = 0; i <= left.length; i++) dp[i][0] = i;
  for (let j = 0; j <= right.length; j++) dp[0][j] = j;

  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      dp[i][j] =
        left[i - 1] === right[j - 1]
          ? dp[i - 1][j - 1]
          : Math.min(
              dp[i - 1][j] + 1,
              dp[i][j - 1] + 1,
              dp[i - 1][j - 1] + 1
            );
    }
  }

  return dp[left.length][right.length];
}

export function isFuzzyMatch(input, target) {
  const a = normalizeText(input);
  const b = normalizeText(target);

  if (!a || !b) return false;
  if (a === b) return true;

  const dist = levenshtein(a, b);
  const maxDistance = Math.max(2, Math.floor(b.length * 0.25));
  return dist <= maxDistance;
}

export function getNameParts(fullName) {
  const parts = normalizeText(fullName).split(/\s+/).filter(Boolean);
  return {
    first: parts[0] || "",
    last: parts.length > 1 ? parts[parts.length - 1] : ""
  };
}

export function evaluateGuess(guess, answer) {
  const normalizedGuess = normalizeText(guess);
  const normalizedAnswer = normalizeText(answer);

  if (normalizedGuess === normalizedAnswer) {
    return { status: "correct", label: "🟩 Correct" };
  }

  const g = normalizedGuess.split(/\s+/).filter(Boolean);
  const a = getNameParts(answer);

  const firstMatch = isFuzzyMatch(g[0] || "", a.first);
  const lastMatch = isFuzzyMatch(g[g.length - 1] || "", a.last);

  if (firstMatch && lastMatch) return { status: "correct", label: "🟩 Correct" };
  if (firstMatch) return { status: "partial", label: "🟨 First name correct" };
  if (lastMatch) return { status: "partial", label: "🟨 Surname correct" };
  return { status: "wrong", label: "⬜ Wrong" };
}

export function getTodayKey(today = new Date()) {
  return today.toLocaleDateString("en-CA");
}
