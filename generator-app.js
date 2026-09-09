class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.error("Error:", error);
  }
  render() {
    return this.state.hasError
      ? <div className="p-8 text-red-500">Error loading page</div>
      : this.props.children;
  }
}

function GeneratorApp() {
  try {
    const [generated, setGenerated] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [isLoadedSet, setIsLoadedSet] = React.useState(false);

    const [subject, setSubject] = React.useState("Physics");
    const [chapter, setChapter] = React.useState("Motion");
    const [paperSet, setPaperSet] = React.useState("1");
    const [paperType, setPaperType] = React.useState("Standard");
    const [topicCoverage, setTopicCoverage] = React.useState("");

    const [activeTab, setActiveTab] = React.useState("question");
    const [toast, setToast] = React.useState(null);

    const [currentQuestionPaper, setCurrentQuestionPaper] = React.useState("");
    const [currentAnswerKey, setCurrentAnswerKey] = React.useState("");

    const [pastPapers, setPastPapers] = React.useState(() => {
      const saved = localStorage.getItem("generated_papers");
      return saved ? JSON.parse(saved) : [];
    });

    const chaptersFromStorage = JSON.parse(localStorage.getItem("chapters") || "[]");

    const chapterOptions = chaptersFromStorage.filter(
  (ch) => ch.subject === subject
  
);
React.useEffect(() => {
  if (
    chapterOptions.length > 0 &&
    !chapterOptions.some((ch) => ch.name === chapter)
  ) {
    setChapter(chapterOptions[0].name);
  }
}, [subject, chapterOptions]);

    const showToast = (msg) => {
      setToast(msg);
      setTimeout(() => setToast(null), 3500);
    };

    const getToday = () => new Date().toISOString().split("T")[0];

    const getSelectedChapterText = () => {
      const selected = chaptersFromStorage.find((ch) => ch.name === chapter);
      return selected?.text || selected?.Text || selected?.summary || selected?.Summary || chapter;
    };

    const generateFallbackPaper = (selectedChapter, selectedSet) => {
      const questions = `QUESTION PAPER

PAPER SET ${selectedSet}

Subject: ${subject}
Chapter: ${selectedChapter}

Section A: Easy MCQs

1. What is motion?
A) Change in position of an object with time
B) Change in mass of an object
C) Change in shape of an object
D) Change in colour of an object

2. What is distance?
A) Shortest path between two points
B) Total length of the path covered by an object
C) Speed per unit time
D) Direction of motion

3. What is displacement?
A) Total path covered
B) Shortest distance between initial and final position
C) Time taken for motion
D) Force applied on object

4. Which of the following is an example of uniform motion?
A) A car moving with constant speed on a straight road
B) A ball thrown upward
C) A bus stopping suddenly
D) A person walking randomly

5. What is non-uniform motion?
A) Equal distances in equal time intervals
B) Unequal distances in equal time intervals
C) Motion in a straight line only
D) Motion without time

Section B: Medium Short Answer Questions

1. Explain the difference between distance and displacement.
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________

2. What is uniform motion? Give one example.
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________

3. Why is a reference point important in describing motion?
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________

Section C: Hard Long Answer Questions

1. Explain uniform and non-uniform motion with examples.
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________

2. Explain how graphical representation helps in understanding motion.
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________`;

      const answers = `ANSWER KEY - PAPER SET ${selectedSet}

Subject: ${subject}
Chapter: ${selectedChapter}

Section A: MCQ Answers

1. A) Change in position of an object with time
2. B) Total length of the path covered by an object
3. B) Shortest distance between initial and final position
4. A) A car moving with constant speed on a straight road
5. B) Unequal distances in equal time intervals

Section B: Short Answers

1. Distance is the total length of the path travelled by an object, while displacement is the shortest distance between the initial and final position.

2. Uniform motion means covering equal distances in equal intervals of time.

3. A reference point is important because position or motion is described with respect to a fixed point.

Section C: Long Answers

1. Uniform motion occurs when an object covers equal distances in equal intervals of time. Non-uniform motion occurs when an object covers unequal distances in equal intervals of time.

2. Graphical representation helps us understand motion visually using time on one axis and distance/displacement on the other axis.`;

      return { questions, answers };
    };
    const generatePaperWithGemini = async (selectedChapter, selectedSet) => {
  let chapterText = getSelectedChapterText();
  console.log("CHAPTER TEXT START");
console.log(chapterText.substring(0,5000));
console.log("CHAPTER TEXT END");
chapterText = chapterText
  .replace(/PAGE \d+/g, "")
  .replace(/\n{3,}/g, "\n\n")
  .slice(0, 12000);

console.log("EXERCISE INDEX:",
  chapterText.search(/Exercise/i)
);

if (subject === "Mathematics") {

  const exerciseIndex = chapterText.search(
  /Referring to Fig|Using the conventions|Practice Questions|End.?of.?Chapter/i
);



  console.log("MATH EXERCISE INDEX:", exerciseIndex);

  if (exerciseIndex !== -1) {
    chapterText = chapterText.substring(exerciseIndex);

    console.log("MATH EXERCISE SECTION FOUND");
    console.log(chapterText.substring(0, 2000));
  } else {
    console.log("NO MATH EXERCISE SECTION FOUND");
  }
}

let processedChapterText = chapterText;

    const prompt = `
You are an expert CBSE school teacher and question paper setter.

Generate a high-quality examination paper ONLY from the chapter content provided below.

SUBJECT:
${subject}

CHAPTER:
${selectedChapter}

PAPER SET:
${selectedSet}

PAPER TYPE:
${paperType}

IMPORTANT RULES:

1. Use ONLY concepts present in the chapter content.
FOR MATHEMATICS:
ABSOLUTE MATHEMATICS RULE:

If chapter contains an Exercise section,
generate ALL questions only from:

- Exercise questions
- Solved examples
- Practice questions

Ignore every other chapter section completely.

Do not generate questions from explanatory text,
activities, illustrations, figures, room layouts,
bathroom layouts, stories, introductions or examples
outside the exercise section.

Generate questions primarily from:
- solved examples
- exercise questions
- practice questions
- worked numerical problems
If the chapter contains Exercise Sets, Practice Problems,
Worked Examples or End-of-Chapter Exercises:

Generate 100% questions ONLY from:

- Exercise Questions
- Solved Examples
- Worked Examples
- Practice Questions

Never generate questions from chapter introduction,
history sections, stories, activities or explorations.

Do not invent new story-based questions.

Prefer rewording existing exercise questions over creating entirely new questions.

Exercise questions have highest priority.
Worked examples have second priority.
Theory text has lowest priority.

Do NOT generate questions from:
- historical notes
- introduction sections
- stories
- facts
- mathematicians
- history boxes
- "Did you know" content
- chapter background information




2. Do NOT generate questions from:
   - chapter title
   - page numbers
   - metadata
   - author names
   - acknowledgements
   - index
3. Do NOT invent topics not present in the chapter.
4. Generate different questions for different paper sets.
5. Include competency-based questions.
6. Include application-based questions.
7. Include higher-order thinking questions wherever possible.
8. Avoid repeating the same question in different forms.
9. Questions should resemble real school examination papers.
10. Use previous-year exam style wherever possible.
11. Cover all important topics from the chapter.
12. Do not refer to figures, diagrams, maps or tables unless actual figure data exists.

13. Questions must be directly based on chapter concepts.
14. Avoid irrelevant or metadata-based questions.
15. Do not ask questions that require a figure, diagram, map, image,
room layout, bathroom layout, graph or visual reference unless the
actual figure data is present in the chapter text.
16. If a question refers to Fig., Diagram, Graph, Image, Layout or Map,
convert it into a text-based mathematical problem using the available
coordinates, values or numerical information.
17. If a question depends on a figure, diagram, graph, map, room layout
or image that is not fully available in text form, do not use that question.

Instead generate a similar question using only the coordinates,
values or numerical information explicitly present in the chapter text.

Never ask:
- What are the coordinates of point X in Fig. ...
- What is the width of the door in Fig. ...
- What is shown in the diagram ...

unless all required coordinates and values are explicitly present in text.

If PAPER TYPE is Exhaustive:

Generate:

10 MCQs
10 Short Answer Questions
5 Long Answer Questions
3 HOTS Questions
2 Case Study Questions

Cover every topic and subtopic from the chapter.

Every important concept must appear at least once.

Include:
- competency based questions
- application based questions
- analytical questions
- previous year style questions

If PAPER TYPE is Hard:

Generate:

5 MCQs
5 Short Questions
5 Long Questions
5 HOTS Questions
3 Case Study Questions

Difficulty Level:
Very High



SPECIAL RULE FOR MATHEMATICS:

If SUBJECT is Mathematics:

Generate ONLY mathematics examination questions.
CRITICAL:

Generate questions only from concepts explicitly found
inside the provided chapter text.

Do not use your own mathematics knowledge to extend
the chapter beyond the provided content.

Do not generate any formula, theorem, concept,
question type or coordinate geometry operation
that is not explicitly present in the chapter content.

Forbidden unless explicitly present in chapter:

- Distance Formula
- Midpoint Formula
- Section Formula
- Equation of Line
- Slope Formula
- Area of Triangle using Coordinates

If these topics are not present in the chapter text,
do not generate questions from them.



CRITICAL:

Before generating the paper, first identify:

1. Worked Examples
2. Solved Examples
3. Exercise Questions
4. Practice Problems
5. End-of-Chapter Questions

Generate the paper primarily from these sections.

If exercise questions are available, do not generate questions from:
- chapter introduction
- historical content
- background reading
- explanatory stories

Exercise questions have highest priority.

Worked examples have second priority.

Theory text has lowest priority.

For Mathematics:
If exercise questions are available, generate questions ONLY from exercise questions and solved examples.

Do not generate questions from:
- figures
- room layouts
- bathroom layouts
- illustrations
- visual activities
- graphical activities

unless complete numerical data is explicitly available in text.


MATHEMATICS CHAPTER ACCURACY RULE:

The difficulty and type of questions must match the actual chapter content.

If the chapter mainly teaches concepts, coordinates, quadrants, axes, origin, or identification of points, generate conceptual and identification-based questions.

Do not force numerical calculations if the chapter does not explicitly teach numerical methods.

The generated paper should resemble the actual NCERT exercise questions of that chapter.

OUTPUT RULES:

If PAPER TYPE is Standard:
- 5 MCQs
- 3 Short Answer Questions
- 2 Long Answer Questions

If PAPER TYPE is Exhaustive:
- 10 MCQs
- 10 Short Answer Questions
- 5 Long Answer Questions
- 3 HOTS Questions
- 2 Case Study Questions

If PAPER TYPE is Hard:
- 5 MCQs
- 5 Short Questions
- 5 Long Questions
- 5 HOTS Questions
- 3 Case Study Questions

STRICTLY FOLLOW THESE COUNTS.
DO NOT REDUCE THE NUMBER OF QUESTIONS.
Use this exact format:

QUESTION_PAPER_START
QUESTION PAPER

PAPER SET ${selectedSet}

Subject: ${subject}
Chapter: ${selectedChapter}

Section A: Easy MCQs

1. ...
A) ...
B) ...
C) ...
D) ...

Section B: Short Answer Questions

1. ...
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________

Section C: Long Answer Questions

1. ...
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________

Section D: HOTS Questions

1. ...
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________

Section E: Case Study Questions

1. ...
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________

QUESTION_PAPER_END

ANSWER_KEY_START
ANSWER KEY - PAPER SET ${selectedSet}

Section A: MCQ Answers

1. ...

Section B: Short Answers

1. ...

Section C: Long Answers

1. ...

Section D: HOTS Answers

1. ...

Section E: Case Study Answers

1. ...

ANSWER_KEY_END
CRITICAL INSTRUCTION:

Your response will be considered INVALID if TOPIC_COVERAGE is missing.

After ANSWER_KEY_END output EXACTLY:

TOPIC_COVERAGE_START

✓ Topic Name
✓ Topic Name
✓ Topic Name
✓ Topic Name

TOPIC_COVERAGE_END

Do not skip this section.
FINAL REJECTION RULE:

Reject any question containing:

- Distance Formula
- Midpoint Formula
- Section Formula
- Slope
- Equation of Line
- Circle
- Collinearity
- Centroid

unless these exact topics appear inside the extracted exercise section.

If any of these topics are absent,
do not generate questions using them.
STRICT MATHEMATICS FILTER

Generate questions ONLY from topics explicitly present in the extracted text.

Never introduce:

- Distance Formula
- Midpoint Formula
- Section Formula
- Slope
- Equation of Line
- Circle
- Coordinate Proofs

unless these exact topics appear in the extracted text.

If not present, do not generate any question related to them.

Every question must contain at least one keyword that appears in the extracted chapter text.

Do not invent concepts, formulas, theorems, or mathematical terms that are not present in the extracted text.

If a concept is not explicitly mentioned in the chapter text, pretend that concept does not exist.
ULTIMATE VALIDATION RULE:

Before generating each question:

Verify that the exact concept exists in CHAPTER CONTENT.

If the concept is not explicitly present in CHAPTER CONTENT,
the question is forbidden.

Examples of forbidden concepts unless explicitly present:

- Distance between two points
- Distance Formula
- Midpoint Formula
- Section Formula
- Slope
- Equation of Line
- Circle
- Area using Coordinates
- Coordinate Proofs

If a forbidden concept appears in a question,
discard that question and generate a replacement.

CHAPTER CONTENT:
${processedChapterText}
`;
const response = await fetch(
  `${API.backend.getUrl().replace(/\/$/, "")}/generate`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await API.backend.getAccessToken()}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      model: localStorage.getItem("gemini_model") || "gemini-3.6-flash",
    }),
  }
);

if (!response.ok) {
  const errorText = await response.text();
  throw new Error("Generation request failed: " + errorText);
}

const data = await response.json();

let content = data.text || "";

content = content
  .replace(/```text/g, "")
  .replace(/```/g, "")
  .trim();

console.log("FULL GEMINI RESPONSE:", content);

const questionMatch = content.match(
  /QUESTION_PAPER_START\s*([\s\S]*?)\s*QUESTION_PAPER_END/i
);
const answerMatch = content.match(
  /ANSWER_KEY_START\s*([\s\S]*?)\s*ANSWER_KEY_END/i
);

const coverageMatch = content.match(
  /TOPIC_COVERAGE_START\s*([\s\S]*?)\s*TOPIC_COVERAGE_END/i
);
console.log("QUESTION FOUND:", !!questionMatch);
console.log("ANSWER FOUND:", !!answerMatch);
console.log("COVERAGE FOUND:", !!coverageMatch);
  if (!questionMatch || !answerMatch) {
    console.log("RAW GROQ RESPONSE:", content);

    return {
  questions: content,
  answers: "Answer key could not be separated automatically. Please regenerate once.",
  coverage: ""
};
  }

  const result = {
  questions: questionMatch[1].trim(),
  answers: answerMatch[1].trim(),
  coverage: coverageMatch?.[1]?.trim() || ""
};

console.log("PARSED RESULT:", result);

return result;
};

    const savePastPapers = (papers) => {
      setPastPapers(papers);
      localStorage.setItem("generated_papers", JSON.stringify(papers));
    };

    const handleGenerate = async () => {
      setLoading(true);

      try {
        const existingPaper = pastPapers.find(
  (p) =>
    p.chapter === chapter &&
    p.set === `Set ${paperSet}` &&
    p.paperType === paperType
);

        if (existingPaper) {
          setCurrentQuestionPaper(existingPaper.questions);
          setCurrentAnswerKey(existingPaper.answers);
          setTopicCoverage(existingPaper.coverage || "");
          setGenerated(true);
          setActiveTab("question");
          setIsLoadedSet(true);
          setLoading(false);
          showToast(`Loaded saved paper: ${chapter} Set ${paperSet}`);
          return;
        }
          

        let data;

        try {
          data = await generatePaperWithGemini(chapter, paperSet);
          console.log("DATA RECEIVED:", data);
        } catch (apiError) {
          console.error(apiError);
          throw apiError;

        }
        const newPaper = {
  id: Date.now(),
  subject,
  chapter,
  paperType,
  set: `Set ${paperSet}`,
  date: getToday(),
  questions: data.questions,
  answers: data.answers,
  coverage: data.coverage || ""
};

        const updatedPapers = [newPaper, ...pastPapers];
        savePastPapers(updatedPapers);

        setCurrentQuestionPaper(data.questions);
        setCurrentAnswerKey(data.answers);
        setTopicCoverage(data.coverage || "");
        setGenerated(true);
        setActiveTab("question");
        setIsLoadedSet(false);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setLoading(false);
        showToast(error.message || "Generation failed.");
      }
    };

    const loadSavedPaper = (paper) => {
      setSubject(paper.subject);
      setChapter(paper.chapter);
      setPaperSet(paper.set.replace("Set ", ""));
      setCurrentQuestionPaper(paper.questions);
      setCurrentAnswerKey(paper.answers);
      setTopicCoverage(paper.coverage || "");
      setGenerated(true);
      setActiveTab("question");
      setIsLoadedSet(true);
      showToast(`Loaded saved paper: ${paper.chapter} (${paper.set})`);
    };

    const getFileName = (type, ext) => {
      const safeChapter = chapter.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const fileType = type === "question" ? "question_paper" : "answer_key";
      return `${safeChapter}_set_${paperSet}_${fileType}.${ext}`;
    };

    const getContent = (type) => {
      return type === "question" ? currentQuestionPaper : currentAnswerKey;
    };

    const handleDownloadTxt = (type) => {
      const content = getContent(type);
      if (!content) {
        showToast("Please generate or load a paper first.");
        return;
      }

      const filename = getFileName(type, "txt");
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
      showToast(`Downloaded ${filename}`);
    };

    // Shared by both "Download PDF" (Save as PDF via the print dialog) and
    // the dedicated "Print" button below — one print-ready view, two ways
    // to trigger it, so the two buttons never drift out of sync.
    const openPrintView = (type) => {
      const content = getContent(type);
      if (!content) {
        showToast("Please generate or load a paper first.");
        return null;
      }

      const title = type === "question" ? "Question Paper" : "Answer Key";
      const filename = getFileName(type, "pdf");

      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head>
            <title>${filename}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; color: #111827; }
              h1 { text-align: center; color: #4f46e5; }
              h3 { text-align: center; color: #374151; margin-bottom: 30px; }
              pre { white-space: pre-wrap; font-size: 14px; line-height: 1.7; }
              @media print {
                @page { margin: 15mm; }
              }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <h3>Subject: ${subject} | Chapter: ${chapter} | Set: ${paperSet}</h3>
            <pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      return { printWindow, filename };
    };

    const handleDownloadPdf = (type) => {
      const opened = openPrintView(type);
      if (!opened) return;
      opened.printWindow.print();
      showToast(`PDF print window opened for ${opened.filename}`);
    };

    // Dedicated Print action — goes straight to the browser/system print
    // dialog, same as any normal "Print" button would, without implying
    // a download is happening (that's what "Download PDF" is for).
    const handlePrint = (type) => {
      const opened = openPrintView(type);
      if (!opened) return;
      opened.printWindow.print();
      showToast(`Opened system print dialog for ${opened.filename}`);
    };

    return (
      <DashboardLayout title="Test Paper Generator">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          <div className="lg:col-span-1 space-y-6">
            <div className="card p-6">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">Paper Configuration</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select
  className="input-field"
  value={subject}
  onChange={(e) => {
    const newSubject = e.target.value;

    setSubject(newSubject);

    const firstChapter = chaptersFromStorage.find(
      (ch) => ch.subject === newSubject
    );

    if (firstChapter) {
      setChapter(firstChapter.name);
    }
  }}
>
  <option>Mathematics</option>
  <option>Physics</option>
  <option>Chemistry</option>
  <option>Biology</option>
  <option>Geography</option>
  <option>History</option>
  <option>Civics</option>
  <option>Economics</option>
  <option>Hindi</option>
  <option>English</option>
</select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Saved Chapter</label>
                  <select className="input-field" value={chapter} onChange={(e) => setChapter(e.target.value)}>
                    {chapterOptions.map((ch) => (
                      <option key={ch.id || ch.name} value={ch.name}>
                        {ch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paper Set</label>
                  <select className="input-field" value={paperSet} onChange={(e) => setPaperSet(e.target.value)}>
                    <option value="1">Set 1: Definitions & Basics</option>
                    <option value="2">Set 2: Application Based</option>
                    <option value="3">Set 3: Analytical</option>
                    <option value="4">Set 4: Mixed Revision</option>
                  </select>
                </div>
              <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Paper Type
  </label>

  <select
    className="input-field"
    value={paperType}
    onChange={(e) => setPaperType(e.target.value)}
  >
    <option value="Standard">Standard Paper</option>
    <option value="Exhaustive">Exhaustive Paper</option>
    <option value="Hard">Hard Level Paper</option>
  </select>
</div>

                <button className="btn-primary w-full justify-center mt-4" onClick={handleGenerate} disabled={loading}>
                  {loading ? <div className="icon-loader animate-spin"></div> : <div className="icon-wand-sparkles"></div>}
                  {loading ? "Generating..." : "Generate Question Paper"}
                </button>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-semibold text-lg mb-4 text-gray-900">Previous Papers</h3>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {pastPapers.length === 0 ? (
  <p className="text-sm text-gray-500">No saved papers yet.</p>
) : (
  pastPapers.map((paper) => (
    <div
      key={paper.id}
                      className="p-3 bg-gray-50 rounded-lg border border-[var(--border-color)] flex justify-between items-center hover:bg-indigo-50 transition-colors cursor-pointer"
                      onClick={() => loadSavedPaper(paper)}
                    >
                      <div>
                        <p className="font-medium text-sm text-gray-900">
                          {paper.chapter}</p>
                        <p className="text-xs text-gray-500">
  {paper.subject} • {paper.set} • {paper.paperType}
</p>
<p className="text-[11px] text-gray-400 mt-1">
  {paper.date}
</p>
                      </div>
                    
                      <button className="text-[var(--primary)] hover:text-indigo-800 p-1">
                        <div className="icon-chevron-right"></div>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {generated ? (
              <div className="card p-0 flex flex-col h-full min-h-[760px] border border-[var(--border-color)] shadow-sm">
                <div className="p-4 border-b border-[var(--border-color)] bg-gray-50 flex flex-wrap gap-4 justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-gray-900 text-lg">Generated Preview</h3>
                    {isLoadedSet && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium flex items-center gap-1">
                        <div className="icon-check text-xs"></div> Loaded saved paper set
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary text-sm py-1.5" onClick={() => handleDownloadTxt(activeTab)}>
                      <div className="icon-file-text"></div> Download TXT
                    </button>

                    <button className="btn-primary text-sm py-1.5" onClick={() => handleDownloadPdf(activeTab)}>
                      <div className="icon-file"></div> Download PDF
                    </button>

                    <button className="btn-secondary text-sm py-1.5" onClick={() => handlePrint(activeTab)}>
                      <div className="icon-printer"></div> Print
                    </button>
                  </div>
                </div>

                <div className="flex border-b border-[var(--border-color)] bg-white">
                  <button
                    className={`flex-1 py-3 px-4 font-semibold text-sm transition-colors ${
                      activeTab === "question"
                        ? "text-[var(--primary)] border-b-2 border-[var(--primary)] bg-indigo-50/30"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveTab("question")}
                  >
                    Question Paper
                  </button>

                  <button
                    className={`flex-1 py-3 px-4 font-semibold text-sm transition-colors ${
                      activeTab === "answer"
                        ? "text-[var(--primary)] border-b-2 border-[var(--primary)] bg-indigo-50/30"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveTab("answer")}
                  >
                    Answer Key
                  </button>
                </div>

                <div className="p-8 overflow-y-auto flex-1 bg-white max-h-[680px]">
                  <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-8 border-b pb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {activeTab === "question" ? "Question Paper" : "Answer Key"}
                      </h2>
                      <p className="text-gray-500 font-medium">
  Subject: {subject} | Chapter: {chapter} | Set: {paperSet} | Type: {paperType}
</p>
<div className="mt-2 text-sm text-gray-500">
  <p>Time Allowed: 1 Hour</p>
  <p>Maximum Marks: 50</p>
</div>
<div className="mt-2">
  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
    {paperType}
  </span>
  {topicCoverage && (
  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
    <h4 className="font-semibold text-green-800 mb-2">
      Topics Covered
    </h4>

    <pre className="whitespace-pre-wrap text-sm">
      {topicCoverage}
    </pre>
  </div>
)}
</div>
                    </div>

                    <pre className="whitespace-pre-wrap font-serif text-gray-800 text-[15px] leading-relaxed">
                      {activeTab === "question" ? currentQuestionPaper : currentAnswerKey}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card p-12 flex flex-col items-center justify-center h-full min-h-[700px] text-center text-gray-500 bg-gray-50/50">
                <div className="icon-file-text text-6xl mb-4 text-gray-300"></div>
                <p className="text-lg font-medium text-gray-600">No Paper Generated Yet</p>
                <p className="text-sm mt-2 max-w-md">
                  Select your configuration on the left and click Generate to create a custom test paper and its answer key.
                </p>
              </div>
            )}
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in-up z-50">
            <div className="icon-circle-check text-green-400"></div>
            {toast}
          </div>
        )}
      </DashboardLayout>
    );
  } catch (error) {
    console.error("GeneratorApp error:", error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ErrorBoundary><GeneratorApp /></ErrorBoundary>);