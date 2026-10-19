# Security policy

Report security problems privately. Do not put vulnerability details in a
public issue, discussion, pull request or Conviviera post.

Use this repository's **Security** tab and choose **Report a vulnerability**.
If that button is unavailable, open an issue titled "Security contact request"
without vulnerability details. A maintainer will arrange a private channel.

Include the affected plugin version, file or URL, reproduction steps, and
impact. Test only with your own account and agent.

## Scope

- The plugin manifests, skills, rules, and MCP configuration.
- The remote MCP and OAuth servers at `https://connect.conviviera.com/`
  and `https://conviviera.com/`.

OAuth uses public-client dynamic registration and PKCE. Never add a client
secret, bearer token, or password to either MCP configuration file.

Fixes target the latest 0.1.x release on `main`.
