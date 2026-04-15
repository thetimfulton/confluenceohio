# Confluence Ohio — Launch Day Runbook

Step-by-step procedures for launch day. This document assumes every item in the [Pre-Launch Checklist](./launch-checklist.md) is complete.

**Site:** https://confluenceohio.org
**Vercel Dashboard:** https://vercel.com/confluenceohio
**Supabase Dashboard:** https://supabase.com/dashboard (production project)
**PostHog:** https://app.posthog.com
**Inngest:** https://app.inngest.com
**Brevo:** https://app.brevo.com
**Cloudflare:** https://dash.cloudflare.com

---

## T-2 Hours: Pre-Launch Verification

Complete these steps two hours before the planned launch time. All checks must pass before proceeding to T-0.

- [ ] **Confirm checklist complete.** Open `docs/launch-checklist.md` — every box should be checked. If any item is incomplete, stop and resolve it before continuing.

- [ ] **Verify database is clean.** Run against the production Supabase project:
  ```sql
  SELECT count(*) FROM signatures;
  SELECT count(*) FROM community_voices;
  SELECT count(*) FROM donations;
  ```
  All counts should be 0 (or contain only seed/admin data). Remove any leftover test data.

- [ ] **Clear staging test data.** Run the same queries against the staging project and clean up if needed. Staging should not have stale data that could confuse post-launch debugging.

- [ ] **Verify deployment is current.** Open the Vercel dashboard. Confirm the production deployment matches the latest commit on `main`. If a deployment is pending or failed, investigate and resolve before proceeding.

- [ ] **Check PostHog.** Open the PostHog live events view. Confirm no spurious or stale events are flowing. The stream should be quiet (only your own test traffic, if any).

- [ ] **Check Inngest.** Open the Inngest dashboard. Confirm all registered functions show a healthy status with no recent failures. Functions should include: petition welcome email, email verification, volunteer welcome, admin notifications, and any batch processing jobs.

- [ ] **Check Brevo.** Open the Brevo dashboard. Confirm the sending domain is verified, API key is active, and no recent delivery failures or blocks.

- [ ] **Smoke-test the site.** Visit `https://confluenceohio.org` in an incognito browser window. Verify:
  - Homepage loads with correct content and live signature counter (should show 0)
  - `/sign` renders the petition form with Turnstile widget
  - `/the-case` pages load with correct copy and images
  - `/voices` page loads (empty state is fine)
  - `/donate` page loads with ActBlue embed
  - `/admin` redirects to login

- [ ] **Notify the team.** Message Tim and any other team members: "Pre-launch checks complete. All systems green. Proceeding to launch at [TIME]."

---

## T-0: Launch Sequence

Execute these steps in order. Do not skip ahead.

### 1. Publish the launch blog post

If the blog post MDX file (`content/blog/why-were-asking-columbus-to-consider-a-new-name.mdx`) is not yet deployed, merge it to `main` and wait for the Vercel deployment to complete (typically 1-2 minutes). Verify the post is live at `/blog/why-were-asking-columbus-to-consider-a-new-name`.

### 2. Tim signs the petition (Signer #1)

Tim goes to `https://confluenceohio.org/sign` and submits the petition form with his real Ohio address. This is signer #1 — it validates the entire flow under production conditions.

**Verify the full flow:**
- [ ] Form submits successfully — confirmation message displayed
- [ ] Email verification email arrives (check inbox and spam folder)
- [ ] Clicking the verification link confirms the signature
- [ ] Referral code is generated and displayed on the post-verification share screen
- [ ] Share buttons work — open Twitter/Facebook/email share dialogs with correct pre-filled text and referral link
- [ ] Signature appears in the admin dashboard under the signatures list
- [ ] Inngest dashboard shows the corresponding function runs completed successfully
- [ ] PostHog live events view shows the event sequence: `petition_form_view` → `petition_form_start` → `petition_form_submit` → `verification_success`

If any step fails, **stop the launch** and debug. Do not announce publicly until the petition flow is confirmed working.

### 3. Monitor PostHog

Keep the PostHog live events view open. After Tim's signature, you should see a clean sequence of events. This tab stays open for the rest of launch day.

### 4. Announce on social media

Post the launch announcement on all prepared social channels (Twitter/X, Facebook, Instagram). Include a link to `https://confluenceohio.org` and the launch blog post. Use the campaign's first-person plural voice.

### 5. Send email to pre-launch list

If a pre-launch email list exists in Brevo, trigger the launch announcement email. Monitor the Brevo dashboard for delivery status, bounces, and complaints immediately after sending.

### 6. Distribute press kit

Send the press kit to local media contacts per the coordinated outreach plan. The press page at `/press` should already be live with downloadable assets.

---

## T+1 Hour to T+24 Hours: Monitoring Checklist

Check each of these at T+1h, T+4h, T+12h, and T+24h. Mark the time of each check.

### Error Monitoring

| Check | T+1h | T+4h | T+12h | T+24h |
|---|---|---|---|---|
| Vercel error logs — any 500 errors? | | | | |
| Vercel function logs — any timeouts or crashes? | | | | |
| Browser console — any CSP violations or JS errors? | | | | |
| Uptime monitor — any downtime alerts? | | | | |

### Database Health

| Check | T+1h | T+4h | T+12h | T+24h |
|---|---|---|---|---|
| Supabase dashboard — connection count normal? | | | | |
| Supabase dashboard — query latency acceptable? | | | | |
| Signature count growing (not stuck at 0 or 1)? | | | | |
| No duplicate signatures slipping through? | | | | |

### Email Delivery

| Check | T+1h | T+4h | T+12h | T+24h |
|---|---|---|---|---|
| Brevo dashboard — delivery rate above 95%? | | | | |
| Any bounce or spam reports? | | | | |
| Verification emails arriving within 60 seconds? | | | | |
| Unsubscribe link working correctly? | | | | |

### Background Jobs

| Check | T+1h | T+4h | T+12h | T+24h |
|---|---|---|---|---|
| Inngest dashboard — any failed function runs? | | | | |
| Welcome email flow completing for new signers? | | | | |
| ActBlue webhook processing (if donations coming in)? | | | | |

### User Experience

| Check | T+1h | T+4h | T+12h | T+24h |
|---|---|---|---|---|
| Review first 10 signatures in admin — address verification working? | | | | |
| Test referral flow — share link → new signer → attribution correct? | | | | |
| Mobile petition flow working (test on a real phone)? | | | | |
| Voices submission form accessible (even if no submissions yet)? | | | | |

### Performance

| Check | T+1h | T+4h | T+12h | T+24h |
|---|---|---|---|---|
| Site responding within 2s on mobile? | | | | |
| No Vercel bandwidth or function invocation spikes? | | | | |

### Record Keeping

- [ ] **At T+1h:** Screenshot the Lighthouse scores for homepage and `/sign` — save as baseline documentation.
- [ ] **At T+24h:** Export a summary from PostHog: total visitors, unique signers, conversion rate, top referral sources. Save to `docs/launch-day-metrics.md` or equivalent.

---

## Rollback Procedures

If a critical issue is discovered, use the appropriate rollback method below. Each component can be rolled back independently.

| Component | Rollback Method | Steps | Recovery Time |
|---|---|---|---|
| **Next.js app** | Promote previous Vercel deployment | Vercel Dashboard → Deployments → find last working deployment → click "..." → "Promote to Production" | < 1 minute |
| **Database schema** | Supabase point-in-time recovery | Supabase Dashboard → Settings → Database → Point-in-Time Recovery → select timestamp before the bad migration | 5-15 minutes |
| **DNS records** | Revert Cloudflare DNS changes | Cloudflare Dashboard → DNS → restore previous record values (keep a copy of pre-launch values in this doc or a team channel) | 1-5 minutes + propagation |
| **Inngest functions** | Redeploy previous commit | Revert the commit on `main` or promote previous Vercel deployment; Inngest re-syncs function definitions automatically on next deploy | < 2 minutes |
| **Brevo email templates** | Re-upload previous versions | Brevo Dashboard → Transactional → Templates → edit and restore previous content | ~5 minutes |

### Rollback decision tree

1. **Site is down or returning 500 errors globally** → Roll back the Next.js app via Vercel immediately. Then investigate.
2. **Petition submissions failing but site loads** → Check Vercel function logs for the `/api/petition/sign` route. If it's a code bug, roll back the deployment. If it's Supabase or Smarty, check those dashboards.
3. **Emails not sending** → Check Brevo dashboard for API errors or blocks. If Brevo is down, the site still works — signatures are recorded, emails will be retried by Inngest. Not a site-down emergency.
4. **Database corruption or bad migration** → Use Supabase point-in-time recovery. This takes the database offline briefly. Coordinate with a Vercel rollback if the app depends on the new schema.
5. **DNS issues (site unreachable)** → Check Cloudflare for accidental record changes. Restore the A record (`76.76.21.21`) and CNAME (`cname.vercel-dns.com`). Propagation may take up to 5 minutes.

### Pre-launch DNS snapshot

Record these values before launch so they can be restored quickly:

| Record | Type | Value | Proxied? |
|---|---|---|---|
| `confluenceohio.org` | A | `76.76.21.21` | No (DNS only) |
| `www.confluenceohio.org` | CNAME | `cname.vercel-dns.com` | No (DNS only) |

---

## Emergency Contacts

| Role | Person | Contact |
|---|---|---|
| Campaign lead / admin | Tim | (add phone/email) |
| Vercel support | — | support@vercel.com or dashboard chat (Pro plan) |
| Supabase support | — | support@supabase.com or dashboard |
| Brevo support | — | Brevo dashboard support chat |
| Smarty support | — | support@smarty.com |

---

## Post-Launch (Day 2+)

Once the T+24h monitoring checklist is complete with no critical issues:

1. Write a brief internal summary of launch day: traffic, signups, any issues encountered and how they were resolved.
2. Review PostHog funnels — identify any drop-off points in the petition flow.
3. Check that the voices moderation queue is accessible and ready for incoming submissions.
4. Begin the iteration plan from Artifact 17.
