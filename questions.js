/* Preview questions. Production questions should enter through the reviewed publishing queue. */
window.QUIZ_QUESTIONS = [
  {
    id: "wsr-2026-internet", category: "TECH + SOCIETY", story: "The global digital divide",
    prompt: "The UN’s 2026 World Social Report says how many people lacked internet connectivity in 2025?",
    context: "The report looks at how digital, economic, and energy transitions are changing who can take part in society.",
    options: ["About 2.2 billion", "About 220 million", "About 22 million", "About 5.5 billion"], correct: 0,
    explanation: "The report estimates that 2.2 billion people lacked internet connectivity in 2025. Access, affordability, and digital skills all shape who benefits from new technology.",
    source: "UN World Social Report 2026", sourceUrl: "https://www.un.org/sustainabledevelopment/blog/2026/10/world-social-report-2026-press-release/", date: "15 OCT 2026"
  },
  {
    id: "wsr-2026-informal-work", category: "WORK + SOCIETY", story: "The shape of global work",
    prompt: "What share of workers worldwide were informally employed in 2025, according to the UN report?",
    context: "Informal work often means work without the protections or benefits associated with formal employment.",
    options: ["18%", "38%", "58%", "78%"], correct: 2,
    explanation: "The report says 58% of workers worldwide were informally employed in 2025, a reminder that economic change affects people very differently.",
    source: "UN World Social Report 2026", sourceUrl: "https://www.un.org/sustainabledevelopment/blog/2026/10/world-social-report-2026-press-release/", date: "15 OCT 2026"
  },
  {
    id: "wsr-2026-young-women", category: "WORK + SOCIETY", story: "Young women and opportunity",
    prompt: "The UN report estimates what share of young women aged 15–24 were not employed or in education or training in 2025?",
    context: "The category is often shortened to NEET: not in employment, education, or training.",
    options: ["7%", "17%", "27%", "47%"], correct: 2,
    explanation: "The report estimates 27%. It uses the figure to illustrate how access to jobs, learning, and support remains uneven.",
    source: "UN World Social Report 2026", sourceUrl: "https://www.un.org/sustainabledevelopment/blog/2026/10/world-social-report-2026-press-release/", date: "15 OCT 2026"
  },
  {
    id: "anthropic-nonprofits-plugin", category: "TECH + CIVIC LIFE", story: "AI support for nonprofits",
    prompt: "Anthropic said its new Claude for Nonprofits plugin was developed with how many nonprofit organizations?",
    context: "The company announced the plugin while also filing to sell shares to the public.",
    options: ["3", "30", "300", "3,000"], correct: 1,
    explanation: "The Associated Press reports that Anthropic created the plugin with 30 nonprofits to better fit their needs.",
    source: "Associated Press", sourceUrl: "https://apnews.com/article/anthropic-claude-nonprofits-ai-e4db0d624495c8224187b3227939dd27", date: "26 OCT 2026"
  },
  {
    id: "anthropic-consultants", category: "TECH + CIVIC LIFE", story: "AI support for nonprofits",
    prompt: "What new kind of help did Anthropic say it would make available to nonprofits with smaller, shorter-term projects?",
    context: "The expansion is part of the company’s support program for nonprofit organizations.",
    options: ["Consultants", "A new stock exchange", "Free data centers", "A grant-writing competition"], correct: 0,
    explanation: "Anthropic said it would make consultants available to nonprofits for smaller, shorter-term projects, alongside its Claude for Nonprofits tools.",
    source: "Associated Press", sourceUrl: "https://apnews.com/article/anthropic-claude-nonprofits-ai-e4db0d624495c8224187b3227939dd27", date: "26 OCT 2026"
  },
  {
    id: "anthropic-nonprofit-users", category: "TECH + CIVIC LIFE", story: "AI support for nonprofits",
    prompt: "About how many nonprofits were already using Claude for Nonprofits, according to the AP report?",
    context: "The story included examples of small organizations using the tool in their day-to-day work.",
    options: ["250", "2,500", "25,000", "250,000"], correct: 2,
    explanation: "The AP report said 25,000 nonprofits were using Claude for Nonprofits at the time of publication.",
    source: "Associated Press", sourceUrl: "https://apnews.com/article/anthropic-claude-nonprofits-ai-e4db0d624495c8224187b3227939dd27", date: "26 OCT 2026"
  },
  {
    id: "anthropic-public-benefit-fund", category: "TECH + CIVIC LIFE", story: "AI support for nonprofits",
    prompt: "Anthropic said it planned to commit what share of its stock to a proposed public benefit fund?",
    context: "The fund could support nonprofits and people adversely affected by AI, but still needed shareholder approval after an IPO.",
    options: ["0.5%", "5%", "15%", "50%"], correct: 1,
    explanation: "The company announced plans to commit 5% of its shares to the proposed fund. The AP noted that shareholders would still need to approve it after the IPO.",
    source: "Associated Press", sourceUrl: "https://apnews.com/article/anthropic-claude-nonprofits-ai-e4db0d624495c8224187b3227939dd27", date: "26 OCT 2026"
  },
  {
    id: "anthropic-foodbank", category: "TECH + CIVIC LIFE", story: "AI support for nonprofits",
    prompt: "Which nonprofit did the AP story describe using Claude to improve food pickup and delivery scheduling?",
    context: "The organization serves a county north of Houston, Texas.",
    options: ["Montgomery County Food Bank", "The Ford Foundation", "Allies Against Slavery", "Taproot Foundation"], correct: 0,
    explanation: "Montgomery County Food Bank said it used Claude to improve food pickup and delivery scheduling and to stay in touch with donors.",
    source: "Associated Press", sourceUrl: "https://apnews.com/article/anthropic-claude-nonprofits-ai-e4db0d624495c8224187b3227939dd27", date: "26 OCT 2026"
  },
  {
    id: "anthropic-pbc", category: "TECH + CIVIC LIFE", story: "AI support for nonprofits",
    prompt: "Anthropic describes itself as what kind of company, with a stated commitment to balance commercial interests and public good?",
    context: "That corporate structure is one part of the company’s public explanation of its mission.",
    options: ["A public benefit corporation", "A government agency", "A charitable trust", "A worker-owned cooperative"], correct: 0,
    explanation: "Anthropic is a public benefit corporation. The AP story also notes that critics question how reliably this structure holds companies accountable to the public interest.",
    source: "Associated Press", sourceUrl: "https://apnews.com/article/anthropic-claude-nonprofits-ai-e4db0d624495c8224187b3227939dd27", date: "26 OCT 2026"
  },
  {
    id: "wsr-2026-inequality", category: "WORK + SOCIETY", story: "Inequality across countries",
    prompt: "Between 2000 and 2024, how many countries experienced rising income inequality, according to the UN report?",
    context: "The report’s count includes countries at different income levels.",
    options: ["More than 10", "More than 25", "More than 50", "More than 150"], correct: 2,
    explanation: "More than 50 countries saw rising income inequality between 2000 and 2024, including 23 high-income countries.",
    source: "UN World Social Report 2026", sourceUrl: "https://www.un.org/sustainabledevelopment/blog/2026/10/world-social-report-2026-press-release/", date: "15 OCT 2026"
  }
];
