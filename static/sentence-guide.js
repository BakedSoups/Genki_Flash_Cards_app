function createSentenceGuide(guide) {
  const section = document.createElement('section');
  section.className = 'sentence-guide';
  const heading = document.createElement('h3');
  heading.textContent = 'Understand & change this sentence';
  section.append(heading);
  for (const [key, title] of [['forms', 'Dictionary form → this sentence'], ['particles', 'Why these particles?'], ['past', 'Make it past'], ['swap', 'Swap words']]) {
    const paragraph = document.createElement('p');
    const label = document.createElement('strong');
    label.textContent = title + ': ';
    paragraph.append(label, document.createTextNode(guide[key]));
    section.append(paragraph);
  }
  return section;
}

async function loadSentenceGuide() {
  const target = document.querySelector('#guide-cards');
  if (!target) return;
  const select = document.querySelector('#guide-lesson');
  const message = document.querySelector('#guide-message');
  try {
    // Both the standalone static build and the local Python app use the same data.
    let response = await fetch('/data/lesson8-review.json.json');
    if (!response.ok) response = await fetch('/api/lessons/lesson8-review.json');
    if (!response.ok) throw new Error('Could not load the sentence guide. Please refresh.');
    const cards = await response.json();
    for (const group of new Set(cards.map(card => card.group))) {
      const option = document.createElement('option');
      option.value = option.textContent = group;
      select.append(option);
    }
    function render() {
      const visible = cards.filter(card => select.value === 'all' || card.group === select.value);
      message.textContent = `${visible.length} sentences · Open a sentence to see its explanation.`;
      target.replaceChildren(...visible.map(card => {
        const details = document.createElement('details');
        details.className = 'guide-card';
        const summary = document.createElement('summary');
        summary.textContent = `${card.group}: ${card.meaning}`;
        details.append(summary);
        for (const [text, className] of [[card.kana, 'guide-japanese'], [card.romaji, 'guide-romaji']]) {
          const paragraph = document.createElement('p');
          paragraph.className = className;
          paragraph.textContent = text;
          details.append(paragraph);
        }
        if (card.grammar_note) {
          const note = document.createElement('p');
          note.textContent = card.grammar_note;
          details.append(note);
        }
        if (card.guide) details.append(createSentenceGuide(card.guide));
        return details;
      }));
    }
    select.addEventListener('change', render);
    render();
  } catch (error) { message.textContent = error.message; }
}
loadSentenceGuide();
