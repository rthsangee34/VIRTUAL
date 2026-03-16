function makeQuestion(id, phase, type, prompt, choices, answer) {
  return { id, phase, type, prompt, choices: choices || undefined, answer };
}

function makeBuiltInQuestionBank() {
  const questions = [];

  // Phase 1: 20 (singular/plural, adjective, verb)
  const p1 = [
    makeQuestion("p1-1", 1, "mcq", "Choose the plural of 'child'.", ["childs", "children", "childes", "childrens"], "children"),
    makeQuestion("p1-2", 1, "mcq", "Which word is an adjective?", ["run", "blue", "quickly", "jump"], "blue"),
    makeQuestion("p1-3", 1, "mcq", "Which word is a verb?", ["table", "sleep", "happy", "green"], "sleep"),
    makeQuestion("p1-4", 1, "mcq", "Choose the singular form of 'mice'.", ["mouse", "mouses", "mices", "meese"], "mouse"),
    makeQuestion("p1-5", 1, "mcq", "Which word describes a noun (adjective)?", ["tall", "eat", "sing", "slowly"], "tall")
  ];
  while (p1.length < 20) {
    const n = p1.length + 1;
    p1.push(makeQuestion(`p1-${n}`, 1, "text", `Type any verb (action word). (${n}/20)`, null, "__ANY_VERB__"));
  }
  questions.push(...p1);

  // Phase 2: 40 grammar
  const p2 = [
    makeQuestion(
      "p2-1",
      2,
      "mcq",
      "Select the correct sentence.",
      ["He go to school.", "He goes to school.", "He going to school.", "He gone to school."],
      "He goes to school."
    ),
    makeQuestion("p2-2", 2, "mcq", "Choose the correct punctuation.", ["What time is it.", "What time is it?", "What time is it!", "What time is it,"], "What time is it?"),
    makeQuestion("p2-3", 2, "mcq", "Choose the correct pronoun: '___ are my friends.'", ["He", "She", "They", "It"], "They"),
    makeQuestion("p2-4", 2, "mcq", "Choose the correct form: 'I have ___ apple.'", ["a", "an", "the", "no"], "an"),
    makeQuestion("p2-5", 2, "mcq", "Pick the correct past tense of 'go'.", ["goed", "went", "goes", "going"], "went")
  ];
  while (p2.length < 40) {
    const n = p2.length + 1;
    p2.push(
      makeQuestion(
        `p2-${n}`,
        2,
        "mcq",
        `Choose the correct sentence form. (${n}/40)`,
        ["They was happy.", "They were happy.", "They is happy.", "They be happy."],
        "They were happy."
      )
    );
  }
  questions.push(...p2);

  // Phase 3: 20 general knowledge
  const p3 = [
    makeQuestion("p3-1", 3, "mcq", "What planet do we live on?", ["Mars", "Earth", "Jupiter", "Venus"], "Earth"),
    makeQuestion("p3-2", 3, "mcq", "How many days are in a week?", ["5", "6", "7", "8"], "7"),
    makeQuestion("p3-3", 3, "mcq", "Which animal is known for its trunk?", ["Elephant", "Tiger", "Lion", "Horse"], "Elephant"),
    makeQuestion("p3-4", 3, "mcq", "Water freezes at ___ degrees Celsius.", ["0", "10", "50", "100"], "0"),
    makeQuestion("p3-5", 3, "mcq", "Which is the largest ocean?", ["Indian", "Arctic", "Atlantic", "Pacific"], "Pacific")
  ];
  while (p3.length < 20) {
    const n = p3.length + 1;
    p3.push(makeQuestion(`p3-${n}`, 3, "mcq", `Which is a renewable energy source? (${n}/20)`, ["Coal", "Wind", "Oil", "Gas"], "Wind"));
  }
  questions.push(...p3);

  // Phase 4: 20 vocabulary
  const p4 = [
    makeQuestion("p4-1", 4, "mcq", "Synonym of 'happy' is:", ["sad", "angry", "joyful", "tired"], "joyful"),
    makeQuestion("p4-2", 4, "mcq", "Opposite of 'hot' is:", ["warm", "cold", "bright", "dry"], "cold"),
    makeQuestion("p4-3", 4, "mcq", "Choose the best meaning of 'brave'.", ["afraid", "courageous", "lazy", "weak"], "courageous"),
    makeQuestion("p4-4", 4, "mcq", "Synonym of 'quick' is:", ["fast", "slow", "late", "quiet"], "fast"),
    makeQuestion("p4-5", 4, "mcq", "Opposite of 'begin' is:", ["start", "end", "open", "enter"], "end")
  ];
  while (p4.length < 20) {
    const n = p4.length + 1;
    p4.push(makeQuestion(`p4-${n}`, 4, "mcq", `Synonym of 'big' is: (${n}/20)`, ["tiny", "large", "small", "short"], "large"));
  }
  questions.push(...p4);

  // Phase 5: battle questions (teacher can use these or upload their own)
  const p5 = [
    makeQuestion("p5-1", 5, "mcq", "Battle Q: 12 + 8 = ?", ["18", "20", "22", "24"], "20"),
    makeQuestion("p5-2", 5, "mcq", "Battle Q: Which is a noun?", ["run", "beautiful", "school", "quickly"], "school"),
    makeQuestion("p5-3", 5, "mcq", "Battle Q: Capital of France?", ["Paris", "Rome", "Berlin", "Madrid"], "Paris"),
    makeQuestion("p5-4", 5, "mcq", "Battle Q: Past tense of 'eat'?", ["eated", "ate", "eaten", "eats"], "ate"),
    makeQuestion("p5-5", 5, "mcq", "Battle Q: 100 / 4 = ?", ["10", "20", "25", "30"], "25")
  ];
  while (p5.length < 20) {
    const n = p5.length + 1;
    p5.push(makeQuestion(`p5-${n}`, 5, "mcq", `Battle Q: Which is a vowel? (${n}/20)`, ["B", "C", "A", "D"], "A"));
  }
  questions.push(...p5);

  return questions;
}

module.exports = { makeBuiltInQuestionBank };

