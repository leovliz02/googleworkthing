import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local first, then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || token === 'placeholder_token_for_build') {
    console.error('\n❌ [Telegram Bot Error]: TELEGRAM_BOT_TOKEN is not defined in environment variables.');
    console.error('👉 Please set TELEGRAM_BOT_TOKEN in .env.local or your environment:');
    console.error('   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz\n');
    process.exit(1);
  }

  // Dynamically import bot after env variables are guaranteed loaded
  const { bot } = await import('../lib/bot');

  console.log('🚀 Starting NUS Transit Telegram Bot in local long-polling mode...');

  // Graceful shutdown handling
  const stopHandler = async () => {
    console.log('\n🛑 Stopping Telegram Bot polling...');
    await bot.stop();
    process.exit(0);
  };

  process.once('SIGINT', stopHandler);
  process.once('SIGTERM', stopHandler);

  await bot.start({
    onStart: async (botInfo) => {
      console.log(`✅ Bot @${botInfo.username} (${botInfo.id}) is actively listening for messages!`);
      console.log('📌 Commands available: /start, /bus <stop>, /disruptions, /class <moduleCode>');
      try {
        await bot.api.setMyCommands([
          { command: 'start', description: 'Start bot & view quick-action stops' },
          { command: 'bus', description: 'Check live bus arrivals (e.g. /bus UTOWN)' },
          { command: 'class', description: 'Check class timetable & shuttles (e.g. /class CS2030S)' },
          { command: 'disruptions', description: 'View active transit disruptions' },
        ]);
        console.log('📋 Bot commands menu registered with Telegram!');
      } catch (err) {
        console.warn('Could not register command menu with Telegram:', err);
      }
    },
  });
}

main().catch((err) => {
  console.error('Fatal bot error:', err);
  process.exit(1);
});
