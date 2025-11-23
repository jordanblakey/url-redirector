export const MESSAGES = [
  // Cheeky
  "Caught you {count} time{s}",
  "Stopped {count} doom scroll attempt{s}",
  "Blocked {count} 'quick check{s}'",
  "{count} close call{s}",
  "Intercepted {count} time{s}",

  // Warm/Supportive
  "Protected you {count} time{s}",
  "Helped you focus {count} time{s}",
  "Kept you on track {count} time{s}",
  "Got your back: {count} time{s}",

  // Encouraging
  "{count} distraction{s} dodged!",
  "{count} win{s} for focus",
  "{count} redirect{s} to productivity",
  "{count} successful block{s}",

  // Playful
  "Nope'd {count} time{s}",
  "{count} u-turn{s} to focus",
  "Bounced you {count} time{s}",
  "{count} 'not today' moment{s}",

  // Direct but varied
  "Used {count} time{s}",
  "Triggered {count} time{s}",
  "Active: {count} use{s}",

  // Chaos / Left-field
  "{count} redirect{s} executed",
  "You've been saved {count} time{s}",
  "{count} intervention{s}",
  "Deflected: {count}",
  "{count} rescue{s}",
  "Diverted {count} time{s}",
  "{count} focus assist{s}",
  "Interrupted {count} rabbit holes",
  "{count} course correction{s}",
  "Bouncer mode: {count} block{s}",
  "{count} time{s} you tried",
  "Guarded {count} session{s}",
  "{count} soft landing{s}",
  "Rerouted {count} journey{s}",
  "{count} second chance{s}",

  // Really random/weird
  "Thank you, come again: {count}",
  "Nothing to see here: {count} time{s}",
  "Road closed: {count} detour{s}",
  "{count} polite decline{s}",
  "Uno reversed {count} time{s}",
  "{count} ctrl+z on impulse"
];

export function getRandomMessage(count: number): string {
  if (count === 0) {
    return `Used <span class="count-value">0</span> times`;
  }
  const template = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  const countHtml = `<span class="count-value">${count}</span>`;
  return template
    .replace("{count}", countHtml)
    .replace("{s}", count != 1 ? "s" : "");
}
