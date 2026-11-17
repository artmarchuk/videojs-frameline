# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem. Report it privately instead: open the repository's **Security** tab and choose **Report a vulnerability**. Only the maintainer sees the report.

Please include what you found, the steps or a URL that shows it, and the browser you used. You will get a reply within a week.

## Supported versions

Only the latest commit on `main`, and the site deployed from it at https://frameline.artmarchuk.me, get security fixes. There are no released versions yet.

## Scope

Frameline is a player skin. The parts most worth a look are the embed page (`/embed.html`), which reads a video source, poster and options from its URL, and anything that loads media or text from another origin.
