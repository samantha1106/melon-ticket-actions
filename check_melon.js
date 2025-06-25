const puppeteer = require('puppeteer');
const axios = require('axios');

(async () => {
  // 參數，請用環境變數或直接改這裡
  const performanceUrl = process.env.PERFORMANCE_URL;  // 演出頁面 URL
  const targetDate = process.env.TARGET_DATE;          // 格式例：'2025-06-27'
  const targetTime = process.env.TARGET_TIME;          // 格式例：'19:30'
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  const message = process.env.MESSAGE || 'Melon Ticket 有票啦！';

  if (!performanceUrl || !targetDate || !targetTime || !slackWebhookUrl) {
    console.error('請設定 PERFORMANCE_URL, TARGET_DATE, TARGET_TIME, SLACK_WEBHOOK_URL');
    process.exit(1);
  }

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto(performanceUrl, { waitUntil: 'networkidle2' });

    // 選擇日期（找按鈕或下拉）
    await page.waitForSelector('.performance_date_list button, .dateSelector'); // 依實際網頁調整

    // 找日期按鈕並點擊
    const dateButtons = await page.$$('.performance_date_list button, .dateSelector button');
    let dateFound = false;
    for (const btn of dateButtons) {
      const text = await page.evaluate(el => el.textContent.trim(), btn);
      if (text.includes(targetDate.replace(/^\d{4}-/, '').replace(/-/g, '.'))) {
        await btn.click();
        dateFound = true;
        break;
      }
    }
    if (!dateFound) {
      console.error('找不到目標日期按鈕');
      await browser.close();
      process.exit(1);
    }

    await page.waitForTimeout(1000); // 等頁面更新

    // 選擇時間（場次）
    const timeButtons = await page.$$('.schedule_list button, .timeSelector button');
    let timeFound = false;
    for (const btn of timeButtons) {
      const text = await page.evaluate(el => el.textContent.trim(), btn);
      if (text.includes(targetTime)) {
        await btn.click();
        timeFound = true;
        break;
      }
    }
    if (!timeFound) {
      console.error('找不到目標時間場次');
      await browser.close();
      process.exit(1);
    }

    await page.waitForTimeout(2000); // 等票務狀態更新

    // 檢查票狀態（舉例，實際看頁面結構調整）
    const ticketStatus = await page.evaluate(() => {
      const el = document.querySelector('.ticket_state, .ticket-status');
      if (!el) return null;
      return el.textContent.trim();
    });

    console.log('票務狀態:', ticketStatus);

    if (ticketStatus && !/매진|매진되었습니다|sold out/i.test(ticketStatus)) {
      // 有票
      await axios.post(slackWebhookUrl, {
        text: `${message} ${performanceUrl}`,
      });
      console.log('已發送 Slack 通知');
    } else {
      console.log('目前沒有票');
    }

  } catch (error) {
    console.error('執行錯誤:', error);
  } finally {
    await browser.close();
  }
})();
