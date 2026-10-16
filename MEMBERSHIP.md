# Membership preview — not production-ready until launch checks pass

Public `/` is the new welcome page; `/samples/` contains exactly five existing fictional cases, selected from urine, CSF, blood, wound and screens. Each has three decisions. `/sign-up/`, `/log-in/`, `/forgot-password/` and `/reset-password/` are separate pages. `/trainer/` retains all 300 scenarios; `/atlas/` retains edition 03.

The Vercel function `api/member.js` checks Supabase users on the server before serving member HTML or data. Only a fixed file allowlist is served. Private data is excluded from `dist`. Authentication uses Secure, HttpOnly, SameSite=Lax host-only cookies; POSTs require same-origin JSON. No service-role key is needed. Existing trainer source files are unchanged; the served progress key is scoped per account. Progress remains device-local. Existing anonymous progress remains stored but is not automatically assigned to a new user.

## Required before opening public registration
- Verify that SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or supplied NEXT_PUBLIC equivalents) are connected to the deployment. Do not copy secret keys into browser code.
- Configure custom SMTP with a verified sender. Supabase default email is restricted to project team members and is not suitable for public signup.
- Keep email confirmation enabled. Configure the production Site URL and explicitly allow `/auth/complete/` callback URLs for production and the selected preview URL. Recovery uses `/auth/complete/?mode=recovery`.
- Set Supabase auth rate limits and anti-abuse protections appropriate to expected traffic. The provider's defaults apply; the app has no distributed rate limiter of its own.
- Complete the privacy page's owner contact, retention and account deletion process. The current privacy page explicitly identifies this outstanding launch requirement.
- Test a real signup, delivered verification, login, expired session refresh, logout and password recovery end to end. Use only an owner-authorized test account.
- Set MEMBERSHIP_EMAIL_READY=true only after email delivery and privacy details are complete. Until then, signup and recovery fail closed with an explanatory message; the five samples work.
- Check the welcome/account/sample views on a phone and desktop. Do not merge to main until the above passes.

Run `npm install` then `npm test` for mock-based authorization tests and sample rendering tests. These do not prove live email delivery or live credentials work.

## Existing public copies
The repository and older deployments already contain the original public trainer. Membership protects routes in the new deployment; it does not retroactively remove public copies or downloads. Do not represent this as DRM or confidentiality protection for previously public learning content.
