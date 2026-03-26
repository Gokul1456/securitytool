const axios = require("axios");

async function dispatchWebhook({ title, message, type, metadata = {} }) {
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  const discordUrl = process.env.DISCORD_WEBHOOK_URL;

  const payload = {
    text: `*${title}*\n${message}`,
    attachments: [
      {
        color: type === "security" ? "#ff0000" : "#36a64f",
        fields: Object.entries(metadata).map(([key, value]) => ({
          title: key,
          value: String(value),
          short: true
        }))
      }
    ]
  };

  const promises = [];

  if (slackUrl) {
    promises.push(axios.post(slackUrl, payload).catch(err => console.error("Slack webhook failed", err.message)));
  }

  if (discordUrl) {
    // Discord accepts Slack-compatible webhooks if you append /slack to the Webhook URL
    // but a standard Discord webhook format is also fine
    const discordPayload = {
      content: `**${title}**\n${message}`,
      embeds: [
        {
          color: type === "security" ? 16711680 : 3581519,
          fields: Object.entries(metadata).map(([key, value]) => ({
            name: key,
            value: String(value),
            inline: true
          }))
        }
      ]
    };
    promises.push(axios.post(discordUrl, discordPayload).catch(err => console.error("Discord webhook failed", err.message)));
  }

  await Promise.allSettled(promises);
}

module.exports = { dispatchWebhook };
