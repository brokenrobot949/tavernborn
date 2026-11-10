// Background worker for tools/simulate.html: runs its share of the heroes off the main thread so
// the page stays responsive. Hero numbers `from`, `from + step`, ... up to `count`.
import { prepareWorld, heroPlan, runHero } from './simulate-core.js';

onmessage = (e) => {
  const { from, step, count, options } = e.data;
  prepareWorld(options);
  for (let i = from; i < count; i += step) postMessage({ i, result: runHero(heroPlan(i), options) });
  postMessage({ done: true });
};
