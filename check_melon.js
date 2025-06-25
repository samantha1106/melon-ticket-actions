// check_melon.js
"use strict";
const puppeteer = require("puppeteer");
const axios = require("axios");

(async () => {
  // 從環境變數讀取參數
  const performanceUrl = process.env.PERFORMANCE_URL;
  const targetDate = process.env.TARGET_DATE;    // 格式：'2025-06-27'
  const targetTime = process.env.TARGET_TIME;    // 格式：'19:30'
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  const message = process.env.MESSAGE || "Melon Ticket 有票啦！";

  if (!performanceUrl || !targetDate || !targetTime || !slackWebhookUrl) {
    console.error("請設定 PERFORMANCE_URL, TARGET_DATE, TARGET_TIME, SLACK_WEBHOOK_URL");
    process.exit(1);
  }

  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();

  try {
    await page.goto(performanceUrl, { waitUntil: "networkidle2" });

    // 選擇日期
    // 找出所有日期按鈕（依實際網站調整 selector）
    await page.waitForSelector("#cal_wrapper button");
    const dateButtons = await page.$$("#cal_wrapper button");
    let dateFound = false;

    for (const btn of dateButtons) {
      const dateStr = await page.evaluate(el => el.getAttribute("data-current"), btn);
      if (dateStr === targetDate.replace(/-/g, "")) { // 比對格式如 '20250627'
        await btn.click();
        dateFound = true;
        break;
      }
    }

    if (!dateFound) {
      console.error("找不到目標日期按鈕");
      await browser.close();
      process.exit(1);
    }

    await page.waitForTimeout(1000);

    // 選擇時間場次
    await page.waitForSelector("#list_time > li > button > span");
    const timeButtons = await page.$$("#list_time > li > button > span");
    let timeFound = false;

    for (const btn of timeButtons) {
      const timeText = await page.evaluate(el => el.textContent.trim(), btn);
      if (timeText === targetTime) {
        // 點擊時間按鈕的父節點 button
        const button = await btn.evaluateHandle(el => el.parentElement);
        await button.click();
        timeFound = true;
        break;
      }
    }

    if (!timeFound) {
      console.error("找不到目標時間場次");
      await browser.close();
      process.exit(1);
    }

    await page.waitForTimeout(2000);

    // 點擊「取得票券」按鈕 (按鈕上文字可能不同，依實際頁面調整 selector)
    const getTicketsBtnSelector = "#ticketing_process_box > div > div.btn_ticketing_type > div > div.box_btn > button";
    await page.waitForSelector(getTicketsBtnSelector);
    await page.click(getTicketsBtnSelector);

    // 等待新跳出視窗 popup
    const pages = await browser.pages();
    let popupPage;

    // 等待最多 10 秒找出新分頁
    for (let i = 0; i < 20; i++) {
      if (pages.length > 1) {
        popupPage = pages[pages.length - 1];
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (!popupPage) {
      console.error("找不到座位狀況視窗");
      await browser.close();
      process.exit(1);
    }

    // 切換到 popupPage
    await popupPage.bringToFront();
    await popupPage.waitForSelector("rect");

    // 取得所有 rect 的顏色
    const seatColors = await popupPage.$$eval("rect", rects =>
      rects.map(r => {
        const style = window.getComputedStyle(r);
        return style.fill || style.fillOpacity || r.getAttribute("fill") || null;
      })
    );

    // 判斷是否有非透明座位 (非 rgba(0,0,0,0) 或非透明)
    const hasAvailableSeat = seatColors.some(color => {
      if (!color) return false;
      // 這裡判斷顏色非透明 (你可以根據網站實際顏色調整條件)
      if (color === "rgba(0, 0, 0, 0)" || color === "transparent" || color === "none") return false;
      return true;
    });

    if (hasAvailableSeat) {
      console.log("有可購買的座位！");
      await axios.post(slackWebhookUrl, {
        text: `${message} ${performanceUrl}`
      });
      console.log("Slack 通知已發送");
    } else {
      console.log("目前沒有可購買的座位");
    }

  } catch (error) {
    console.error("執行錯誤:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
