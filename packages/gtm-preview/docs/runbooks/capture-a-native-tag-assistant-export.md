# Capture a native Tag Assistant export

Task-22 compares what this tool exports against what a real preview session produces. That
needs a genuine export of the same flow, and producing one needs a signed-in Google session,
so it cannot be done from the CLI. This runbook is written to be handed to an agent driving a
real browser, such as Claude in the desktop app with the Chrome extension.

Give the agent the prompt below, adjusting the site, container and flow for the comparison
you want. Everything it needs to know is in it.

---

## Prompt

You are driving a real Chrome browser that is signed in to Google. Capture a Google Tag
Assistant debug session and export it as a file. Work in the existing window; do not open
extra windows.

**Goal.** Produce a Tag Assistant session export (a `.json` file) for a specific click flow on
https://www.sjpools.com/, and save it to
`/Users/ata/gtm-preview/reports/sjpools-recorded.tag-assistant.contact.json`.

**Before you start.** The signed-in account needs access to Google Tag Manager container
`GTM-5KNSPW9K`, in the account named "SJ Pools, Inc.". If Tag Assistant shows a "Sign in" link,
stop and say so, because the rest will not work.

**Steps.**

1. Go to https://tagmanager.google.com/ and open container `GTM-5KNSPW9K`.
2. Click **Preview** in the top right. Tag Assistant opens in a new tab and asks for a URL.
3. Enter `https://www.sjpools.com/`, leave "Include debug signal in the URL" ticked, and
   click **Connect**. The site opens in another tab with a Tag Assistant badge on it.
4. Check the Tag Assistant tab before going further. It must show `GTM-5KNSPW9K` with session
   data. If it says "GTM-5KNSPW9K is not enabled for debugging", the Preview step in step 2
   did not take effect; go back and repeat it rather than continuing.
5. Go to the site tab and do exactly this, in this order:
   1. Accept the cookie banner by clicking **Accept All**. The banner covers the page, so
      nothing else is clickable until you do. It is also what grants consent, and a session
      without it is not comparable.
   2. Click **CONTACT** in the navigation and wait for the contact page to load.
   3. Wait a few seconds after the page settles. Clicking immediately lands before the page
      has bound its link listeners and the click is lost.
   4. Click the email link, **Email: contact@sjpools.com**.
   5. Click the phone link, **(408) 445-2264**, in the page body rather than the header.
   6. Do not fill in or submit the contact form.
6. Return to the Tag Assistant tab. Confirm the left timeline shows both page loads, the home
   page and the contact page, and that two Link Click events appear.
7. Open the three-dot **More options** menu at the top right of the session panel and choose
   **Export**, then confirm in the dialog. Do not click "Stop debugging" first; the session
   has to be live to export.
8. The file downloads to the Downloads folder. Move it to
   `/Users/ata/gtm-preview/reports/sjpools-recorded.tag-assistant.contact.json`, overwriting
   anything already there.

**Report back with:**

- The value of `data.containers[0].environmentName` and `data.containers[0].version` in the
  exported file. These say which container version the session ran against, and the
  comparison has to be run against the same one.
- How many containers `data.containers` holds, and their `publicId` values.
- Anything that did not match these steps: a banner that did not appear, a click that produced
  no event, a warning in the Tag Assistant panel.

**Two cautions.**

This is a live site, and a native preview session sends real hits. The email and phone clicks
fire Google Ads conversion tags, and those land in the client's Ads account as real
conversions. There is no debug flag for Ads the way there is for GA4. One session adds two
conversions. Do not repeat the flow more times than you need.

Do not change anything in Tag Manager. No publishing, no editing tags, no creating versions.
Preview only.

---

## After the capture

Compare the file against one this tool produced for the same flow:

```bash
pnpm dev run scenarios/sjpools-contact.json --tag-assistant reports/sjpools-contact.tag-assistant.json
pnpm compare reports/sjpools-recorded.tag-assistant.contact.json reports/sjpools-contact.tag-assistant.json
```

Set the scenario's `container.environment` to whatever environment the native capture
reported first. Comparing against a different container version buries the format differences
under content differences, which is the mistake that cost a round in phase one. Findings go in
`docs/research/2026-09-23-export-fidelity.md`.
