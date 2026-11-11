# Your App Isn't Slow. It's Out of Order.

Slides from my SeattleJS talk about the event loop: microtasks and tasks, why `forEach()` doesn't wait for promises, `Promise.all()` / `Promise.allSettled()`, `setTimeout(fn, 0)`, `scheduler.yield()`, and Web Workers.

The deck is built with [Slidev](https://sli.dev). The demo app the code comes from lives in its own repo, [seattle-js-async-talk](https://github.com/ryansoeder/seattle-js-async-talk), with one branch per fix.

## Run it

You need [Node.js](https://nodejs.org) 22.22 or newer.

```sh
git clone https://github.com/ryansoeder/seattle-js-async-talk-slides.git
cd seattle-js-async-talk-slides
npm install
npm run dev
```
