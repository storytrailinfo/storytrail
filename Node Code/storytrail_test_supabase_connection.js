// storytrail_test_supabase_connection.js
// Standalone test -- proves the Supabase connection and keys work, on their own.
// Just reads back whatever's in the children table. No Claude, no Resend.

// Run with: node storytrail_test_supabase_connection.js
// Requires: npm install @supabase/supabase-js

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

async function testConnection() {
  const { data, error } = await supabase
    .from("children")
    .select("*");

  if (error) {
    console.error("Connection or query failed:", error);
    return;
  }

  console.log(`Connected successfully. Found ${data.length} row(s):`);
  console.log(data);
}

testConnection();
