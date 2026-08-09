const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "public")));

const API_KEY = process.env.GEMINI_API_KEY;

async function askGemini(prompt) {
    if (!API_KEY) {
        throw new Error("Gemini API key was not found in .env");
    }

    const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
        encodeURIComponent(API_KEY),
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                                    }
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error(data);
        throw new Error(
            data?.error?.message || "Gemini request failed."
        );
    }

    const answer =
        data?.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("") || "";

    if (!answer) {
        throw new Error("Gemini returned an empty response.");
    }

    return answer;
}

function cleanJSON(text) {
    return text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
}

async function askGeminiJSON(prompt) {
    const answer = await askGemini(prompt);

    try {
        return JSON.parse(cleanJSON(answer));
    } catch (error) {
        console.error("Gemini returned:", answer);
        throw new Error("Gemini returned an invalid response.");
    }
}


/* ================================
   ADVANCED NOTES
================================ */

app.post("/api/advanced-notes", async (req, res) => {

    try {

        const text = String(req.body.text || "").trim();

        if (!text) {
            return res.status(400).json({
                error: "Please upload or paste study material first."
            });
        }

        const prompt = `
You are the AI behind a student study-notes website called RUHH NOTES.

Read the COMPLETE ORIGINAL STUDY MATERIAL below.

VERY IMPORTANT RULES:

1. Use ONLY information contained in the original material.
2. Do NOT invent facts.
3. Do NOT remove important factual information.
4. Do NOT change factual meaning.
5. Preserve names, dates, numbers, definitions, examples, processes and relationships.
6. Simplify difficult language where possible without changing meaning.
7. Organise the information into easy point-wise notes.
8. Use headings and subheadings.
9. Use tables only when they genuinely make the original information easier to understand.
10. Create mnemonics ONLY when useful and ONLY using information from the material.
11. Include difficult/technical words from the original material with simple meanings.
12. Create a pictographic revision using arrows, sequences or concept maps based ONLY on the material.
13. Do not create MCQs.
14. Do not create a general overview.
15. Do not add information just because you know it from outside the supplied material.

Return ONLY valid JSON.

Required JSON structure:

{
  "title": "title",
  "sections": [
    {
      "heading": "heading",
      "points": [
        "point 1",
        "point 2"
      ],
      "table": {
        "headers": [],
        "rows": []
      },
      "mnemonic": ""
    }
  ],
  "difficultWords": [
    {
      "word": "",
      "meaning": ""
    }
  ],
  "pictographicRevision": [
    {
      "title": "",
      "steps": [
        "",
        "",
        ""
      ]
    }
  ]
}

If a table or mnemonic is not appropriate, use an empty array or empty string.

ORIGINAL STUDY MATERIAL:

${text}
`;

        const result = await askGeminiJSON(prompt);

        res.json(result);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: error.message || "Could not create Advanced Notes."
        });

    }

});


/* ================================
   MCQs
================================ */

app.post("/api/mcqs", async (req, res) => {

    try {

        const text = String(req.body.text || "").trim();

        if (!text) {
            return res.status(400).json({
                error: "Please upload or paste study material first."
            });
        }

        const prompt = `
You are creating MCQs for RUHH NOTES.

Use ONLY the supplied study material.

Rules:

- Do not use outside knowledge.
- Do not invent facts.
- Every correct answer must be supported directly by the supplied material.
- Create useful student-level MCQs.
- Include 4 options.
- Include the correct answer.
- Include a short explanation based only on the material.
- Do NOT create Advanced Notes.
- Do NOT create a general overview.

Return ONLY valid JSON in this exact structure:

{
  "title": "MCQs",
  "items": [
    {
      "question": "",
      "options": [
        "",
        "",
        "",
        ""
      ],
      "answer": "",
      "explanation": ""
    }
  ]
}

Create 10 MCQs maximum, depending on how much information is present.

STUDY MATERIAL:

${text}
`;

        const result = await askGeminiJSON(prompt);

        res.json(result);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: error.message || "Could not create MCQs."
        });

    }

});


/* ================================
   BRIEF OVERVIEW
================================ */

app.post("/api/overview", async (req, res) => {

    try {

        const text = String(req.body.text || "").trim();

        if (!text) {
            return res.status(400).json({
                error: "Please upload or paste study material first."
            });
        }

        const prompt = `
You are creating a brief overview for RUHH NOTES.

Use ONLY the supplied study material.

Rules:

- Do not add facts.
- Do not remove essential factual information.
- Keep the meaning accurate.
- Make it concise and easy for a student to understand.
- Include the central ideas and important facts.
- Do not create MCQs.
- Do not create mnemonics unless they are necessary to explain the original material.

Return ONLY valid JSON:

{
  "title": "Brief Overview",
  "points": [
    "",
    "",
    ""
  ]
}

STUDY MATERIAL:

${text}
`;

        const result = await askGeminiJSON(prompt);

        res.json(result);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: error.message || "Could not create the overview."
        });

    }

});


/* ================================
   HOME PAGE
================================ */

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});


app.listen(PORT, () => {

    console.log("");
    console.log("====================================");
    console.log("       RUHH NOTES IS RUNNING");
    console.log("       http://localhost:" + PORT);
    console.log("====================================");
    console.log("");

});