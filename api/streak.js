export default async function handler(req, res) {
    const { user = "ZynzTehr", theme = "github-dark-blue", hide_border = "true" } = req.query;

    const token = process.env.PAT_1 || process.env.GITHUB_TOKEN || process.env.TOKEN || "";

    try {
        let stats;
        if (token) {
            try {
                stats = await getStatsViaGraphQL(user, token);
            } catch (err) {
                console.warn("GraphQL failed, falling back to public calendar:", err.message);
                stats = await getStatsViaPublicCalendar(user);
            }
        } else {
            stats = await getStatsViaPublicCalendar(user);
        }

        const svg = renderStreakSvg(stats, { hideBorder: hide_border === "true" });

        res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=14400, s-maxage=14400, stale-while-revalidate=86400");
        return res.status(200).send(svg);
    } catch (error) {
        console.error("Streak calculation error:", error);
        const fallbackSvg = renderFallbackSvg(user, error.message);
        res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=60");
        return res.status(200).send(fallbackSvg);
    }
}

async function getStatsViaGraphQL(username, token) {
    const headers = {
        "Content-Type": "application/json",
        "User-Agent": "ZynzTehr-Streak-Service",
        "Authorization": `bearer ${token}`
    };

    // 1. Get user account creation date
    const userQuery = `
        query($login: String!) {
            user(login: $login) {
                createdAt
            }
        }
    `;

    const userRes = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers,
        body: JSON.stringify({ query: userQuery, variables: { login: username } })
    });
    const userData = await userRes.json();

    if (!userData.data || !userData.data.user) {
        throw new Error(userData.errors ? userData.errors[0].message : "User not found");
    }

    const createdYear = new Date(userData.data.user.createdAt).getFullYear();
    const currentYear = new Date().getFullYear();

    // 2. Fetch all years
    let multiYearQuery = "query($login: String!) { user(login: $login) {";
    for (let yr = createdYear; yr <= currentYear; yr++) {
        const from = `${yr}-01-01T00:00:00Z`;
        const to = `${yr}-12-31T23:59:59Z`;
        multiYearQuery += `
            year_${yr}: contributionsCollection(from: "${from}", to: "${to}") {
                contributionCalendar {
                    totalContributions
                    weeks {
                        contributionDays {
                            contributionCount
                            date
                        }
                    }
                }
            }
        `;
    }
    multiYearQuery += "} }";

    const calendarRes = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers,
        body: JSON.stringify({ query: multiYearQuery, variables: { login: username } })
    });
    const calendarData = await calendarRes.json();

    if (!calendarData.data || !calendarData.data.user) {
        throw new Error(calendarData.errors ? calendarData.errors[0].message : "Calendar fetch failed");
    }

    const daysMap = new Map();
    let totalContributions = 0;
    const userObj = calendarData.data.user;

    for (let yr = createdYear; yr <= currentYear; yr++) {
        const yearCol = userObj[`year_${yr}`];
        if (yearCol && yearCol.contributionCalendar) {
            totalContributions += yearCol.contributionCalendar.totalContributions;
            for (const week of yearCol.contributionCalendar.weeks) {
                for (const day of week.contributionDays) {
                    daysMap.set(day.date, day.contributionCount);
                }
            }
        }
    }

    return calculateStreaksFromMap(daysMap, totalContributions);
}

async function getStatsViaPublicCalendar(username) {
    const res = await fetch(`https://github.com/users/${username}/contributions`, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)"
        }
    });
    const html = await res.text();

    const totalMatch = html.match(/([0-9,]+)\s*contributions\s*in the last year/i);
    const totalContributions = totalMatch ? parseInt(totalMatch[1].replace(/,/g, "")) : 0;

    const dayRegex = /data-date="([0-9]{4}-[0-9]{2}-[0-9]{2})"[^>]*>[\s\S]*?<tool-tip[^>]*>(No|[0-9]+)/g;
    let match;
    const daysMap = new Map();
    while ((match = dayRegex.exec(html)) !== null) {
        const date = match[1];
        const count = match[2] === "No" ? 0 : parseInt(match[2]);
        daysMap.set(date, count);
    }

    return calculateStreaksFromMap(daysMap, totalContributions);
}

function calculateStreaksFromMap(daysMap, totalContributions) {
    const sortedDates = Array.from(daysMap.keys()).sort();

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let currentStreak = 0;
    let currentStreakStart = null;
    let currentStreakEnd = null;

    let longestStreak = 0;
    let longestStreakStart = null;
    let longestStreakEnd = null;

    let tempStreak = 0;
    let tempStart = null;

    for (let i = 0; i < sortedDates.length; i++) {
        const date = sortedDates[i];
        const count = daysMap.get(date) || 0;

        if (count > 0) {
            if (tempStreak === 0) tempStart = date;
            tempStreak++;
            if (tempStreak > longestStreak) {
                longestStreak = tempStreak;
                longestStreakStart = tempStart;
                longestStreakEnd = date;
            }
        } else {
            tempStreak = 0;
            tempStart = null;
        }
    }

    // Determine current active streak ending today or yesterday
    let checkDateIndex = sortedDates.indexOf(todayStr);
    if (checkDateIndex === -1 || (daysMap.get(todayStr) || 0) === 0) {
        checkDateIndex = sortedDates.indexOf(yesterdayStr);
    }

    if (checkDateIndex !== -1 && (daysMap.get(sortedDates[checkDateIndex]) || 0) > 0) {
        currentStreakEnd = sortedDates[checkDateIndex];
        let idx = checkDateIndex;
        while (idx >= 0 && (daysMap.get(sortedDates[idx]) || 0) > 0) {
            currentStreak++;
            currentStreakStart = sortedDates[idx];
            idx--;
        }
    }

    const firstDate = sortedDates[0];
    const totalRange = firstDate ? `${formatDateShort(firstDate)} - Present` : "2024 - Present";

    return {
        totalContributions,
        totalRange,
        currentStreak,
        currentStreakRange: currentStreak > 0 ? `${formatDateShort(currentStreakStart)} - ${formatDateShort(currentStreakEnd)}` : "No streak active",
        longestStreak,
        longestStreakRange: longestStreak > 0 ? `${formatDateShort(longestStreakStart)} - ${formatDateShort(longestStreakEnd)}` : "No streak record"
    };
}

function formatDateShort(dateStr) {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[date.getUTCMonth()]} ${date.getUTCDate()}${date.getUTCFullYear() !== new Date().getFullYear() ? `, ${date.getUTCFullYear()}` : ""}`;
}

function renderStreakSvg(stats, options = {}) {
    const { hideBorder = true } = options;
    const borderAttr = hideBorder ? "stroke-opacity='0'" : "stroke='rgba(255, 255, 255, 0.1)' stroke-width='1'";

    return `<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'
        style='isolation: isolate' viewBox='0 0 495 195' width='495px' height='195px' direction='ltr'>
        <style>
            @keyframes flameGlow {
                0%, 100% {
                    filter: drop-shadow(0 0 5px rgba(0, 242, 254, 0.6)) drop-shadow(0 0 12px rgba(10, 102, 194, 0.6));
                    transform: scale(1);
                }
                50% {
                    filter: drop-shadow(0 0 10px rgba(0, 242, 254, 0.6)) drop-shadow(0 0 18px rgba(0, 242, 254, 0.6));
                    transform: scale(1.12);
                }
            }
            .fire-inner {
                transform-origin: 12.5px 14px;
                animation: flameGlow 2.5s infinite ease-in-out;
            }
            .stat-num {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                font-weight: 800;
                font-size: 28px;
                fill: #ffffff;
            }
            .stat-label {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                font-weight: 700;
                font-size: 14px;
                letter-spacing: 0.5px;
                fill: #00f2fe;
            }
            .stat-date {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                font-weight: 400;
                font-size: 11px;
                fill: #8b949e;
            }
        </style>
        <defs>
            <linearGradient id='bgGradient' x1='0%' y1='0%' x2='100%' y2='100%'>
                <stop offset='0%' stop-color='#0d1117'/>
                <stop offset='100%' stop-color='#161b22'/>
            </linearGradient>
            <linearGradient id='accentGrad' x1='0%' y1='0%' x2='100%' y2='0%'>
                <stop offset='0%' stop-color='#0A66C2'/>
                <stop offset='100%' stop-color='#00f2fe'/>
            </linearGradient>
            <linearGradient id='fireGradient' x1='0%' y1='100%' x2='0%' y2='0%'>
                <stop offset='0%' stop-color='#0A66C2'>
                    <animate attributeName='stop-color' values='#0A66C2;#00f2fe;#7950f2;#0A66C2' dur='4s' repeatCount='indefinite'/>
                </stop>
                <stop offset='60%' stop-color='#00f2fe'>
                    <animate attributeName='stop-color' values='#00f2fe;#7950f2;#00f2fe;#00f2fe' dur='4s' repeatCount='indefinite'/>
                </stop>
                <stop offset='100%' stop-color='#ffffff'>
                    <animate attributeName='stop-color' values='#ffffff;#00f2fe;#ffffff;#ffffff' dur='4s' repeatCount='indefinite'/>
                </stop>
            </linearGradient>
            <clipPath id='outer_rect'>
                <rect width='495' height='195' rx='10'/>
            </clipPath>
        </defs>

        <g clip-path='url(#outer_rect)'>
            <rect width='495' height='195' fill='url(#bgGradient)' ${borderAttr} rx='10'/>

            <!-- Column Dividers -->
            <line x1='165' y1='28' x2='165' y2='167' stroke='rgba(255, 255, 255, 0.08)' stroke-width='1'/>
            <line x1='330' y1='28' x2='330' y2='167' stroke='rgba(255, 255, 255, 0.08)' stroke-width='1'/>

            <!-- Center: Current Streak (Flame Above Text) -->
            <g text-anchor='middle'>
                <!-- Flame Icon centered at x=235, y=16 -->
                <g transform='translate(235, 16)'>
                    <g class='fire-inner'>
                        <path d='M10.5 0C10.5 0 11.5 4.5 9 7.5C6.5 10.5 2 11.5 2 17.5C2 23.3 6.7 28 12.5 28C18.3 28 23 23.3 23 17.5C23 10.5 17 6.5 15.5 1.5C15 5 12.5 7.5 11 8.5C11 5 10.5 0 10.5 0ZM12.5 14C14.5 14 16.5 16 16.5 18.5C16.5 21 14.5 23 12.5 23C10.5 23 8.5 21 8.5 18.5C8.5 16.5 10.5 15 12.5 14Z' fill='url(#fireGradient)'/>
                    </g>
                </g>
                <text x='247.5' y='78' class='stat-label'>Current Streak</text>
                <text x='247.5' y='120' class='stat-num' fill='url(#accentGrad)'>${stats.currentStreak} <tspan font-size='16' font-weight='500' fill='#8b949e'>days</tspan></text>
                <text x='247.5' y='154' class='stat-date'>${stats.currentStreakRange}</text>
            </g>

            <!-- Left: Total Contributions -->
            <g text-anchor='middle'>
                <text x='82.5' y='50' class='stat-label'>Total Contributions</text>
                <text x='82.5' y='102' class='stat-num'>${stats.totalContributions.toLocaleString()}</text>
                <text x='82.5' y='142' class='stat-date'>${stats.totalRange}</text>
            </g>

            <!-- Right: Longest Streak -->
            <g text-anchor='middle'>
                <text x='412.5' y='50' class='stat-label'>Longest Streak</text>
                <text x='412.5' y='102' class='stat-num'>${stats.longestStreak} <tspan font-size='16' font-weight='500' fill='#8b949e'>days</tspan></text>
                <text x='412.5' y='142' class='stat-date'>${stats.longestStreakRange}</text>
            </g>
        </g>
    </svg>`;
}

function renderFallbackSvg(user, message) {
    return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 495 195' width='495px' height='195px'>
        <rect width='495' height='195' fill='#0d1117' rx='10'/>
        <text x='247.5' y='85' fill='#00f2fe' font-family='sans-serif' font-size='16' font-weight='bold' text-anchor='middle'>${user}'s GitHub Streak</text>
        <text x='247.5' y='120' fill='#8b949e' font-family='sans-serif' font-size='13' text-anchor='middle'>Contributions Syncing...</text>
    </svg>`;
}
