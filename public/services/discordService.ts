interface DiscordEmbed {
    title?: string;
    description?: string;
    color?: number;
    fields?: { name: string; value: string; inline?: boolean }[];
    footer?: { text: string };
    timestamp?: string;
}

interface DiscordWebhookPayload {
    content?: string;
    embeds?: DiscordEmbed[];
}

export const sendDiscordWebhook = async (webhookUrl: string, payload: DiscordWebhookPayload): Promise<Response> => {
    if (!webhookUrl) {
        throw new Error("Discord webhook URL is not configured.");
    }

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Discord webhook error:", errorText);
        throw new Error(`Failed to send to Discord: ${response.status} ${response.statusText}`);
    }

    return response;
};
