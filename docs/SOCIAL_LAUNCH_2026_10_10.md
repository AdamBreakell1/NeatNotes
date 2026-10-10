# RecallStride social launch — 10 October 2026

The launch artwork and copy are ready. Both **[@RecallStride on X](https://x.com/RecallStride)** and **[@recallstride on Instagram](https://www.instagram.com/recallstride/)** are registered and have their first posts published. Their actual profile and post links are recorded below. TikTok and the optional Facebook Page have not been created by this task.

## Brand and artwork

Use **RecallStride** as the display name and **@recallstride** as the preferred handle. If it is unavailable, try **@recallstrideapp**, then **@recallstridecs**. Handle availability must be confirmed by the platform. Keep the same handle across platforms where possible. The public website is **https://recallstride.com**.

The dedicated account email is **recallstride@gmail.com**, created by the owner. Use this for social registration and account recovery. Its password is not stored in this public launch kit. For X, prefer **@recallstridecs** as the fallback: it has 14 characters and fits the current Help Center's stated “fewer than 15 characters” rule.

The artwork uses the current website's light theme: pale blue `#f5f7fa`, navy `#192b43`, forest teal `#236a5e`, and the visible RS mark's navy `#20374e` / mint `#c1f3e0`. The mark preserves the website's shape, border, lettering and spacing. It follows the current on-page mark rather than the older favicon's diagonal decorative stripes. Typography is Inter, the first typeface declared in the site's CSS; the exported vectors outline the glyphs so the type stays consistent on another computer. No new logo or AI-generated approximation has been introduced.

| File | Size | Use |
| --- | --- | --- |
| `brand/social/first-post-square.png` | 1080 × 1080 | X, Facebook, or square feed image |
| `brand/social/first-post-portrait.png` | 1080 × 1350 | Instagram feed image |
| `brand/social/first-post-portrait.jpg` | 1080 × 1350 | Instagram-compatible upload; use this JPEG in the current publishing flow |
| `brand/social/first-post-story.png` | 1080 × 1920 | Story or vertical photo post; the footer leaves space for overlay controls |
| `brand/social/profile-avatar.png` | 1024 × 1024 | Profile image, with lettering clear of the circle crop |
| `brand/social/profile-header.png` | 1500 × 500 | X header |
| `assets/recallstride-social-preview.png` | 1200 × 630 | Website Open Graph / social link preview |

Every image also has an outlined SVG master under `brand/social/`. All raster exports have an opaque background. `export-manifest.json` records the actual dimensions and file sizes. The social link preview is copied into `assets/` for publication by the web build; the social account kit is not part of the public app bundle.

Copy-friendly bios, captions, image paths and alt text are in **`brand/social/account-copy.json`**.

## Instagram

Verified account: **[@recallstride](https://www.instagram.com/recallstride/)**. Display name: **RecallStride**. The avatar is uploaded, the following bio is saved, and the [first post is published](https://www.instagram.com/recallstride/p/DeU6EpoilUK/). It uses `first-post-portrait.jpg`: Instagram rejected the PNG upload with “Media type invalid,” and the JPEG variant was accepted. The platform displayed “Your post has been shared” and the profile showed one post; the caption and alt text were verified in the publishing flow.

Bio:

```text
Revise. Practise. Code.
OCR A-Level Computer Science in one workspace.
60 coding tasks. Start free: recallstride.com
```

First caption:

```text
Meet RecallStride.

Your OCR A-Level Computer Science revision, questions and coding practice in one workspace.

Choose a topic. Test what you remember. Write and run your own pseudocode with 60 free coding tasks.

Revise. Practise. Code.
Start free at recallstride.com.

#ALevelComputerScience #ComputerScience #Revision #Pseudocode #ALevels
```

The desktop website field is disabled and directs the owner to the mobile app. The saved bio contains the readable domain; a clickable profile website link has not been added. The caption therefore uses the plain domain without a “link in bio” claim.

## TikTok

Display name: **RecallStride**. Use `profile-avatar.png` and the vertical `first-post-story.png` for a photo post where the account interface supports that format.

Bio:

```text
OCR A-Level Computer Science. Revise. Practise. Code. recallstride.com
```

First caption:

```text
OCR A-Level Computer Science, all in one workspace. Revise a topic, practise questions and run your own pseudocode with 60 free coding tasks. Meet RecallStride. Start free at recallstride.com.

#ALevelComputerScience #ComputerScience #Revision #Pseudocode #ALevels
```

The domain is readable in the bio even if the new account cannot add a clickable website field. Do not change the account category, buy followers or claim a business registration merely to obtain a link field. If photo publishing is absent in the web interface, the same completed image is ready for a photo post from the owner's app; record the actual limitation and leave the image available.

## X

Verified account: **[@RecallStride](https://x.com/RecallStride)**. The [first post is published](https://x.com/RecallStride/status/2109011974726000772).

Display name: **RecallStride**. Use `profile-avatar.png`, `profile-header.png` and `first-post-square.png`. X recommends a 1500 × 500 header and a 400 × 400 profile image; the supplied 1024 × 1024 profile master can be resized by the upload interface. Its documented bio limit is 160 characters, and standard posts allow 280 characters. The bio below contains 142 characters and the caption 231, so a paid subscription is unnecessary. [X profile settings](https://help.x.com/en/managing-your-account/how-to-customize-your-profile), [X post instructions](https://help.x.com/en/using-x/how-to-post).

Bio:

```text
OCR A-Level Computer Science revision, questions and 60 coding tasks in one workspace. Revise. Practise. Code. Start free at recallstride.com.
```

First post:

```text
Meet RecallStride.

OCR A-Level Computer Science revision, questions and 60 coding tasks in one workspace.

Revise. Practise. Code. Start free: https://recallstride.com

#ALevelComputerScience #ComputerScience #Revision #Pseudocode
```

The introductory post is pinned on the profile; the live profile displayed “Pinned”.

## Facebook Page, if included

Create a Page named **RecallStride** under the owner's genuine existing Facebook account rather than inventing a new personal identity. Use the profile avatar and square image. The short description and first post are in `account-copy.json`.

## Accessibility and account records

Image alt text:

```text
RecallStride's navy RS mark above the name RecallStride and the words Revise, Practise and Code. The website recallstride.com appears below on a white card against a pale blue background.
```

Use it in the platform's image description field where supported. The small set of hashtags describes the course and task format; it is not a promise of reach or search ranking.

Use **recallstride@gmail.com** for the new social accounts. Store passwords and any recovery codes in the owner's private password store or a protected local file outside the repository. Do not put passwords, phone numbers, email verification codes or birth dates in this document, the artwork or Git history. The date of birth required by a platform must be the actual adult account operator's date, not the product launch date.

### Registration requirements checked on 10 October 2026

- **X:** email or phone signup is supported. Email signup sends a confirmation email; one email address can belong to one X account at a time. After registration, add the avatar, header, bio, website and chosen username, then publish the prepared first post. Use **RecallStride** for the public name and the operator's actual birthday when requested. [Official X signup guidance](https://help.x.com/en/using-x/create-x-account), [official profile settings](https://help.x.com/en/managing-your-account/how-to-customize-your-profile).
- **TikTok:** keep access to the signup email for login and recovery. An email address can belong to only one TikTok account. Set the desired username carefully: TikTok allows changes only once every 30 days, and a change also changes the profile URL. A clickable website field is documented for accounts with at least 1,000 followers or a Registered Business Account, so the supplied bio already contains the readable domain. [Official account creation](https://support.tiktok.com/en/getting-started/creating-an-account/creating-an-account), [email requirements](https://support.tiktok.com/en/log-in-troubleshoot/log-in/email-and-phone-number?lang=tr), [username rules](https://support.tiktok.com/en/getting-started/setting-up-your-profile/changing-your-username?lang=id), [website link rules](https://support.tiktok.com/en/getting-started/setting-up-your-profile/linking-another-social-media-account?lang=hi).
- **Instagram:** prepare the dedicated email, **RecallStride** display name, preferred handle, a unique password and the operator's genuine birthday for the actual registration flow. Instagram's official signup and help pages rejected this research tool with HTTP 429 / access restrictions, so this audit does not claim that its complete current signup sequence or verification requirements were independently confirmed. The live platform's prompts determine the remaining steps. [Official signup page](https://www.instagram.com/accounts/emailsignup/), [official account creation help](https://help.instagram.com/155940534568753).

Email codes, phone verification or an identity challenge should be completed by the actual owner when the platform asks. No verification requirement is bypassed and no personal details are invented. No paid platform subscription is required for the prepared X bio and first post.

| Platform | Actual profile URL | Actual first post URL | Completed setup |
| --- | --- | --- | --- |
| Instagram | [@recallstride](https://www.instagram.com/recallstride/) | [First post](https://www.instagram.com/recallstride/p/DeU6EpoilUK/) | Account verified; avatar uploaded; bio saved; JPEG post published with caption and alt text; readable domain in bio |
| TikTok | To be recorded after registration | To be recorded after publication | No profile creation claimed by the asset task |
| X | [@RecallStride](https://x.com/RecallStride) | [First post](https://x.com/RecallStride/status/2109011974726000772) | Profile URL confirmed; avatar, header, bio and website saved; first post published and pinned |
| Facebook Page | To be recorded if created | To be recorded if published | Optional platform |

Local Instagram publication evidence is saved in `test-results/launch/instagram-profile-published.png` and `test-results/launch/instagram-publication-confirmed.png`. These screenshots are local validation files excluded from Git and the public app bundle.

## Rebuilding the artwork

The unmodified Inter variable font and its SIL Open Font License are included in `brand/social/`. They were sourced from the official Inter repository at commit `353b61b9f4430d5f420d56605a6e7993e0941470`. [Inter's licence](https://github.com/rsms/inter/blob/master/LICENSE.txt).

With Python packages `fonttools` and `brotli`, run `python3 brand/social/build-artwork.py` to create the six SVG masters. With Node package `sharp` available, run `node brand/social/render-artwork.cjs` to create the PNG files, export manifest and public link preview. The renderer also recreates the Instagram JPEG from the portrait PNG. These are development tools, not app runtime dependencies. Review palette values against `student-layout.css` when the product branding changes.
