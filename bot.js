// bot.js
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const { TELEGRAM_TOKEN, EXCHANGE_API_KEY, EXCHANGE_API_URL } = require('./config');

const bot = new Telegraf(TELEGRAM_TOKEN);

// Список доступних валют з прапорами
const availableCurrencies = {
  'USD': '🇺🇸', 'EUR': '🇪🇺', 'HUF': '🇭🇺', 'PLN': '🇵🇱', 'CZK': '🇨🇿', 
  'RON': '🇷🇴', 'GBP': '🇬🇧', 'UAH': '🇺🇦' // Додано гривню (UAH)
};

// Початкове вітання
bot.start((ctx) => {
    ctx.reply("Привіт! Я валютний конвертер. Введи суму та валюту для конвертації.");
});

// Обробка тексту для введення суми та валюти
bot.on('text', async (ctx) => {
    const message = ctx.message.text.split(' ');

    if (message.length === 2) {
        const amount = parseFloat(message[0]);
        const fromCurrency = message[1].toUpperCase();

        // Перевірка на правильність введеної валюти
        if (!availableCurrencies[fromCurrency]) {
            return ctx.reply(`Вибачте, я не підтримую валюту ${fromCurrency}. Введіть одну з наступних валют: ${Object.keys(availableCurrencies).join(', ')}`);
        }

        if (isNaN(amount)) {
            return ctx.reply("Будь ласка, введіть правильну суму!");
        }

        // Запит курсу валют
        try {
            const response = await axios.get(`${EXCHANGE_API_URL}${fromCurrency}`, {
                params: {
                    apiKey: EXCHANGE_API_KEY
                }
            });

            const rates = response.data.rates;
            const availableCurrenciesText = Object.keys(availableCurrencies)
                .filter(currency => rates[currency])
                .map(currency => `${availableCurrencies[currency]} ${currency}`).join('\n'); // Зробимо кожну валюту на окремому рядку з прапором

            ctx.reply(`Я можу конвертувати з ${availableCurrencies[fromCurrency]} ${fromCurrency} в наступні валюти: \n${availableCurrenciesText}. \nВиберіть валюту для конвертації:`, 
                Markup.inlineKeyboard(
                    Object.keys(availableCurrencies)
                        .filter(currency => rates[currency])
                        .map(currency => Markup.button.callback(`${availableCurrencies[currency]}`, `convert_${currency}`)), // Тільки прапори як текст кнопки
                    { columns: 4 } // Кількість стовпців для макету
                )
            );

            // Обробка вибору валюти
            bot.action(/^convert_/, async (ctx) => {
                const toCurrency = ctx.callbackQuery.data.split('_')[1];

                // Перевірка на правильність введеної валюти для конвертації
                if (!rates[toCurrency]) {
                    return ctx.reply(`На жаль, я не можу конвертувати в валюту ${toCurrency}. Спробуйте ще раз.`);
                }

                const convertedAmount = amount * rates[toCurrency];
                ctx.reply(`${amount} ${fromCurrency} = ${convertedAmount.toFixed(2)} ${toCurrency}`);
            });

        } catch (error) {
            console.error(error);
            ctx.reply("На жаль, сталася помилка при отриманні курсів валют.");
        }
    } else {
        ctx.reply("Будь ласка, введіть суму і валюту через пробіл. Наприклад: 100 USD.");
    }
});

// Запуск бота
bot.launch();
