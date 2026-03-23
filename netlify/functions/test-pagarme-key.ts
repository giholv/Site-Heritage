// netlify/functions/test-pagarme-key.ts
export default async () => {
  try {
    const key = process.env.PAGARME_SECRET_KEY;

    return new Response(
      JSON.stringify({
        ok: true,
        hasKey: !!key,
        prefix: key ? key.slice(0, 8) : null,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error?.message || "Erro interno",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};