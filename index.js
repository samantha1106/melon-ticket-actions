"use strict";
const axios = require("axios");
const qs = require("querystring");

(async () => {
  const productId = process.env.PRODUCT_ID;
  const scheduleId = process.env.SCHEDULE_ID;
  const seatId = process.env.SEAT_ID;
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  const message = process.env.MESSAGE || "Melon Ticket available!";

  if (!productId || !scheduleId || !seatId || !slackWebhookUrl) {
    throw new Error("請確認所有必要環境變數都有設定 (PRODUCT_ID, SCHEDULE_ID, SEAT_ID, SLACK_WEBHOOK_URL)");
  }

  try {
    const res = await axios({
      method: "POST",
      url: "https://ticket.melon.com/tktapi/product/seatStateInfo.json",
      params: { v: "1" },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'ko,en-US;q=0.9,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Referer': `https://ticket.melon.com/performance/index.htm?prodId=${productId}`,
        'Origin': 'https://ticket.melon.com',
        'X-Requested-With': 'XMLHttpRequest',
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

      await axios.post(slackWebhookUrl, {
        text: `${message} ${link}`,
      });
      console.log("Slack notification sent.");
    } else {
      console.log("No tickets available currently.");
    }
  } catch (error) {
    console.error("Melon Ticket API 請求失敗：", error?.response?.status, error?.response?.data);
    process.exit(1);
  }
})();
