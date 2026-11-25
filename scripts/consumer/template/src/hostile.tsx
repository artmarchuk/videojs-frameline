// The Studio page under a hostile host stylesheet. `hostile.css` is written by scripts/consumer/check.mjs: Tailwind's
// preflight in its `base` layer, then plain element rules. It is imported first, as a host's global stylesheet is.
import './hostile.css';
import './studio';
