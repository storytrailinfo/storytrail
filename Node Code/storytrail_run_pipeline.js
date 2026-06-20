// storytrail_run_pipeline.js
// THE REAL PIPELINE -- chains all three machines together.
// This is what the cron job will run every hour, eventually.
// For now, run it by hand to test the full chain end to end.

// Run with: node storytrail_run_pipeline.js
// Requires .env with: ANTHROPIC_API_KEY, RESEND_API_KEY, SUPABASE_URL, SUPABASE_SECRET_KEY

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic();
const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// ---- Step 1: build the story prompt for one child ----
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

// ---- Step 2: generate one story via Claude ----
async function generateStory(child) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: buildPrompt(child) }],
  });

  return response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
}

// ---- Step 3: send the story via Resend ----
async function sendStoryEmail(child, story) {
  const { data, error } = await resend.emails.send({
    from: "StoryTrail <stories@adventures.storytrail.shop>",
    to: child.parent_email,
    subject: `${child.child_name}'s bedtime story`,
    text: story,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  return data;
}

// ---- Step 4: advance the schedule in Supabase ----
async function advanceSchedule(childId) {
  const { error } = await supabase.rpc("advance_next_send", {
    child_id: childId,
  });

  if (error) {
    throw new Error(`Supabase advance error: ${JSON.stringify(error)}`);
  }
}

// ---- The conveyor belt: run all four steps for every due child ----
async function runPipeline() {
  console.log("Checking for due stories...");

  const { data: dueChildren, error: queryError } = await supabase
    .from("children")
    .select("*")
    .eq("active", true)
    .lte("next_send_at", new Date().toISOString());

  if (queryError) {
    console.error("Failed to query due children:", queryError);
    return;
  }

  if (dueChildren.length === 0) {
    console.log("No stories due right now.");
    return;
  }

  console.log(`Found ${dueChildren.length} due child(ren).`);

  for (const child of dueChildren) {
    console.log(`\n--- Processing ${child.child_name} ---`);

    try {
      console.log("Generating story...");
      const story = await generateStory(child);
      console.log(`Story generated (${story.split(/\s+/).length} words).`);

      console.log("Sending email...");
      await sendStoryEmail(child, story);
      console.log("Email sent.");

      console.log("Advancing schedule...");
      await advanceSchedule(child.id);
      console.log("Schedule advanced -- next story tomorrow at 6pm their time.");

      console.log(`--- ${child.child_name}: done ---`);
    } catch (err) {
      // IMPORTANT: if anything fails for this child, we do NOT advance their
      // schedule. That means next hour's run will see them as still "due"
      // and retry automatically, instead of silently skipping a night.
      console.error(`--- ${child.child_name}: FAILED ---`);
      console.error(err.message);
    }
  }

  console.log("\nPipeline run complete.");
}

runPipeline();
