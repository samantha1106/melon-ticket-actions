"use strict";
const axios = require("axios");
const qs = require("querystring");

(async () => {
  // 從環境變數讀取輸入參數，GitHub Actions 會將 with: 參數自動轉成 INPUT_XXX
  const productId = process.env.INPUT_PRODUCT_ID;
  const scheduleId = process.env.INPUT_SCHEDULE_ID;
  const seatId = process.env.INPUT_SEAT_ID;
  const slackWebhookUrl = process.env.INPUT_SLACK_INCOMING_WEBHOOK_URL;
  const message = process.env.INPUT_MESSAGE || "Melon Ticket available!";

  if (!productId || !scheduleId || !seatId || !slackWebhookUrl) {
    throw new Error("請確認所有必要環境變數都有設定 (product-id, schedule-id, seat-id, slack-incoming-webhook-url)");
  }

  const res = await axios({
    method: "POST",
    url: "https://ticket.melon.com/tktapi/product/seatStateInfo.json",
    params: { v: "1" },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: qs.stringify({
      prodId: productId,
      scheduleNo: scheduleId,
      seatId,
      volume: 1,
      selectedGradeVolume: 1,
    }),
  });

  console.log("Got response: ", res.data);

  if (res.data.chkResult) {
    const link = `http://ticket.melon.com/performance/index.htm?${qs.stringify({
      prodId: productId,
    })}`;

    try {
      await axios.post(slackWebhookUrl, {
        text: `${message} ${link}`,
      });
      console.log("Slack notification sent.");
    } catch (error) {
      console.error("Failed to send Slack notification:", error);
    }
  } else {
    console.log("No tickets available currently.");
  }
})();
