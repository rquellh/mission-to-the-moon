# Links that open a moment

A link can open a mission at a moment and a view. For example:

- The first landing: [https://moon.ryanquellhorst.com/?mission=apollo-11&t=102:45:40&view=moon](https://moon.ryanquellhorst.com/?mission=apollo-11&t=102:45:40&view=moon)
- The first docking: [https://moon.ryanquellhorst.com/?mission=gemini-8&t=06:33:16&view=spacecraft](https://moon.ryanquellhorst.com/?mission=gemini-8&t=06:33:16&view=spacecraft)

The same options work on the dev server address.

## The options

- `mission` is a mission's id: `gemini-3` to `gemini-12` (with `gemini-6a` and `gemini-9a`), `apollo-7` to `apollo-17`, or `apollo-1` for the memorial page. Apollo 11 opens when it is left out.
- `t` is mission time as hours:minutes:seconds. A minus sign means before liftoff.
- `view` is `earth`, `moon`, `spacecraft`, or `journey`.
- `start=tour` or `start=explore` skips the first screen.
- `event` opens a mission paused at one of its events, by the event's id.
- `extra` opens one of the extras: `orbit`, `stages`, `docking`, `landing`, `patches`, `landing-sites`, or `rockets`.
