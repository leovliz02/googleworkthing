import * as dotenv from 'dotenv';
import * as path from 'path';

// Ensure environment variables are loaded from .env.local / .env in standalone script runners
if (typeof process !== 'undefined' && process.cwd) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

import { Bot, InlineKeyboard } from 'grammy';
import { getShuttleArrivals, getAnnouncements } from './nextbus';
import { getClassTransit } from './nusmods';
import { ProcessedShuttle } from './types';

// Initialize Bot instance with token or placeholder for build/test
const token = process.env.TELEGRAM_BOT_TOKEN || 'placeholder_token_for_build';
export const bot = new Bot(token);

/**
 * Stop name dictionary for display
 */
const STOP_DISPLAY_NAMES: Record<string, string> = {
  UTOWN: 'University Town',
  COM3: 'COM 3',
  'KR-MRT': 'Kent Ridge MRT',
  CLB: 'Central Library / FASS',
  LT27: 'LT 27 / Science',
  EA: 'Engineering',
  BIZ2: 'BIZ 2',
};

/**
 * Format shuttle list into Telegram message
 */
export function formatShuttleMessage(stopCode: string, shuttles: ProcessedShuttle[]): string {
  const stopName = STOP_DISPLAY_NAMES[stopCode] || stopCode;
  let text = `🚏 *Live Bus Arrivals: ${stopName}* (\`${stopCode}\`)\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (!shuttles || shuttles.length === 0) {
    text += `🌙 _No shuttles currently operating for this stop._\n`;
    return text;
  }

  const activeShuttles = shuttles.filter((s) => s.eta !== 'Off Service');

  if (activeShuttles.length === 0) {
    text += `🌙 _All shuttle services are currently off-service at this stop._\n`;
    return text;
  }

  for (const shuttle of shuttles) {
    const badge =
      shuttle.urgency === 'green' ? '🟢' : shuttle.urgency === 'yellow' ? '🟡' : '🔴';

    const plate = shuttle.busPlate ? ` • \`[${shuttle.busPlate}]\`` : '';
    const next = shuttle.nextEta && shuttle.nextEta !== 'Off Service'
      ? ` _(Next: ${shuttle.nextEta})_`
      : '';
    const load = shuttle.passengers ? ` • _${shuttle.passengers}_` : '';

    text += `${badge} *${shuttle.name}* : ${shuttle.eta}${next}${plate}${load}\n`;
  }

  text += `\n_🟢 ≤3m | 🟡 4-8m | 🔴 >8m / Off-service_`;
  return text;
}

/**
 * Creates inline keyboard for popular bus stops
 */
export function createPopularStopsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🏛️ UTown', 'stop:UTOWN')
    .text('💻 COM 3', 'stop:COM3')
    .row()
    .text('🚇 Kent Ridge MRT', 'stop:KR-MRT')
    .text('📚 Central Library', 'stop:CLB')
    .row()
    .text('🔬 LT 27 (Science)', 'stop:LT27')
    .text('💼 BIZ 2', 'stop:BIZ2');
}

// -------------------------------------------------------------
// Command Handlers
// -------------------------------------------------------------

// /start: Welcome message with quick stop buttons
bot.command('start', async (ctx) => {
  const welcomeText =
    `🚍 *Welcome to NUS Campus Transit Bot!*\n\n` +
    `Your real-time guide to NUS internal shuttle buses and class commute planning.\n\n` +
    `*Available Commands:*\n` +
    `• \`/bus <stop>\` - View live arrivals for a bus stop\n` +
    `• \`/class <moduleCode>\` - View 1st lesson timetable & nearest bus timings\n` +
    `• \`/disruptions\` - Check active breakdowns & advisories\n\n` +
    `👇 *Tap a popular stop below for instant timings:*`;

  await ctx.reply(welcomeText, {
    parse_mode: 'Markdown',
    reply_markup: createPopularStopsKeyboard(),
  });
});

// /bus <stop>: Live shuttle timings
bot.command('bus', async (ctx) => {
  const query = (ctx.match || '').trim().toUpperCase();

  if (!query) {
    await ctx.reply(
      `ℹ️ *Please specify a bus stop code or name.*\n\n` +
        `Examples:\n` +
        `• \`/bus UTOWN\`\n` +
        `• \`/bus COM3\`\n` +
        `• \`/bus KR-MRT\`\n\n` +
        `Or choose a popular stop below:`,
      {
        parse_mode: 'Markdown',
        reply_markup: createPopularStopsKeyboard(),
      }
    );
    return;
  }

  try {
    const shuttles = await getShuttleArrivals(query);
    const message = formatShuttleMessage(query, shuttles);
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: createPopularStopsKeyboard(),
    });
  } catch (error) {
    console.error('Error in /bus command:', error);
    await ctx.reply('⚠️ Failed to fetch shuttle arrivals. Please try again shortly.');
  }
});

// /disruptions: Active vehicle breakdowns & advisories
bot.command('disruptions', async (ctx) => {
  try {
    const announcements = await getAnnouncements();

    if (!announcements || announcements.length === 0) {
      await ctx.reply(
        `✅ *All Clear!*\n\n` +
          `No active vehicle breakdowns or transit disruptions reported across NUS shuttle routes.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let message = `⚠️ *Active NUS Transit Advisories & Disruptions*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    announcements.forEach((item, index) => {
      message += `${index + 1}. ${item}\n\n`;
    });

    message += `_Please allocate extra travel time during service disruptions._`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /disruptions command:', error);
    await ctx.reply('⚠️ Failed to fetch transit disruptions. Please try again.');
  }
});

// /class <moduleCode>: Class timetable & nearest shuttle arrivals
bot.command('class', async (ctx) => {
  const moduleCode = (ctx.match || '').trim().toUpperCase();

  if (!moduleCode) {
    await ctx.reply(
      `ℹ️ *Please provide a module code.*\n\n` +
        `Example: \`/class CS2030S\` or \`/class IS1108\``,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  try {
    const info = await getClassTransit(moduleCode);

    if (!info) {
      await ctx.reply(
        `❌ Could not find timetable data for module *\`${moduleCode}\`*.\n` +
          `Please check that the module code is valid on NUSMods (e.g. \`CS2030S\`).`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const { lesson, mappedStop, shuttles, title } = info;

    let response = `📚 *Smart Commute: ${moduleCode}*\n`;
    response += `📖 *${title}*\n\n`;
    response += `📍 *Lesson:* ${lesson.lessonType} (${lesson.day} ${lesson.startTime} - ${lesson.endTime})\n`;
    response += `🏫 *Venue:* \`${lesson.venue}\`\n`;
    response += `🚏 *Nearest Bus Stop:* *${mappedStop.stopName}* (\`${mappedStop.stopCode}\`)\n`;
    response += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
    response += `*Live Shuttle Arrivals at ${mappedStop.stopName}:*\n`;

    if (!shuttles || shuttles.length === 0) {
      response += `🌙 _No shuttles currently running._\n`;
    } else {
      for (const shuttle of shuttles) {
        const badge =
          shuttle.urgency === 'green' ? '🟢' : shuttle.urgency === 'yellow' ? '🟡' : '🔴';
        const plate = shuttle.busPlate ? ` • \`[${shuttle.busPlate}]\`` : '';
        response += `${badge} *${shuttle.name}* : ${shuttle.eta}${plate}\n`;
      }
    }

    await ctx.reply(response, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text(
        `🔄 Refresh ${mappedStop.stopCode} Shuttles`,
        `stop:${mappedStop.stopCode}`
      ),
    });
  } catch (error) {
    console.error('Error in /class command:', error);
    await ctx.reply('⚠️ Failed to resolve class commute details. Please try again.');
  }
});

// Inline keyboard callback query handler
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith('stop:')) {
    const stopCode = data.replace('stop:', '').trim().toUpperCase();
    await ctx.answerCallbackQuery({ text: `Fetching arrivals for ${stopCode}...` });

    try {
      const shuttles = await getShuttleArrivals(stopCode);
      const message = formatShuttleMessage(stopCode, shuttles);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: createPopularStopsKeyboard(),
      });
    } catch {
      // If editing fails (e.g. message is identical or expired), reply with new message
      try {
        const shuttles = await getShuttleArrivals(stopCode);
        const message = formatShuttleMessage(stopCode, shuttles);
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: createPopularStopsKeyboard(),
        });
      } catch (err) {
        console.error('Callback error:', err);
      }
    }
  }
});

