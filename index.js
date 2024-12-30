require('dotenv').config();
const Binance = require('node-binance-api');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// إعداد Binance API
const binance = new Binance().options({
  APIKEY: process.env.BINANCE_API_KEY,
  APISECRET: process.env.BINANCE_API_SECRET,
});

// إعداد Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// رسالة ترحيب عند بدء البوت
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🤖 مرحبًا بك في بوت التداول الذكي! استخدم /analyze لتحليل السوق أو /trade للتداول.");
});

// تحليل السوق باستخدام OpenAI
bot.onText(/\/analyze/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const prices = await binance.prices(); // جلب أسعار العملات
    const btcPrice = prices.BTCUSDT; // مثال: سعر البيتكوين مقابل الدولار
    const ethPrice = prices.ETHUSDT; // مثال: سعر الإيثريوم مقابل الدولار

    const prompt = `
      سعر البيتكوين حاليًا ${btcPrice} دولار وسعر الإيثريوم ${ethPrice} دولار.
      قم بتحليل السوق وأخبرني إذا كان يجب شراء أو بيع.
    `;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{ role: 'system', content: prompt }],
    }, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });

    const analysis = response.data.choices[0].message.content;
    bot.sendMessage(chatId, `📊 تحليل السوق:\n${analysis}`);
  } catch (error) {
    bot.sendMessage(chatId, `❌ حدث خطأ أثناء تحليل السوق: ${error.message}`);
  }
});

// تنفيذ صفقة بناءً على توصية
bot.onText(/\/trade (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const [symbol, quantity] = match[1].split(" ");

  if (!symbol || !quantity) {
    return bot.sendMessage(chatId, "❌ صيغة غير صحيحة. الرجاء المحاولة باستخدام: `/trade BTCUSDT 0.01`", {
      parse_mode: "Markdown",
    });
  }

  try {
    const order = await binance.marketBuy(symbol.toUpperCase(), parseFloat(quantity));
    bot.sendMessage(chatId, `✅ تم تنفيذ صفقة شراء:\n\n${JSON.stringify(order, null, 2)}`);
  } catch (error) {
    bot.sendMessage(chatId, `❌ خطأ أثناء تنفيذ الصفقة: ${error.message}`);
  }
});

// تشغيل الخادم
app.get('/', (req, res) => {
  res.send('🤖 خادم التداول الذكي يعمل الآن!');
});

app.listen(port, () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${port}`);
});
