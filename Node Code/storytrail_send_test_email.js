// storytrail_send_test_email.js
// Standalone test script -- proves Resend works, on its own.
// No Supabase, no Claude, no cron -- just "can I send one email."

// Run with: node storytrail_send_test_email.js
// Requires: npm install resend
// Requires: $env:RESEND_API_KEY = "your_key_here"  (set in PowerShell first)

import "dotenv/config";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail() {
  const { data, error } = await resend.emails.send({
    // sending from your verified domain
    from: "StoryTrail <stories@adventures.storytrail.shop>",

    // swap this to your real inbox so you can actually see it land
    to: "kdubose89@gmail.com",

    subject: "Mia's bedtime story test",

    text: "This is a plain-text test email from the StoryTrail pipeline. If you're reading this in your inbox, Resend is working.",
  });

  if (error) {
    console.error("Send failed:", error);
    return;
  }

  console.log("Email sent successfully. Resend ID:", data.id);
}

sendTestEmail();
