// netlify/functions/pagarme-create-order.ts
import type { Handler } from "@netlify/functions";

type PaymentMethod = "pix" | "boleto" | "credit_card" | "debit_card";

type AddressInput = {
  line1?: string;
  line2?: string;
  zipCode?: string;
  city?: string;
  state?: string;
  country?: string;
};

type CustomerInput = {
  name: string;
  email: string;
  document?: string;
  type?: "individual" | "company";
  phone?: string;
  address?: AddressInput;
};

type ItemInput = {
  code?: string;
  description: string;
  amount: number; // centavos
  quantity?: number;
};

type ShippingInput = {
  amount: number; // centavos
  description?: string;
  recipientName?: string;
  recipientPhone?: string;
  address?: AddressInput;
};

type CardRawInput = {
  number: string;
  holderName: string;
  expMonth: number;
  expYear: number;
  cvv: string;
};

type CardPaymentInput = {
  installments?: number;
  statementDescriptor?: string;
  operationType?: "auth_and_capture" | "auth_only" | "pre_auth";
  recurrenceCycle?: "first" | "subsequent";
  recurrence?: boolean;
  cardId?: string;
  cardToken?: string;
  // SOMENTE se você for PCI ou estiver em ambiente de teste controlado:
  card?: CardRawInput;
  billingAddress?: AddressInput;
  authentication?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type PixInput = {
  expiresIn?: number;
  additionalInformation?: Array<{ name: string; value: string }>;
};

type BoletoInput = {
  bank?: string;
  instructions?: string;
  dueAt?: string; // ISO
  documentNumber?: string;
  type?: "DM" | "BDP";
  statementDescriptor?: string;
  interest?: {
    days: number;
    type: "flat" | "percentage";
    amount: number;
  };
  fine?: {
    days: number;
    type: "flat" | "percentage";
    amount: number;
  };
  metadata?: Record<string, unknown>;
};

type CreateOrderBody = {
  orderId?: string; // UUID interno do pedido local
  orderNumber?: string; // PED-000015
  paymentMethod: PaymentMethod;
  customer: CustomerInput;
  items: ItemInput[];
  shipping?: ShippingInput;
  metadata?: Record<string, unknown>;
  pix?: PixInput;
  boleto?: BoletoInput;
  creditCard?: CardPaymentInput;
  debitCard?: CardPaymentInput;
};

const defaultHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: defaultHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  try {
    const secretKey = process.env.PAGARME_SECRET_KEY;
    if (!secretKey) {
      return json(500, {
        ok: false,
        error: "PAGARME_SECRET_KEY não configurada",
      });
    }

    const body = safeJson<CreateOrderBody>(event.body);
    validateBaseBody(body);

    const payload = buildOrderPayload(body);

    const auth = Buffer.from(`${secretKey}:`).toString("base64");

    const pagarmeRes = await fetch("https://api.pagar.me/core/v5/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await pagarmeRes.json().catch(() => null);

    if (!pagarmeRes.ok) {
      return json(400, {
        ok: false,
        error: "Erro ao criar pedido na Pagar.me",
        pagarmeStatus: pagarmeRes.status,
        details: data,
        sentPayload: payload,
      });
    }

    const orderNumber = getLocalOrderNumber(body);

    return json(200, {
      ok: true,
      order: data,
      local_order_id: body.orderId || null,
      local_order_number: orderNumber || null,
      order_number: orderNumber || null,
      paymentMethod: body.paymentMethod,
      pix_expires_at:
        body.paymentMethod === "pix"
          ? payload?.metadata?.pix_expires_at || null
          : null,
    });
  } catch (error: any) {
    return json(500, {
      ok: false,
      error: error?.message || "Erro interno",
    });
  }
};

function buildOrderPayload(body: CreateOrderBody) {
  const customer = mapCustomer(body.customer);
  const items = body.items.map(mapItem);
  const shipping = body.shipping ? mapShipping(body.shipping) : undefined;

  const orderNumber = getLocalOrderNumber(body);

  const pixExpiresAt =
    body.paymentMethod === "pix"
      ? String(
          body.metadata?.pix_expires_at ||
            new Date(Date.now() + 10 * 60 * 1000).toISOString()
        )
      : undefined;

  const metadata = removeUndefined({
    ...(body.metadata || {}),
    ...(body.orderId ? { local_order_id: String(getLocalOrderNumber(body) || body.orderId) } : {}),
    ...(orderNumber
      ? {
          order_number: orderNumber,
          local_order_number: orderNumber,
        }
      : {}),
    ...(pixExpiresAt ? { pix_expires_at: pixExpiresAt } : {}),
  });

  const payment = buildPayment(body);

  return removeUndefined({
    // Na Pagar.me, o code deve ser o número amigável do pedido, não o UUID.
    code: orderNumber || body.orderId || undefined,
    customer,
    items,
    shipping,
    payments: [payment],
    metadata,
  });
}


function getLocalOrderNumber(body: CreateOrderBody) {
  return (
    body.orderNumber ||
    stringOrNull(body.metadata?.order_number) ||
    stringOrNull(body.metadata?.local_order_number) ||
    stringOrNull(body.metadata?.orderNumber) ||
    null
  );
}

function buildPayment(body: CreateOrderBody) {
  switch (body.paymentMethod) {
    case "pix":
      return buildPixPayment(body);
    case "boleto":
      return buildBoletoPayment(body);
    case "credit_card":
      return buildCreditCardPayment(body);
    case "debit_card":
      return buildDebitCardPayment(body);
    default:
      throw new Error("paymentMethod inválido");
  }
}

function buildPixPayment(body: CreateOrderBody) {
  return removeUndefined({
    payment_method: "pix",
    pix: {
      expires_in: body.pix?.expiresIn ?? 600,
      additional_information:
        body.pix?.additionalInformation ??
        (body.orderId
          ? [{ name: "Pedido", value: String(body.orderId) }]
          : undefined),
    },
  });
}

function buildBoletoPayment(body: CreateOrderBody) {
  const boleto = body.boleto || {};

  return removeUndefined({
    payment_method: "boleto",
    boleto: removeUndefined({
      bank: boleto.bank,
      instructions: boleto.instructions || "Pagar até o vencimento",
      due_at: boleto.dueAt,
      document_number: boleto.documentNumber || getLocalOrderNumber(body) || body.orderId,
      type: boleto.type || "DM",
      statement_descriptor: boleto.statementDescriptor,
      interest: boleto.interest,
      fine: boleto.fine,
      metadata: boleto.metadata,
    }),
  });
}

function buildCreditCardPayment(body: CreateOrderBody) {
  const c = body.creditCard;
  if (!c) throw new Error("creditCard é obrigatório para paymentMethod=credit_card");

  const billingAddress = c.billingAddress || body.customer.address;

  return removeUndefined({
    payment_method: "credit_card",
    credit_card: removeUndefined({
      installments: c.installments ?? 1,
      statement_descriptor: sanitizeStatementDescriptor(
        c.statementDescriptor || "CALEA"
      ),
      operation_type: c.operationType ?? "auth_and_capture",
      recurrence_cycle: c.recurrenceCycle,
      authentication: c.authentication,
      metadata: c.metadata,
      ...resolveCardSource(c, billingAddress),
    }),
  });
}

function buildDebitCardPayment(body: CreateOrderBody) {
  const d = body.debitCard;
  if (!d) throw new Error("debitCard é obrigatório para paymentMethod=debit_card");

  const billingAddress = d.billingAddress || body.customer.address;

  return removeUndefined({
    payment_method: "debit_card",
    debit_card: removeUndefined({
      installments: d.installments ?? 1,
      statement_descriptor: sanitizeStatementDescriptor(
        d.statementDescriptor || "CALEA"
      ),
      recurrence: d.recurrence ?? false,
      authentication: d.authentication,
      metadata: d.metadata,
      ...resolveCardSource(d, billingAddress),
    }),
  });
}

function resolveCardSource(input: CardPaymentInput, billingAddress?: AddressInput) {
  const hasCardId = !!input.cardId;
  const hasCardToken = !!input.cardToken;
  const hasRawCard = !!input.card;

  const count = [hasCardId, hasCardToken, hasRawCard].filter(Boolean).length;
  if (count !== 1) {
    throw new Error(
      "Envie exatamente uma fonte de cartão: cardId OU cardToken OU card"
    );
  }

  if (input.cardId) {
    return { card_id: input.cardId };
  }

  if (!billingAddress) {
    throw new Error("billingAddress é obrigatório para pagamento com cartão.");
  }

  if (input.cardToken) {
    return {
      card: removeUndefined({
        token: input.cardToken,
        billing_address: mapAddress(billingAddress),
      }),
    };
  }

  return {
    card: removeUndefined({
      number: onlyDigits(input.card!.number),
      holder_name: input.card!.holderName,
      exp_month: Number(input.card!.expMonth),
      exp_year: Number(input.card!.expYear),
      cvv: String(input.card!.cvv),
      billing_address: mapAddress(billingAddress),
    }),
  };
}

function mapCustomer(customer: CustomerInput) {
  const phoneDigits = onlyDigits(customer.phone || "");
  const areaCode = phoneDigits.length >= 10 ? phoneDigits.slice(0, 2) : undefined;
  const number = phoneDigits.length >= 10 ? phoneDigits.slice(2) : undefined;

  return removeUndefined({
    name: customer.name,
    email: customer.email,
    document: customer.document ? onlyDigits(customer.document) : undefined,
    type: customer.type || "individual",
    address: customer.address ? mapAddress(customer.address) : undefined,
    phones:
      areaCode && number
        ? {
            mobile_phone: {
              country_code: "55",
              area_code: areaCode,
              number,
            },
          }
        : undefined,
  });
}

function mapShipping(shipping: ShippingInput) {
  const phoneDigits = onlyDigits(shipping.recipientPhone || "");

  return removeUndefined({
    amount: Number(shipping.amount),
    description: shipping.description || "Frete",
    recipient_name: shipping.recipientName,
    recipient_phone: phoneDigits || undefined,
    address: shipping.address ? mapAddress(shipping.address) : undefined,
  });
}

function mapItem(item: ItemInput) {
  if (!item.description) throw new Error("Todo item precisa de description");
  if (!Number.isFinite(Number(item.amount))) {
    throw new Error(`amount inválido no item ${item.description}`);
  }

  return {
    code: item.code || slugify(item.description),
    description: item.description,
    amount: Number(item.amount),
    quantity: Number(item.quantity || 1),
  };
}

function mapAddress(address: AddressInput) {
  return removeUndefined({
    line_1: address.line1,
    line_2: address.line2,
    zip_code: onlyDigits(address.zipCode || ""),
    city: address.city,
    state: address.state,
    country: address.country || "BR",
  });
}

function validateBaseBody(body: CreateOrderBody) {
  if (!body) throw new Error("Body inválido");
  if (!body.paymentMethod) throw new Error("paymentMethod é obrigatório");
  if (!body.customer?.name) throw new Error("customer.name é obrigatório");
  if (!body.customer?.email) throw new Error("customer.email é obrigatório");
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new Error("items é obrigatório");
  }

  if (
    (body.paymentMethod === "credit_card" || body.paymentMethod === "debit_card") &&
    !body.customer.address
  ) {
    throw new Error(
      "customer.address é obrigatório para pagamento com cartão, pois será usado como billing_address."
    );
  }
}

function safeJson<T>(raw: string | null): T {
  if (!raw) throw new Error("Body vazio");
  return JSON.parse(raw) as T;
}

function onlyDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function stringOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function sanitizeStatementDescriptor(value: string) {
  return String(value || "CALEA")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .slice(0, 13)
    .toUpperCase();
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function removeUndefined<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = removeUndefined(value);
      if (Object.keys(nested).length === 0) continue;
      out[key] = nested;
      continue;
    }

    out[key] = value;
  }

  return out as T;
}

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body),
  };
}