# storytrail_test_edge_function.ps1
# Quick test -- calls the deployed enroll-child Edge Function directly,
# bypassing any landing page, to confirm it actually inserts a row.
#
# Replace YOUR_PUBLISHABLE_KEY below with your real sb_publishable_... key
# (safe to use here -- it's the public-facing key, not the secret one).

$publishableKey = "sb_publishable_THFfVECYJDIG_B6XPJkWig_jnIEcBS2"
$url = "https://ogdczdslclzplunbklaa.supabase.co/functions/v1/enroll-child"

$body = @{
  parent_email    = "you@example.com"
  child_name      = "TestKid"
  child_age       = 6
  favorite_color  = "green"
  favorite_animal = "owl"
  theme_tags      = @("space")
  timezone        = "America/New_York"
} | ConvertTo-Json

$headers = @{
  "Authorization" = "Bearer $publishableKey"
  "apikey"        = $publishableKey
}

Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -Headers $headers
