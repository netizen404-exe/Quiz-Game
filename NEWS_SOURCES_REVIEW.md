# Automated news sources

The scheduled Cloudflare Worker is configured with six RSS/Atom feeds. It has not been deployed. The collector sends only each feed item's title and short description to Groq; generated questions stay unpublished until an editor checks the facts, source, and attribution. The selected sources combine public-sector announcements with two editorial publications whose reuse terms allow adaptation.

| Source | Coverage | Feed | Reuse and limits |
| --- | --- | --- | --- |
| New Zealand Government (Beehive) | New Zealand politics, policy, and social issues | `https://www.beehive.govt.nz/rss.xml` | Crown material may be reproduced accurately with source acknowledgment. Treat each item as the Government's own account, not independent reporting. Exclude third-party items and images. |
| UK Government (GOV.UK) | UK policy, government, public services, society, and occasional technology news | `https://www.gov.uk/search/news-and-communications.atom` | Most GOV.UK material is reusable under the Open Government Licence. Attribute it and exclude items the page identifies as outside OGL. |
| European Commission | EU policy, including digital, climate, economic, and social policy | `https://commission.europa.eu/node/2/rss_en` | EU-owned content is generally reusable under CC BY 4.0 with attribution and no implication of Commission endorsement. Exclude items with third-party rights notices. |
| Council of the European Union | EU politics, foreign affairs, social policy, and official meetings | `https://www.consilium.europa.eu/en/rss/pressreleases.ashx` | The Council permits credited reuse when meaning is preserved and changes are indicated. Exclude third-party material or specific restrictions. |
| Global Voices | International social issues, digital rights, online activism, elections, and technology | `https://globalvoices.org/feed/?cat=-28` | Global Voices says its original written content is CC BY 3.0, allowing adaptations including commercial use with attribution, a link to the license, and an indication of changes. The feed requires a byline; the quiz citation carries the author and license. Do not reuse photos, video, audio, or other third-party material. |
| Horizon, the EU Research and Innovation magazine | Technology, science, and society; especially research and innovation connected to EU-funded projects | `https://projects.research-and-innovation.ec.europa.eu/horizon-magazine/ict/articles.xml` | Horizon's official republishing terms say its articles are CC BY 4.0 and require the journalist's byline, a link to the original, and the footer wording shown in the quiz citation. The feed requires a byline. Its reporting is by independent journalists, while coverage focuses on EU-funded research. |

## Source links and reuse policies

- [Global Voices RSS directory](https://globalvoices.org/feeds/) lists its site and topic feeds and welcomes embedding them. Its [republishing policy](https://globalvoices.org/about/global-voices-attribution-policy/) sets the CC BY 3.0 attribution requirements.
- [Horizon republishing policy and feed directory](https://projects.research-and-innovation.ec.europa.eu/en/horizon-magazine/republish-our-stories) confirms the articles are CC BY 4.0, gives the required credit wording, and links topic-specific RSS feeds.
- Public-sector reuse details: [Beehive copyright](https://www.beehive.govt.nz/copyright), [Open Government Licence](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/), [European Commission reuse notice](https://commission.europa.eu/legal-notice_en), and [Council reuse policy](https://www.consilium.europa.eu/en/about-site/legal-notice/).

## Limits and editorial rules

These feeds improve the mix but do not provide fully balanced or exhaustive coverage. The first four are official institutional sources; Horizon's focus is EU research; Global Voices adds a community-centered international perspective. I did not add an independent New Zealand newsroom because I could not verify reuse terms that permit adapting its reporting for generated quiz questions. Editors should add independent corroboration before treating contested claims as settled, and seek permission or an explicitly open-licensed NZ newsroom as the next source addition.

- Suggestions stay unpublished until a human checks the story, publication date, answer, explanation, source link, author credit, and applicable license.
- Exclude items that identify a third-party copyright holder or carry restrictions outside the source's reuse policy.
- Show the publisher and author, link to the original story and license, and identify quiz questions as adaptations where the source requires it.
- Do not imply a source endorses the quiz or an AI-generated question.
- Recheck source terms if the project becomes commercial or the collection/AI workflow changes.
