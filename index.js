"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const axios = require("axios");
const qs = require("querystring");

(async () => {
    // 從 GitHub Actions inputs 取得參數
    const [productId, scheduleId, seatId, discordWebhookUrl] = [
        "product-id",
        "schedule-id",
        "seat-id",
        "discord-webhook-url",
    ].map((name) => {
        const value = core.getInput(name);
        if (!value) {
            throw new Error(`melon-ticket-actions: Please set ${name} input parameter`);
        }
        return value;
    });

    const message = core.getInput("message") || "Melon Ticket available!";

    // 呼叫 Melon API 取得票務狀態
    const res = await axios({
        method: "POST",
        url: "https://ticket.melon.com/tktapi/product/seatStateInfo.json",
        params: {
            v: "1",
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

        // 發送 Discord Webhook
        try {
            await axios.post(discordWebhookUrl, {
                content: `${message} ${link}`,
            });
            console.log("Discord notification sent.");
        } catch (error) {
            console.error("Failed to send Discord notification:", error);
        }
    }
})().catch((e) => {
    console.error(e.stack);
    core.setFailed(e.message);
});
