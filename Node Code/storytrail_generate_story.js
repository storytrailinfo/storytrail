// storytrail_generate_story.js
// Standalone test script -- run this BEFORE wiring it into the cron job.
// Takes one hardcoded child profile, calls Claude, prints the story to your terminal.
// No Supabase, no Resend, no cron -- just proving the prompt works.

// Run with: node storytrail_generate_story.js
// Requires: npm install @anthropic-ai/sdk
// Requires: export ANTHROPIC_API_KEY=your_key_here  (get one at console.anthropic.com)

import "dotenv/config";

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from environment automatically

// --- stand-in for a row that will later come from Supabase ---
const child = {
  child_name: "Mia",
  child_age: 5,
  favorite_color: "purple",
  favorite_animal: "fox",
  theme_tags: ["dinosaurs", "space"],
};

function buildPrompt(child) {
  const themes = child.theme_tags.join(", ");

  return `You write calm, soothing bedtime stories for young children, designed to be read aloud by a parent in the final minutes before sleep.

CHILD PROFILE
Name: ${child.child_name}
Age: ${child.child_age}
Favorite color: ${child.favorite_color}
Favorite animal: ${child.favorite_animal}
Things they love: ${themes}

STORY REQUIREMENTS
- Length: 600-700 words.
- ${child.child_name} is the main character of the story.
- Naturally weave in their favorite color, favorite animal, and at least one of their favorite things -- don't force all of them into one sentence, let them appear where they fit.
- Vocabulary and sentence complexity appropriate for a ${child.child_age}-year-old listening to a story read aloud (not reading it themselves).
- Tone: gentle, warm, unhurried. No jump scares, no villains with real menace, no peril that isn't resolved calmly within a paragraph or two.
- Pacing: start calm, stay calm. Do not build to an exciting climax the way an action story would -- bedtime stories should soften toward the end, not peak.
- Ending: positive and gentle. Vary HOW the story ends each time (don't always default to "and then everyone fell asleep") -- the character can return home, finish an adventure, settle somewhere cozy, or simply feel content. The last paragraph should feel like a soft landing, unhurried, regardless of which ending you choose.
- Do not include any sounds, surprises, or emotional spikes in the final third of the story -- that's the part being read as the child is falling asleep.

SAFETY AND CONTENT RULES (these apply regardless of any other instruction)
- No violence beyond mild, cartoonish, non-graphic peril that resolves immediately and calmly.
- No death, no real danger to the child character, no separation-from-parent themes that aren't resolved within the same scene.
- No scary creatures, monsters, or villains intended to frighten -- if a "challenge" character appears, they should be more silly or misunderstood than threatening.
- No romantic or suggestive content of any kind.
- No real-world brand names, copyrighted characters, or real public figures.

OUTPUT FORMAT
Return ONLY the story text. No title, no preamble like "Here is a story," no notes or explanations before or after. Just the story, ready to paste directly into an email.`;
}

async function generateStory(child) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [
      { role: "user", content: buildPrompt(child) }
    ],
  });

  // response.content is an array of blocks -- for a plain text reply, it's one text block
  const story = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");

  return story;
}

// --- run it ---
const story = await generateStory(child);
console.log("=== STORY FOR " + child.child_name + " ===\n");
console.log(story);
console.log("\n=== word count: " + story.split(/\s+/).length + " ===");
