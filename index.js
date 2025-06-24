"use strict";
const axios = require("axios");
const qs = require("querystring");

(async () => {
  const productId = process.env.PRODUCT_ID;
  const scheduleId = process.env.SCHEDULE_ID;
  const seatId = process.env.SEAT_ID;
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK;
  const message = "Melon Ticket available!";

  if (!productId || !scheduleId || !seatId || !discordWebhookUrl) {
    throw new Error("請確認所有必要環境變數都有設定");
  }

  const res = await axios({
    method: "POST",
    url: "https://ticket.melon.com/tktapi/product/seatStateInfo.json",
    params: { v: "1" },
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
      await axios.post(discordWebhookUrl, {
        content: `${message} ${link}`,
      });
      console.log("Discord notification sent.");
    } catch (error) {
      console.error("Failed to send Discord notification:", error);
    }
  } else {
    console.log("No tickets available currently.");
  }
})();
