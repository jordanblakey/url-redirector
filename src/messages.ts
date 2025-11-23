export const MESSAGES = [
  // Cheeky
  "Caught you {count} times",
  "Stopped {count} doom scroll attempts",
  "Blocked {count} 'quick checks'",
  "{count} close calls",
  "Intercepted {count} times",

  // Warm/Supportive
  "Protected you {count} times",
  "Helped you focus {count} times",
  "Kept you on track {count} times",
  "Got your back: {count} times",

  // Encouraging
  "{count} distractions dodged!",
  "{count} wins for focus",
  "{count} redirects to productivity",
  "{count} successful blocks",

  // Playful
  "Nope'd {count} times",
  "{count} u-turns to focus",
  "Bounced you {count} times",
  "{count} 'not today' moments",

  // Direct but varied
  "Used {count} times",
  "Triggered {count} times",
  "Active: {count} uses",

  // Chaos / Left-field
  "{count} redirects executed",
  "You've been saved {count} times",
  "{count} interventions",
  "Deflected: {count}",
  "{count} rescues",
  "Diverted {count} times",
  "{count} focus assists",
  "Interrupted {count} rabbit holes",
  "{count} course corrections",
  "Bouncer mode: {count} blocks",
  "{count} times you tried",
  "Guarded {count} sessions",
  "{count} soft landings",
  "Rerouted {count} journeys",
  "{count} second chances",

  // Really random/weird
  "Thank you, come again: {count}",
  "Nothing to see here: {count} times",
  "Road closed: {count} detours",
  "{count} polite declines",
  "Uno reversed {count} times",
  "{count} ctrl+z on impulse"
];

export function getRandomMessage(count: number): string {
  const template = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  return template.replace("{count}", count.toString());
}
