export const MESSAGES = [
  // --- EXISTING CHEEKY ---
  "Caught you {count} time{s}",
  "Blocked {count} 'quick check{s}'",
  "{count} close call{s}",
  "Intercepted {count} time{s}",

  // --- EXISTING WARM ---
  "Protected you {count} time{s}",
  "Helped you focus {count} time{s}",
  "Kept you on track {count} time{s}",
  "Got your back: {count} time{s}",

  // --- DEV / GAMER LOGIC ---
  "{count} infinite loop{s} broken",
  "Patched {count} brain bug{s}",
  "{count} stack overflow{s} prevented",
  "Respawned in productivity: {count} time{s}",
  "{count} XP gained in Willpower",
  "Runtime error avoided: {count} time{s}",
  "Garbage collection ran {count} time{s}",
  "Escaped the simulation {count} time{s}",
  "Console.log('Focused'): {count} time{s}",
  "Avoiding side-quests: {count} time{s}",

  // --- NEUROSCIENCE / HABIT LAB ---
  "Dopamine denied {count} time{s}",
  "Rewired {count} neural pathway{s}",
  "Prefrontal cortex engaged {count} time{s}",
  "Short-circuited {count} impulse{s}",
  "{count} victor{ies} over lizard brain",
  "Synapse saved {count} time{s}",
  "Craving crushed: {count} time{s}",

  // --- STOIC / HIGH GROUND ---
  "Chose the harder path {count} time{s}",
  "{count} vote{s} for your future self",
  "Memento Mori: {count}",
  "Discipline equals freedom: {count} win{s}",
  "{count} step{s} towards mastery",
  "Focus is a muscle: {count} rep{s}",

  // --- EXISTING OTHERS ---
  "{count} distraction{s} dodged!",
  "{count} win{s} for focus",
  "{count} redirect{s} to productivity",
  "{count} successful block{s}",
  "Nope'd {count} time{s}",
  "{count} u-turn{s} to focus",
  "Bounced you {count} time{s}",
  "{count} 'not today' moment{s}",
  "Used {count} time{s}",
  "Triggered {count} time{s}",
  "Active: {count} use{s}",
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
  "Thank you, come again: {count}",
  "Nothing to see here: {count} time{s}",
  "Road closed: {count} detour{s}",
  "{count} polite decline{s}",
  "Uno reversed {count} time{s}",
  "{count} ctrl+z on impulse",

  // --- THE ROAST (Slightly meaner) ---
  "You really wanted that dopamine: {count} try{s}",
  "Bored already? ({count} attempt{s})",
  "Go touch grass instead: {count} redirect{s}",
  "Are we procrastinating? ({count} time{s})",
  "You have work to do. ({count} block{s})",
  "Nice try, human: {count} denial{s}",
  "Your attention span is leaking ({count})",
  "Don't let the algorithm win: {count} save{s}",
  "We talked about this... {count} time{s}",

  // --- SCI-FI / CYBERPUNK ---
  "Shields holding at {count}% capacity",
  "Firewall active. Threat level: {count}",
  "System integrity maintained ({count})",
  "Anomaly detected and removed: {count}",
  "Redirecting power to productivity ({count})",
  "Reality restored {count} time{s}",
  "Simulation glitch patched ({count})",
  "Timeline preserved: {count} paradox{es}",
  "Neural link severed {count} time{s}",
  "Upload canceled: {count} attempt{s}",

  // --- ODDLY SPECIFIC ---
  "Swapped junk food for brain food ({count})",
  "Saved you ~{count} minutes of your life",
  "Return to sender: {count} request{s}",
  "Self-control outsourced {count} time{s}",
  "Automated willpower: {count} use{s}",
  "Redirecting to better life choices ({count})",
  "Crisis averted. ({count} time{s})",
  "Nothing but net: {count} block{s}",
];

export function getRandomMessage(count: number): string {
  if (count === 0) {
    return `Used <span class="count-value">0</span> times`;
  }
  const template = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  const countHtml = `<span class="count-value">${count}</span>`;
  return template
    .replace("{count}", countHtml)
    .replace("{s}", count != 1 ? "s" : "")
    .replace("{es}", count != 1 ? "es" : "")
    .replace("{ies}", count != 1 ? "ies" : "y")
}
