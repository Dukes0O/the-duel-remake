# LAUNCHER-PORT: reuse the running game

Status: ready-to-merge

Repeated desktop shortcut clicks now check `localhost:5174` before installing,
building, or starting another Vite process. If the existing page matches The
Duel's title, description, app root, and available module entry, the shortcut opens that
same origin, keeping the player's browser career. If an unrelated service owns
the port, the launcher shows an error and leaves it alone. A second check after
a rare startup race handles another game launcher winning the port first.

First launch still installs locked dependencies if needed, builds `dist` if
needed, and serves the finished build with Vite preview. The launcher does not
change game code or stored player data.

Verification: `node tools/test-launcher-port.mjs` exercises a development page,
a built page, unrelated and incomplete pages, a redirect, JSON, and a free
private port. It checks both probe results and launcher exit codes without
touching port 5174. The real Vite preview on private port 5191 returned the
reuse exit code. The lane gate passed 6 suites, including 518 core checks, and
the production build passed.
