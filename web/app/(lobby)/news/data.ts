import {
  Zap, Trophy, Wrench, Megaphone, Sparkles,
} from "lucide-react";

export type NewsCategory = "all" | "update" | "event" | "patch" | "announcement";

export interface NewsItem {
  id: string;
  slug: string;
  category: Exclude<NewsCategory, "all">;
  title: string;
  description: string;
  time: string;
  date: string;
  color: string;
  icon: typeof Zap;
  featured?: boolean;
  author: string;
  body: string[];
}

export const TABS: { key: NewsCategory; label: string }[] = [
  { key: "all", label: "All News" },
  { key: "update", label: "Updates" },
  { key: "event", label: "Events" },
  { key: "patch", label: "Patches" },
  { key: "announcement", label: "Announcements" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  update: "UPDATE",
  event: "EVENT",
  patch: "PATCH",
  announcement: "ANNOUNCEMENT",
};

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: "1", slug: "season-5-desert-storm-now-live", category: "update", title: "Season 5: Desert Storm Now Live!",
    description: "Experience the new Desert Oasis map, exclusive cosmetics, and battle pass rewards. Join the adventure today!",
    time: "2h ago", date: "March 18, 2026", color: "#E3B448", icon: Zap, featured: true,
    author: "GameMaster Zara",
    body: [
      "We are thrilled to announce that Season 5: Desert Storm is now officially live! This massive update brings the highly anticipated Desert Oasis map, featuring expansive dunes, ancient ruins, and strategic trade routes that will completely change how you approach settlement building.",
      'The new battle pass includes over 100 exclusive rewards, including legendary avatar skins, unique settlement themes, and rare resource boosters. Players who reach tier 50 will unlock the exclusive "Desert Emperor" title and golden hexagon borders.',
      "New mechanics have been introduced including sandstorms that affect resource generation, oasis trading posts with special bonuses, and caravan routes that provide alternative trading options. The meta is about to shift dramatically!",
      'All players who log in during the first week will receive a special "Early Explorer" badge and 500 bonus gold. Don\'t miss out on this incredible season!',
    ],
  },
  {
    id: "2", slug: "weekend-tournament-double-xp", category: "event", title: "Weekend Tournament: Double XP",
    description: "Compete in ranked matches this weekend to earn double XP and exclusive tournament medals. Top 100 players win premium rewards!",
    time: "1d ago", date: "March 17, 2026", color: "#FF6B35", icon: Trophy, featured: true,
    author: "Tournament Admin",
    body: [
      "This weekend brings our biggest XP event yet! All ranked matches will award double experience points from Friday 6PM to Sunday midnight UTC.",
      "The top 100 players on the leaderboard at the end of the event will receive exclusive tournament medals and premium reward packages worth over 5,000 gold each.",
      "New this time: team matches also count! Grab your friends and climb the ranks together for bonus multipliers.",
    ],
  },
  {
    id: "3", slug: "balance-update-march-2026", category: "patch", title: "Balance Update: March 2026",
    description: "Resource generation rates adjusted, new trading mechanics, and bug fixes. Full patch notes available in-game.",
    time: "3d ago", date: "March 15, 2026", color: "#2A4A7F", icon: Wrench,
    author: "Dev Team",
    body: [
      "This patch focuses on balancing resource generation across all map types. Forest tiles now produce slightly less wood, while mountain tiles have increased ore output.",
      "Trading mechanics have been reworked: port trades are now more favorable at 2:1 ratios, and inter-player trades can include development cards.",
      "Bug fixes include the road placement glitch on coastal tiles and the incorrect victory point calculation when using the Harbormaster expansion.",
    ],
  },
  {
    id: "4", slug: "new-guild-system-coming-soon", category: "announcement", title: "New Guild System Coming Soon",
    description: "Enhanced guild features including guild wars, shared vaults, and exclusive guild cosmetics launching next month!",
    time: "4d ago", date: "March 14, 2026", color: "#A04028", icon: Megaphone,
    author: "Community Team",
    body: [
      "We're excited to preview the upcoming Guild System! Guilds will support up to 50 members with dedicated chat channels, shared resource vaults, and weekly guild challenges.",
      "Guild Wars will pit guilds against each other in best-of-5 tournament brackets. Winners earn exclusive guild banners and cosmetic upgrades for all members.",
      "The guild system is currently in closed beta and will launch publicly in April 2026.",
    ],
  },
  {
    id: "5", slug: "spring-festival-limited-skins", category: "event", title: "Spring Festival: Limited Skins",
    description: "Celebrate spring with exclusive limited-edition avatar skins and color schemes. Available until March 31st!",
    time: "6d ago", date: "March 12, 2026", color: "#C850C0", icon: Sparkles,
    author: "Events Team",
    body: [
      "The Spring Festival brings 12 new limited-edition avatar skins inspired by blooming landscapes and vibrant colors.",
      "Complete daily spring challenges to earn festival tokens, redeemable for exclusive color schemes and settlement decorations.",
      "All festival items will be permanently removed from the shop on March 31st — collect them while you can!",
    ],
  },
  {
    id: "6", slug: "ranked-season-4-results", category: "update", title: "Ranked Season 4 Results",
    description: "Congratulations to all competitors! Season 4 rewards have been distributed. Check your inventory for exclusive items.",
    time: "1w ago", date: "March 11, 2026", color: "#E3B448", icon: Zap,
    author: "GameMaster Zara",
    body: [
      "Season 4 has officially concluded! Over 50,000 players competed across all ranks, making it our most active season yet.",
      "Rewards have been distributed based on your final rank. Check your inventory for tier-specific borders, badges, and gold bonuses.",
      "The top 10 players will be featured on the permanent Hall of Fame leaderboard in the next update.",
    ],
  },
  {
    id: "7", slug: "community-spotlight-top-builders", category: "announcement", title: "Community Spotlight: Top Builders",
    description: "This month we celebrate our most creative players who built incredible settlements. Vote for your favorite!",
    time: "1w ago", date: "March 10, 2026", color: "#2D5A27", icon: Megaphone,
    author: "Community Team",
    body: [
      "Every month we highlight the most creative settlement builders in our community. This month's nominees have truly outdone themselves!",
      "Head to the Community Hub to view screenshots of each submission and cast your vote. Voting closes on March 20th.",
      "The winner receives 2,000 gold, an exclusive 'Master Builder' title, and their settlement design featured as a loading screen!",
    ],
  },
];
