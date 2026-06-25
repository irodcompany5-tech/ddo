# Security Policy

## Secrets

Do not commit API keys, GitHub tokens, `.env` files, transcripts containing secrets, or private datasets.

Use `.env.example` as the template and keep local values in `.env`.

The UI key field sends the key only to the local Node server for the current run. The server does not write that key to disk.

## Reporting

If you find a vulnerability, open a private security advisory on GitHub or contact the repository owner directly.

## Operational Notes

- Prefer short-lived or fine-grained API tokens.
- Revoke any token that was pasted into a chat, issue, commit, or log.
- Keep `node_modules/`, `.env`, generated run outputs, and logs out of Git.
- Run `npm audit` and `npm test` before releases.
