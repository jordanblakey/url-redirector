// 1. Define Categories
export type DistractionCategory = 'social' | 'video' | 'news' | 'gaming' | 'shopping';
export type ProductiveCategory =
    | 'learning'        // Courses, languages
    | 'reading'         // Long-form, blogs, books
    | 'culture'         // History, art, random facts
    | 'creative'        // Design, DIY, making
    | 'health'          // Mindfulness, fitness
    | 'tools'           // Productivity apps
    | 'citizen_science' // Helping research
    | 'cognitive'       // Brain games, logic
    | 'tech';           // Coding, dev, indie web

interface SiteData {
    url: string;
    category: DistractionCategory | ProductiveCategory;
}

// 2. Define the Mapping Strategy (The "Antidote" Logic)
const categoryMap: Record<DistractionCategory, ProductiveCategory[]> = {
    // Scroll loop -> Deep reading, perspective, or helping science
    'social': ['reading', 'culture', 'citizen_science', 'health'],
    // Passive watching -> Active learning, making, or brain training
    'video': ['learning', 'creative', 'cognitive', 'tech'],
    // Outrage cycle -> History/Art (perspective), Mindfulness (calm)
    'news': ['culture', 'health', 'reading'],
    // Dopamine hits -> Skill building, coding, complex puzzles
    'gaming': ['tech', 'creative', 'cognitive', 'learning'],
    // Consumption -> Creation, Life Admin
    'shopping': ['creative', 'tools', 'health']
};

// 3. Distracting Sites (The Triggers)
export const distractingSites: SiteData[] = [
    { url: "facebook.com", category: "social" },
    { url: "twitter.com", category: "social" },
    { url: "instagram.com", category: "social" },
    { url: "tiktok.com", category: "social" },
    { url: "reddit.com", category: "social" },
    { url: "pinterest.com", category: "social" },
    { url: "linkedin.com", category: "social" },
    { url: "tumblr.com", category: "social" },
    { url: "snapchat.com", category: "social" },
    { url: "quora.com", category: "social" },
    { url: "youtube.com", category: "video" },
    { url: "netflix.com", category: "video" },
    { url: "twitch.tv", category: "video" },
    { url: "hulu.com", category: "video" },
    { url: "disneyplus.com", category: "video" },
    { url: "buzzfeed.com", category: "news" },
    { url: "dailymail.co.uk", category: "news" },
    { url: "cnn.com", category: "news" },
    { url: "foxnews.com", category: "news" },
    { url: "tmz.com", category: "news" }
];

// 4. Productive Sites (The Antidotes)
const rawProductiveSites: SiteData[] = [
    // --- EDUCATIONAL & LEARNING ---
    { url: "duolingo.com", category: "learning" },
    { url: "khanacademy.org", category: "learning" },
    { url: "coursera.org", category: "learning" },
    { url: "codecademy.com", category: "learning" },
    { url: "ted.com", category: "learning" },
    { url: "investopedia.com", category: "learning" },
    { url: "wtamu.edu/~cbaird/sq/", category: "learning" },
    { url: "human-anatomy.com", category: "learning" },
    { url: "freecodecamp.org", category: "learning" },
    { url: "edx.org", category: "learning" },
    { url: "futurelearn.com", category: "learning" },
    { url: "open.edu/openlearn", category: "learning" },
    { url: "classcentral.com", category: "learning" },
    { url: "brilliant.org", category: "learning" },

    // --- DEEP READING ---
    { url: "wikipedia.org/wiki/Special:Random", category: "reading" },
    { url: "medium.com", category: "reading" },
    { url: "gutenberg.org", category: "reading" },
    { url: "themarginalian.org", category: "reading" },
    { url: "aeon.co", category: "reading" },
    { url: "nautil.us", category: "reading" },
    { url: "aldaily.com", category: "reading" },
    { url: "longreads.com", category: "reading" },
    { url: "farnamstreetblog.com", category: "reading" },
    { url: "waitbutwhy.com", category: "reading" },
    { url: "jstor.org/open", category: "reading" },

    // --- CULTURE & CURIOSITY ---
    { url: "atlasobscura.com/random", category: "culture" },
    { url: "random.country", category: "culture" },
    { url: "earth.google.com", category: "culture" },
    { url: "nasa.gov/image-of-the-day", category: "culture" },
    { url: "history.com/this-day-in-history", category: "culture" },
    { url: "snopes.com/random", category: "culture" },
    { url: "explainxkcd.com", category: "culture" },
    { url: "archive.org/details/random", category: "culture" },
    { url: "geoguessr.com", category: "culture" },
    { url: "smithsonianmag.com", category: "culture" },
    { url: "nationalgeographic.com", category: "culture" },
    { url: "britishmuseum.org/collection", category: "culture" },
    { url: "metmuseum.org/art/collection", category: "culture" },
    { url: "moma.org/collection", category: "culture" },
    { url: "loc.gov", category: "culture" },
    { url: "europeana.eu", category: "culture" },
    { url: "openculture.com", category: "culture" },
    { url: "messynessychic.com", category: "culture" },
    { url: "poetryfoundation.org", category: "culture" },
    { url: "lithub.com", category: "culture" },
    { url: "publicdomainreview.org", category: "culture" },

    // --- CREATIVE & SKILLS ---
    { url: "behance.net", category: "creative" },
    { url: "instructables.com", category: "creative" },
    { url: "wikihow.com/Special:Randomizer", category: "creative" },
    { url: "dribbble.com", category: "creative" },
    { url: "hackaday.com", category: "creative" },
    { url: "maker.pro", category: "creative" },
    { url: "drawabox.com", category: "creative" },
    { url: "skillshare.com", category: "creative" },

    // --- MINDFULNESS & HEALTH ---
    { url: "calm.com", category: "health" },
    { url: "headspace.com", category: "health" },
    { url: "zenhabits.net", category: "health" },
    { url: "musclewiki.com", category: "health" },
    { url: "artofmanliness.com/random", category: "health" },
    { url: "darebee.com", category: "health" },
    { url: "tinybuddha.com", category: "health" },
    { url: "sleepfoundation.org", category: "health" },
    { url: "nutritionfacts.org", category: "health" },
    { url: "wakingup.com", category: "health" },

    // --- PRACTICAL TOOLS ---
    { url: "notion.so", category: "tools" },
    { url: "trello.com", category: "tools" },
    { url: "typingclub.com", category: "tools" },
    { url: "keybr.com", category: "tools" },
    { url: "mint.com", category: "tools" },
    { url: "ynab.com", category: "tools" },
    { url: "todoist.com", category: "tools" },
    { url: "wolframalpha.com", category: "tools" },
    { url: "archive.today", category: "tools" },
    { url: "10minutemail.com", category: "tools" },

    // --- CITIZEN SCIENCE ---
    { url: "zooniverse.org", category: "citizen_science" },
    { url: "scistarter.org", category: "citizen_science" },
    { url: "ebird.org", category: "citizen_science" },
    { url: "inaturalist.org", category: "citizen_science" },
    { url: "fold.it", category: "citizen_science" },
    { url: "wikipedia.org/wiki/Wikipedia:Community_portal", category: "citizen_science" },
    { url: "librivox.org", category: "citizen_science" },
    { url: "standardebooks.org", category: "citizen_science" },
    { url: "openstreetmap.org", category: "citizen_science" },

    // --- TECH & INDIE WEB ---
    { url: "stackoverflow.com", category: "tech" },
    { url: "news.ycombinator.com", category: "tech" },
    { url: "lobste.rs", category: "tech" },
    { url: "dev.to", category: "tech" },
    { url: "smashingmagazine.com", category: "tech" },
    { url: "css-tricks.com", category: "tech" },
    { url: "alistapart.com", category: "tech" },
    { url: "indiehackers.com", category: "tech" },
    { url: "producthunt.com", category: "tech" },
    { url: "github.com/explore", category: "tech" },
    { url: "quantamagazine.org", category: "tech" }, // Science/Tech crossover

    // --- COGNITIVE & LOGIC ---
    { url: "lumosity.com", category: "cognitive" },
    { url: "chess.com", category: "cognitive" },
    { url: "lichess.org", category: "cognitive" },
    { url: "sudoku.com", category: "cognitive" },
    { url: "nytimes.com/crosswords", category: "cognitive" },
    { url: "codewars.com", category: "cognitive" }, // Coding logic
    { url: "leetcode.com", category: "cognitive" },
    { url: "projecteuler.net", category: "cognitive" },
];

// Remove duplicates based on URL
export const productiveSites = rawProductiveSites.filter((site, index, self) =>
    index === self.findIndex((s) => s.url === site.url)
);

// 5. The Smart Selector Function
export function getThematicPair(): { source: string, target: string } {
    // A. Pick a random distraction
    const sourceSite = distractingSites[Math.floor(Math.random() * distractingSites.length)];

    // B. Find approved antidote categories
    const targetCategories = categoryMap[sourceSite.category as DistractionCategory];

    // C. Filter productive sites to match those categories
    const matchingTargets = productiveSites.filter(site =>
        targetCategories.includes(site.category as ProductiveCategory)
    );

    // D. Pick random target from matches (fallback to full list if empty)
    const candidates = matchingTargets.length > 0 ? matchingTargets : productiveSites;
    const targetSite = candidates[Math.floor(Math.random() * candidates.length)];

    return {
        source: sourceSite.url,
        target: targetSite.url
    };
}