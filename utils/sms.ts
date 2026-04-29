// Utility to send SMS via Any Flexible Android Gateway Provider

// simple agnostic provider interface
interface sms_provider {
  url: string;
  token: string;
}

// constants for endpoints and tokens
const gateways: sms_provider[] = [
  {
    url: process.env.PRIMARY_SMS_GATEWAY_URL || "",
    token: process.env.PRIMARY_SMS_GATEWAY_TOKEN || "",
  },
  {
    url: process.env.SECONDARY_SMS_GATEWAY_URL || "",
    token: process.env.SECONDARY_SMS_GATEWAY_TOKEN || "",
  },
];

export async function sendSms(to: string, message: string): Promise<boolean> {
  if (!to) return false;

  // loop through available generic gateways
  for (const gateway of gateways) {
    if (!gateway.url) continue;

    try {
      // fetch response with a post method
      const response = await fetch(gateway.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: gateway.token, // Traccar SMS Gateway directly parses the token without "Bearer"
        },
        body: JSON.stringify({ to, message }),
      });

      console.log(
        `[SMS Gateway Debug] POST to ${gateway.url} returned status: ${response.status}`,
      );

      if (response.ok) {
        return true;
      } else {
        console.error(
          `[SMS Gateway Error] Failed to send to ${gateway.url}: HTTP ${response.status}`,
        );
        const text = await response.text();
        console.error(`[SMS Gateway Body] ${text}`);
      }
    } catch (error) {
      // safely ignore and fallback to next
      console.error("gateway error:", error);
    }
  }

  return false;
}
