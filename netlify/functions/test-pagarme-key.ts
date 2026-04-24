import type { Handler } from "@netlify/functions";

export const handler: Handler = async () => {
  const key = process.env.PAGARME_SECRET_KEY || "";

  return {
    statusCode: 200,
    body: JSON.stringify({
      hasKey: !!key,
      startsWith: key.slice(0, 7),
      length: key.length,
      endsWith: key.slice(-4),
    }),
  };
};