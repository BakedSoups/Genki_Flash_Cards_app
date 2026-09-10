function tokenize(value) {
  return value.normalize('NFC').replace(/[\p{Pd}'’]/gu, '').replace(/[\p{P}\p{S}]/gu, ' ')
    // Honorific spacing is optional; particles remain separate tokens.
    .replace(/\b([\p{L}]+)\s+san\b/giu, '$1san')
    .trim().split(/\s+/u).filter(Boolean);
}
function normalizeToken(value) {
  const longVowels = {ā:'aa', ī:'ii', ū:'uu', ē:'ee', ō:'oo'};
  return value.toLowerCase().replace(/[āīūēō]/g, c => longVowels[c]).replace(/ou/g, 'oo');
}

// Edit-distance alignment keeps later words aligned after omissions or additions.
function compare(answer, expected) {
  const actual = tokenize(answer), target = tokenize(expected);
  const same = (i, j) => normalizeToken(actual[i]) === normalizeToken(target[j]);
  const dp = Array.from({length: actual.length + 1}, () => Array(target.length + 1).fill(0));
  for (let i = 0; i <= actual.length; i++) dp[i][0] = i;
  for (let j = 0; j <= target.length; j++) dp[0][j] = j;
  for (let i = 1; i <= actual.length; i++) {
    for (let j = 1; j <= target.length; j++) {
      dp[i][j] = Math.min(dp[i-1][j-1] + (same(i-1,j-1) ? 0 : 1), dp[i-1][j]+1, dp[i][j-1]+1);
    }
  }
  const tokens = [];
  let i = actual.length, j = target.length;
  while (i || j) {
    if (i && j && dp[i][j] === dp[i-1][j-1] + (same(i-1,j-1) ? 0 : 1)) {
      tokens.push({expectedIndex: j-1, text: actual[i-1], correct: same(i-1,j-1)}); i--; j--;
    } else if (j && dp[i][j] === dp[i][j-1]+1) {
      tokens.push({expectedIndex: j-1, missing: true, text: `Missing: ${target[j-1]}`, correct: false}); j--;
    } else {
      tokens.push({text: `${actual[i-1]} (extra)`, correct: false}); i--;
    }
  }
  tokens.reverse();
  return {tokens, correct: tokens.filter(t => t.correct).length, total: tokens.length};
}
