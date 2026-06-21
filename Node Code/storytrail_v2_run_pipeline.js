// storytrail_v2_run_pipeline.js
// v2 NIGHTLY PIPELINE -- runs against the SANDBOX Supabase project only.
// Separate from v1's storytrail_run_pipeline.js by design: different
// secrets, different cron trigger, completely isolated so a bug here
// can never affect real production subscribers.
//
// Run with: node storytrail_v2_run_pipeline.js
// Requires .env with: ANTHROPIC_API_KEY, RESEND_API_KEY, SUPABASE_URL,
// SUPABASE_SECRET_KEY (all pointed at the SANDBOX project's values)

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

// ---- Story variety -- same five-axis system as v1, unchanged ----
const STORY_OPENINGS = [
  "an ordinary object the child owns turning out to be magic in a way no one expected",
  "a door, gate, or path appearing somewhere completely unexpected -- a closet, a puddle, a hollow tree",
  "the child waking up somewhere unfamiliar and gentle, with no memory of how they got there",
  "a creature asking the child for help with a specific, solvable problem",
  "the child discovering they can suddenly do something impossible -- shrink, fly, talk to something that doesn't usually talk",
  "a place the child knows well (their backyard, school, a museum) transforming into something else entirely",
  "the child finding something lost or hidden that belongs to someone else",
  "a journey that starts with the child being invited somewhere by a new friend",
  "the child following a sound, smell, or trail of small clues to somewhere unexpected",
  "the child being mistaken for someone important, or given a job they didn't expect",
];

const STORY_SETTINGS = [
  "underwater or an ocean that doesn't behave like a normal ocean",
  "high in the sky, among clouds or stars",
  "underground, in tunnels or caves",
  "a forest or garden that's larger on the inside than it looks",
  "a place built entirely out of one material (cloud, candy, cloth, paper)",
  "a miniature world, where everything is much smaller than usual",
  "a world that mirrors the child's own town, but slightly different",
  "somewhere that exists only at a specific time of day or under specific conditions",
  "a marketplace, library, or workshop full of unusual, wonderful things",
  "a journey along a path, river, or road that keeps changing as they travel",
];

const STORY_COMPANIONS = [
  "a single animal companion who is wise and a little mischievous",
  "a group of three or four small creatures who each have a different personality",
  "an object or toy that has come to life and has its own opinions",
  "an elderly or grandparent-like figure who knows the place well",
  "another child the same age, also new to this place",
  "a shy creature who needs convincing to come out and help",
  "a creature who seems intimidating at first but turns out to be gentle",
  "no companion at first -- the child explores alone before meeting anyone",
  "a sibling-like pair of creatures who bicker fondly but work well together",
  "a guide who communicates in an unusual way (humming, glowing, drawing pictures)",
];

const STORY_GOALS = [
  "helping someone find their way back home",
  "fixing or restoring something that broke or faded",
  "finding a specific lost object",
  "learning a small skill or lesson that turns out to matter later in the story",
  "delivering something important to someone who's waiting for it",
  "solving a gentle puzzle or riddle to unlock the next part of the journey",
  "comforting a creature who is sad, scared, or lonely",
  "exploring simply to see what's there, with no fixed goal until something good is discovered",
  "preparing for or attending a small celebration, gathering, or tradition",
  "helping two creatures who've had a misunderstanding see each other's side",
];

const STORY_MOODS = [
  "quietly curious and exploratory, like wandering through a museum after hours",
  "warm and domestic, like helping out around a cozy home",
  "gently adventurous, like a small expedition with a clear sense of wonder",
  "soft and dreamlike, where things shift and blend the way dreams do",
  "playful and a little silly, with light humor throughout",
  "tender and caretaking, focused on looking after someone or something",
  "quietly triumphant, where small efforts add up to something meaningful",
  "cozy and slow, savoring small details rather than rushing through events",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildPrompt(child) {
  const themes = child.theme_tags.join(", ");
  const opening = pickRandom(STORY_OPENINGS);
  const setting = pickRandom(STORY_SETTINGS);
  const companion = pickRandom(STORY_COMPANIONS);
  const goal = pickRandom(STORY_GOALS);
  const mood = pickRandom(STORY_MOODS);

  return `You write calm, soothing bedtime stories for young children, designed to be read aloud by a parent in the final minutes before sleep.

CHILD PROFILE
Name: ${child.child_name}
Age: ${child.child_age}
Favorite color: ${child.favorite_color}
Favorite animal: ${child.favorite_animal}
Things they love: ${themes}

STORY DIRECTION FOR TONIGHT (this child receives a new story every night, so
real variety matters -- use these five elements to genuinely shape tonight's
story so it feels distinct from other nights, not just a reskin of the same
shape with different words. Let them combine naturally into one coherent
story rather than treating them as a checklist to tick off.)
- Opening: the story should begin with ${opening}.
- Setting: somewhere in the story, lean into a setting that involves ${setting}.
- Companion: the child's companion or the character(s) they interact with should be ${companion}.
- Goal: the throughline of the story should center on ${goal}.
- Mood: the overall feel of tonight's story should be ${mood}.

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
    messages: [{ role: "user", content: buildPrompt(child) }],
  });

  return response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
}

// ---- Email -- includes BOTH v2 footer links: regenerate-story (keyed
// by this story's own id) and manage-account (keyed by parent_id) ----
function buildEmailHtml(child, story, storyId) {
  const storyHtml = story
    .split(/\n\s*\n/)
    .map((para) => `<p style="margin:0 0 16px;">${para.trim()}</p>`)
    .join("");

  return `
<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:24px;color:#2c2c2a;">
  <div style="text-align:center;padding-bottom:16px;border-bottom:1px solid #e5e3da;margin-bottom:24px;">
    <span style="font-size:20px;font-weight:bold;color:#3c3489;">StoryTrail</span>
    <div style="font-size:13px;color:#888780;margin-top:4px;">A bedtime story for ${child.child_name}</div>
  </div>

  <div style="font-size:16px;line-height:1.7;">
    ${storyHtml}
  </div>

  <div style="text-align:center;padding-top:24px;margin-top:24px;border-top:1px solid #e5e3da;font-size:12px;color:#888780;">
    <p style="margin:0 0 10px;">Sent with care by StoryTrail, every night before bedtime.</p>
    <p style="margin:0 0 10px;">Don't love tonight's story? <a href="https://storytrail.shop/regenerate-story.html?id=${storyId}" style="color:#3c3489;">Get a new one</a> (up to 3 times a day).</p>
    <p style="margin:0 0 10px;">Want to update your child's profile or modify your subscription? <a href="https://storytrail.shop/manage-account.html?id=${child.parent_id}" style="color:#3c3489;">Manage your account here</a>.</p>
    <p style="margin:0;">Questions or changes? Just reply to this email.</p>
  </div>
</div>`;
}

async function sendStoryEmail(child, story, storyId) {
  const { data, error } = await resend.emails.send({
    from: "StoryTrail <stories@adventures.storytrail.shop>",
    to: child.parent_email,
    replyTo: "storytrailinfo@gmail.com",
    subject: `${child.child_name}'s bedtime story`,
    html: buildEmailHtml(child, story, storyId),
    text: story,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  return data;
}

async function advanceSchedule(childId) {
  const { error } = await supabase.rpc("advance_next_send", {
    child_id: childId,
  });

  if (error) {
    throw new Error(`Supabase advance error: ${JSON.stringify(error)}`);
  }
}

// ---- The conveyor belt, v2 version ----
// Key difference from v1: the query joins parents and only includes
// children whose parent's subscription_status is 'active' or
// 'trialing'. A canceled or past_due subscription stops emails
// immediately, without needing a separate manual step to deactivate
// the child row.
async function runPipeline() {
  console.log("Checking for due stories (v2)...");

  const { data: dueChildren, error: queryError } = await supabase
    .from("children")
    .select("*, parents!inner(subscription_status)")
    .eq("active", true)
    .in("parents.subscription_status", ["active", "trialing"])
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

  const BATCH_SIZE = 10;

  for (let i = 0; i < dueChildren.length; i += BATCH_SIZE) {
    const batch = dueChildren.slice(i, i + BATCH_SIZE);
    console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} children)...`);
    await Promise.allSettled(batch.map((child) => processChild(child)));
  }

  console.log("\nv2 pipeline run complete.");
}

async function processChild(child) {
  console.log(`\n--- Processing ${child.child_name} ---`);

  try {
    console.log(`[${child.child_name}] Generating story...`);
    const story = await generateStory(child);
    console.log(`[${child.child_name}] Story generated (${story.split(/\s+/).length} words).`);

    console.log(`[${child.child_name}] Saving story...`);
    const { data: savedStory } = await supabase
      .from("stories")
      .insert({
        child_id: child.id,
        child_name: child.child_name,
        story_text: story,
        send_type: "nightly",
      })
      .select()
      .single();

    console.log(`[${child.child_name}] Sending email...`);
    await sendStoryEmail(child, story, savedStory?.id);
    console.log(`[${child.child_name}] Email sent.`);

    console.log(`[${child.child_name}] Advancing schedule...`);
    await advanceSchedule(child.id);
    console.log(`[${child.child_name}] Schedule advanced -- next story tomorrow at 6pm their time.`);

    await supabase.from("email_logs").insert({
      child_id: child.id,
      child_name: child.child_name,
      parent_email: child.parent_email,
      send_type: "nightly",
      status: "success",
      story_id: savedStory ? savedStory.id : null,
    });

    console.log(`--- ${child.child_name}: done ---`);
  } catch (err) {
    console.error(`--- ${child.child_name}: FAILED ---`);
    console.error(err.message);

    try {
      await supabase.from("email_logs").insert({
        child_id: child.id,
        child_name: child.child_name,
        parent_email: child.parent_email,
        send_type: "nightly",
        status: "failed",
        error_message: err.message,
      });
    } catch (logErr) {
      console.error(`[${child.child_name}] Failed to write error log:`, logErr.message);
    }
  }
}

runPipeline();
