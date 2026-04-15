# Cloudflare DNS Setup Guide — Confluence Ohio

Step-by-step checklist for configuring Cloudflare DNS, SSL, Turnstile, and email authentication for `confluenceohio.org`. Work through each section in order. Every checkbox is an action to complete.

**Prerequisites:**
- Cloudflare account with `confluenceohio.org` already added (Free plan is sufficient)
- Vercel project created with the Confluence Ohio deployment
- Brevo account created with a sending domain ready to configure
- Google Search Console access for site verification

---

## 1. Login and Site Selection

- [ ] Go to [dash.cloudflare.com](https://dash.cloudflare.com) and log in
- [ ] Select **confluenceohio.org** from the site list
- [ ] Confirm the plan shows **Free** (sufficient for DNS, CDN, DDoS protection, and Turnstile)
- [ ] Navigate to **DNS** → **Records** in the left sidebar

---

## 2. DNS Records

Create every record listed below. Pay close attention to the **Proxy status** column — getting this wrong will break SSL certificate issuance.

### 2.1 Primary Domain Records

> **CRITICAL WARNING: DNS-Only Mode (Gray Cloud) Required**
>
> Vercel issues its own SSL certificates via Let's Encrypt. To do this, Vercel needs to validate an `_acme-challenge` DNS record. If Cloudflare's proxy (orange cloud) is enabled, it intercepts this validation and Vercel **cannot issue or renew certificates**. This will cause SSL errors and site downtime.
>
> **Always use DNS-only mode (gray cloud icon) for the A and CNAME records pointing to Vercel.** Cloudflare still provides authoritative DNS — it just doesn't proxy the traffic.
>
> To set DNS-only mode: when creating/editing a record, click the orange cloud icon to toggle it to gray. The status should read "DNS only."

- [ ] Create the **apex A record**:

| Field | Value |
|---|---|
| Type | `A` |
| Name | `@` |
| IPv4 address | `76.76.21.21` |
| Proxy status | **DNS only** (gray cloud) |
| TTL | Auto |

> **Note:** `76.76.21.21` is Vercel's anycast IP for apex domains. Before creating this record, verify the current IP in your Vercel project under **Settings → Domains**. Vercel displays the expected A record value there. If it differs, use Vercel's value.

- [ ] Create the **www CNAME record**:

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `www` |
| Target | `cname.vercel-dns.com` |
| Proxy status | **DNS only** (gray cloud) |
| TTL | Auto |

- [ ] In Vercel, go to **Settings → Domains** and add both `confluenceohio.org` and `www.confluenceohio.org`. Vercel should show both as correctly configured once DNS propagates.

### 2.2 Email Authentication Records (Brevo)

These records authorize Brevo to send email from `@confluenceohio.org` addresses and protect against spoofing. See **Section 5** below for important notes about getting the exact DKIM values from Brevo.

- [ ] Create the **SPF record**:

| Field | Value |
|---|---|
| Type | `TXT` |
| Name | `@` |
| Content | `v=spf1 include:sendinblue.com ~all` |
| TTL | Auto |

> **Note:** If you already have a TXT record on `@` (e.g., for Google verification), SPF must be a separate TXT record — multiple TXT records on the same name are allowed. Do **not** combine them into one record.

- [ ] Create **DKIM CNAME record 1**:

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `mail._domainkey` |
| Target | `mail._domainkey.mailin.fr` |
| Proxy status | **DNS only** (gray cloud) |
| TTL | Auto |

- [ ] Create **DKIM CNAME record 2**:

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `s1._domainkey` |
| Target | `s1.domainkey.sendinblue.com` |
| Proxy status | **DNS only** (gray cloud) |
| TTL | Auto |

- [ ] Create **DKIM CNAME record 3**:

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `s2._domainkey` |
| Target | `s2.domainkey.sendinblue.com` |
| Proxy status | **DNS only** (gray cloud) |
| TTL | Auto |

- [ ] Create the **DMARC record**:

| Field | Value |
|---|---|
| Type | `TXT` |
| Name | `_dmarc` |
| Content | `v=DMARC1; p=quarantine; rua=mailto:dmarc@confluenceohio.org; pct=100` |
| TTL | Auto |

> **DMARC policy explanation:** `p=quarantine` tells receiving mail servers to quarantine (typically move to spam) any email from `@confluenceohio.org` that fails both SPF and DKIM checks. `rua=mailto:dmarc@confluenceohio.org` sends aggregate reports to that address — make sure this mailbox exists or forwards somewhere you'll check. `pct=100` applies the policy to 100% of failing messages.

### 2.3 Google Search Console Verification

- [ ] Go to [Google Search Console](https://search.google.com/search-console) and add `confluenceohio.org` as a property
- [ ] Select the **Domain** verification method and copy the TXT record value Google provides
- [ ] Create the **Google verification TXT record**:

| Field | Value |
|---|---|
| Type | `TXT` |
| Name | `@` |
| Content | `google-site-verification=XXXXX` (paste the value from Google) |
| TTL | Auto |

- [ ] Return to Google Search Console and click **Verify**

### 2.4 Complete DNS Records Summary

After completing all records, your DNS dashboard should contain these entries:

| Type | Name | Content | Proxy |
|---|---|---|---|
| `A` | `confluenceohio.org` | `76.76.21.21` | DNS only |
| `CNAME` | `www` | `cname.vercel-dns.com` | DNS only |
| `TXT` | `confluenceohio.org` | `v=spf1 include:sendinblue.com ~all` | N/A |
| `CNAME` | `mail._domainkey` | `mail._domainkey.mailin.fr` | DNS only |
| `CNAME` | `s1._domainkey` | `s1.domainkey.sendinblue.com` | DNS only |
| `CNAME` | `s2._domainkey` | `s2.domainkey.sendinblue.com` | DNS only |
| `TXT` | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@confluenceohio.org; pct=100` | N/A |
| `TXT` | `confluenceohio.org` | `google-site-verification=XXXXX` | N/A |

- [ ] Review the DNS records list and confirm all 8 records are present with correct proxy status

---

## 3. SSL/TLS Settings

Since we're using DNS-only mode, SSL is handled entirely by Vercel (auto-issued Let's Encrypt certificates). These Cloudflare settings are configured as a safety net in case proxy mode is ever toggled on.

- [ ] Navigate to **SSL/TLS** → **Overview** in the Cloudflare sidebar
- [ ] Set encryption mode to **Full (strict)**
- [ ] Navigate to **SSL/TLS** → **Edge Certificates**
- [ ] Set **Always Use HTTPS** to **On**
- [ ] Set **Minimum TLS Version** to **TLS 1.2**

> **Note:** HSTS is configured at the application level in `next.config.ts` via response headers (max-age 2 years, includeSubDomains, preload). Do **not** enable HSTS in Cloudflare's dashboard — let Vercel/Next.js handle it to avoid conflicts. After 3+ months of stable HSTS headers, submit the domain to the [HSTS preload list](https://hstspreload.org/).

---

## 4. Cloudflare Turnstile Setup

Turnstile is Cloudflare's CAPTCHA alternative — it protects the petition and community voices forms from bots.

- [ ] In the Cloudflare Dashboard, click **Turnstile** in the left sidebar (or navigate to [dash.cloudflare.com/turnstile](https://dash.cloudflare.com/?to=/:account/turnstile))
- [ ] Click **Add site**
- [ ] Fill in the widget configuration:

| Field | Value |
|---|---|
| Site name | `Confluence Ohio` |
| Domain | `confluenceohio.org` |
| Widget type | **Managed** |

> **Widget type explanation:** "Managed" mode is invisible to most users (low-risk visitors pass automatically) but shows an interactive challenge when Cloudflare detects suspicious behavior. This gives the best user experience while maintaining bot protection. Do not use "Non-interactive" (always invisible, less secure) or "Interactive" (always shows a challenge, worse UX).

- [ ] Click **Create**
- [ ] Copy the **Site Key** (starts with `0x...`) — this is the public key used in the browser widget
- [ ] Copy the **Secret Key** — this is the server-side key used for token validation
- [ ] In Vercel, go to **Settings → Environment Variables** and set:
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = the Site Key (add to Preview and Production environments)
  - `TURNSTILE_SECRET_KEY` = the Secret Key (add to Preview and Production environments, mark as Sensitive)
- [ ] For local development, use Cloudflare's always-passing test keys in `.env.local`:
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA` (always passes)
  - `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` (always passes)

> **Turnstile token rules to know:**
> - Tokens expire after **300 seconds** (5 minutes) — the form must be submitted within that window
> - Each token can only be validated **once** — replayed tokens return `timeout-or-duplicate`
> - Client-side widget alone does not protect forms — always validate server-side

---

## 5. Brevo Email Authentication

Brevo requires domain authentication to send email from `@confluenceohio.org`. The DKIM CNAME records in Section 2.2 use Brevo's standard selectors, but the **exact record values must be confirmed from Brevo's dashboard**.

### 5.1 Add Domain in Brevo

- [ ] Log in to [app.brevo.com](https://app.brevo.com)
- [ ] Navigate to **Settings** → **Senders & IP** → **Domains**
- [ ] Click **Add a domain**
- [ ] Enter `confluenceohio.org`
- [ ] Brevo will display the DNS records you need to add

### 5.2 Verify Brevo's Records Against What You Created

- [ ] Compare the DKIM CNAME records Brevo shows with the ones you created in Section 2.2
- [ ] If Brevo's record names or targets differ from what's in this guide, **update the Cloudflare records to match Brevo exactly** — Brevo's dashboard is the source of truth for their DKIM configuration
- [ ] Confirm the SPF record includes `sendinblue.com` (Brevo's sending infrastructure still uses this domain)
- [ ] Click **Verify** in Brevo's dashboard for each record type (SPF, DKIM, DMARC)
- [ ] All three should show green checkmarks once DNS propagates (may take up to 24 hours, usually faster)

### 5.3 Configure Sender

- [ ] In Brevo, go to **Settings** → **Senders & IP** → **Senders**
- [ ] Add a sender with your authenticated domain (e.g., `hello@confluenceohio.org`)
- [ ] Verify the sender email address if Brevo requires it

---

## 6. Security Settings

These settings provide additional protection even in DNS-only mode and will be active immediately if proxy mode is ever enabled.

- [ ] Navigate to **Security** → **Bots** and enable **Bot Fight Mode**
- [ ] Navigate to **Security** → **Settings** and enable **Browser Integrity Check**
- [ ] Navigate to **Scrape Shield** and enable **Email Address Obfuscation**
- [ ] Navigate to **Scrape Shield** and enable **Hotlink Protection**

> **Note:** In DNS-only mode, Bot Fight Mode and Browser Integrity Check won't actively filter traffic (since Cloudflare isn't proxying). They're configured now so they take effect immediately if you ever switch to proxy mode. Turnstile (configured above) handles bot protection at the application level regardless of proxy mode.

---

## 7. Verification Steps

Run these checks after completing all the above steps. DNS propagation typically takes 5-30 minutes but can take up to 48 hours.

### 7.1 DNS Propagation Check

Run these commands from your terminal to verify records have propagated:

- [ ] Verify the A record:
```bash
dig A confluenceohio.org +short
# Expected: 76.76.21.21
```

- [ ] Verify the www CNAME:
```bash
dig CNAME www.confluenceohio.org +short
# Expected: cname.vercel-dns.com.
```

- [ ] Verify the SPF record:
```bash
dig TXT confluenceohio.org +short | grep spf
# Expected: "v=spf1 include:sendinblue.com ~all"
```

- [ ] Verify the DMARC record:
```bash
dig TXT _dmarc.confluenceohio.org +short
# Expected: "v=DMARC1; p=quarantine; rua=mailto:dmarc@confluenceohio.org; pct=100"
```

- [ ] Verify DKIM CNAME records:
```bash
dig CNAME mail._domainkey.confluenceohio.org +short
# Expected: mail._domainkey.mailin.fr.

dig CNAME s1._domainkey.confluenceohio.org +short
# Expected: s1.domainkey.sendinblue.com.

dig CNAME s2._domainkey.confluenceohio.org +short
# Expected: s2.domainkey.sendinblue.com.
```

- [ ] Verify Google verification TXT (if added):
```bash
dig TXT confluenceohio.org +short | grep google
# Expected: "google-site-verification=XXXXX"
```

> **If records don't appear:** Wait 15 minutes and try again. If still missing after an hour, double-check the record was saved in Cloudflare's DNS dashboard. Common mistakes: wrong record type, typo in the name field, forgetting to click Save.

### 7.2 SSL Certificate Check

- [ ] Wait for Vercel to issue the SSL certificate (usually within minutes of DNS propagation)
- [ ] Check Vercel's domain settings — both `confluenceohio.org` and `www.confluenceohio.org` should show a green "Valid Configuration" status
- [ ] Verify the certificate from the command line:
```bash
openssl s_client -connect confluenceohio.org:443 -servername confluenceohio.org </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates
# Expected issuer: Let's Encrypt (or similar CA used by Vercel)
# Expected subject: confluenceohio.org
```

- [ ] Open `https://confluenceohio.org` in a browser and verify the padlock icon shows a valid certificate
- [ ] Open `https://www.confluenceohio.org` and verify it redirects to the apex domain (or vice versa, depending on Vercel's redirect config) with a valid certificate

### 7.3 HTTPS Redirect Check

- [ ] Verify HTTP redirects to HTTPS:
```bash
curl -I http://confluenceohio.org
# Expected: 301 or 308 redirect to https://confluenceohio.org
```

### 7.4 Turnstile Widget Test

- [ ] Deploy the site (or run locally with test keys)
- [ ] Navigate to the petition signing page (`/sign`)
- [ ] Confirm the Turnstile widget loads (in Managed mode it may be invisible — check the browser DevTools Network tab for requests to `challenges.cloudflare.com`)
- [ ] Submit the form and verify the server-side Turnstile validation succeeds (check server logs for the validation response)
- [ ] In the Cloudflare Turnstile dashboard, confirm the widget shows solve events under **Analytics**

### 7.5 Email Deliverability Test

- [ ] After Brevo domain verification is complete, send a test email from Brevo using the `@confluenceohio.org` sender
- [ ] Check the email headers for `dkim=pass`, `spf=pass`, and `dmarc=pass`
- [ ] Use [mail-tester.com](https://www.mail-tester.com/) to score the sending domain (aim for 9+/10)

---

## Troubleshooting

### SSL certificate not issuing on Vercel

**Symptom:** Vercel shows "Pending" or "Error" for the domain's SSL status.

**Fix:** Confirm both the A record and CNAME record are set to **DNS only** (gray cloud) in Cloudflare. If they're set to proxied (orange cloud), Cloudflare intercepts the ACME challenge and Vercel can't validate domain ownership. Toggle to gray cloud, wait 5 minutes, and retry in Vercel.

### Brevo DKIM verification failing

**Symptom:** Brevo shows DKIM as unverified even after adding CNAME records.

**Fix:** Double-check that the CNAME record names and targets match **exactly** what Brevo's dashboard shows. Brevo may update their selectors — this guide's values are Brevo's standard selectors as of writing but may not be current. Always defer to Brevo's dashboard. Also ensure DKIM CNAME records are set to DNS only (gray cloud), not proxied.

### dig shows old/wrong records

**Symptom:** `dig` returns stale data even after updating Cloudflare.

**Fix:** Your local DNS resolver may be caching old records. Try querying a public resolver directly:
```bash
dig A confluenceohio.org @1.1.1.1 +short
dig A confluenceohio.org @8.8.8.8 +short
```

If public resolvers show the correct value but your local machine doesn't, flush your local DNS cache:
```bash
# macOS
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder
```
