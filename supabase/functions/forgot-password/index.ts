import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type Payload = {
  customer_id?: string | null;
  address_id?: string | null;
  order_id?: string | null;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    document?: string;
  };
  address?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string;
    state?: string;
  };
  checkout?: {
    coupon?: string | null;
    shipping_price?: number;
    gift_wrap?: boolean;
    gift_wrap_price?: number;
  };
  items?: Array<{
    sku_id?: string | null;
    skuId?: string | null;
    id?: string | null;
    qty?: number;
    quantity?: number;
    price?: number;
  }>;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function onlyDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());
}

function isValidCPF(cpf: string) {
  const c = onlyDigits(cpf);

  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;

  const calc = (base: string, factor: number) => {
    let total = 0;
    for (let i = 0; i < base.length; i++) {
      total += Number(base[i]) * (factor - i);
    }
    const mod = (total * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calc(c.slice(0, 9), 10);
  const d2 = calc(c.slice(0, 10), 11);

  return d1 === Number(c[9]) && d2 === Number(c[10]);
}

function toCents(value: number | string | null | undefined) {
  return Math.round(Number(value ?? 0) * 100);
}

function getItemQty(item: NonNullable<Payload["items"]>[number]) {
  return Number(item?.qty ?? item?.quantity ?? 1);
}

function getItemPrice(item: NonNullable<Payload["items"]>[number]) {
  return Number(item?.price ?? 0);
}

function getItemSkuId(item: NonNullable<Payload["items"]>[number]) {
  return item?.sku_id ?? item?.skuId ?? item?.id ?? null;
}

function getAllowedOrigin(req: Request) {
  const requestOrigin = req.headers.get("origin");
  const allowedOrigins = (Deno.env.get("CHECKOUT_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (!requestOrigin) return true;
  if (allowedOrigins.length === 0) return true;

  return allowedOrigins.includes(requestOrigin);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(
      {
        ok: false,
        code: "METHOD_NOT_ALLOWED",
        message: "Método não permitido.",
      },
      405
    );
  }

  try {
    if (!getAllowedOrigin(req)) {
      return json(
        {
          ok: false,
          code: "ORIGIN_NOT_ALLOWED",
          message: "Origem não permitida.",
        },
        403
      );
    }

    const body = (await req.json().catch(() => null)) as Payload | null;

    if (!body) {
      return json(
        {
          ok: false,
          code: "INVALID_BODY",
          message: "Body inválido.",
        },
        400
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json(
        {
          ok: false,
          code: "ENV_MISSING",
          message: "Variáveis de ambiente obrigatórias não configuradas.",
        },
        500
      );
    }

    const adminDb = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const rawName = String(body.customer?.name ?? "").trim();
    const rawEmail = String(body.customer?.email ?? "").trim().toLowerCase();
    const rawPhone = onlyDigits(body.customer?.phone);
    const rawDocument = onlyDigits(body.customer?.document);

    const rawCep = onlyDigits(body.address?.cep);
    const rawStreet = String(body.address?.street ?? "").trim();
    const rawNumber = String(body.address?.number ?? "").trim();
    const rawComplement = String(body.address?.complement ?? "").trim() || null;
    const rawNeighborhood =
      String(body.address?.neighborhood ?? "").trim() || null;
    const rawCity = String(body.address?.city ?? "").trim();
    const rawState = String(body.address?.state ?? "")
      .trim()
      .toUpperCase();

    const items = Array.isArray(body.items) ? body.items : [];

    if (!rawName) {
      return json(
        {
          ok: false,
          code: "NAME_REQUIRED",
          message: "Nome obrigatório.",
        },
        400
      );
    }

    if (!rawEmail) {
      return json(
        {
          ok: false,
          code: "EMAIL_REQUIRED",
          message: "E-mail obrigatório.",
        },
        400
      );
    }

    if (!isEmail(rawEmail)) {
      return json(
        {
          ok: false,
          code: "EMAIL_INVALID",
          message: "E-mail inválido.",
        },
        400
      );
    }

    if (rawPhone.length < 10) {
      return json(
        {
          ok: false,
          code: "PHONE_INVALID",
          message: "Telefone inválido.",
        },
        400
      );
    }

    if (!isValidCPF(rawDocument)) {
      return json(
        {
          ok: false,
          code: "CPF_INVALID",
          message: "CPF inválido.",
        },
        400
      );
    }

    if (rawCep.length !== 8) {
      return json(
        {
          ok: false,
          code: "CEP_INVALID",
          message: "CEP inválido.",
        },
        400
      );
    }

    if (!rawStreet) {
      return json(
        {
          ok: false,
          code: "STREET_REQUIRED",
          message: "Rua obrigatória.",
        },
        400
      );
    }

    if (!rawNumber) {
      return json(
        {
          ok: false,
          code: "NUMBER_REQUIRED",
          message: "Número obrigatório.",
        },
        400
      );
    }

    if (!rawCity) {
      return json(
        {
          ok: false,
          code: "CITY_REQUIRED",
          message: "Cidade obrigatória.",
        },
        400
      );
    }

    if (rawState.length !== 2) {
      return json(
        {
          ok: false,
          code: "STATE_INVALID",
          message: "UF inválida.",
        },
        400
      );
    }

    if (!items.length) {
      return json(
        {
          ok: false,
          code: "ITEMS_REQUIRED",
          message: "Carrinho vazio.",
        },
        400
      );
    }

    const normalizedItems = items.map((item) => ({
      sku_id: getItemSkuId(item),
      quantity: getItemQty(item),
      unit_price_cents: toCents(getItemPrice(item)),
    }));

    if (normalizedItems.some((item) => !item.sku_id)) {
      return json(
        {
          ok: false,
          code: "SKU_ID_REQUIRED",
          message: "Um ou mais itens não possuem sku_id válido.",
        },
        400
      );
    }

    if (normalizedItems.some((item) => item.quantity <= 0)) {
      return json(
        {
          ok: false,
          code: "ITEM_QTY_INVALID",
          message: "Quantidade inválida em um ou mais itens.",
        },
        400
      );
    }

    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();

      if (token) {
        const { data: userData } = await authClient.auth.getUser(token);
        userId = userData.user?.id ?? null;
      }
    }

    const now = new Date().toISOString();

    let customerId = body.customer_id ?? null;
    let addressId = body.address_id ?? null;
    let orderId = body.order_id ?? null;

    // CUSTOMER
    const customerPayload = {
      user_id: userId,
      email: rawEmail,
      full_name: rawName,
      phone: rawPhone,
      document: rawDocument,
      updated_at: now,
    };

    if (customerId) {
      const { data, error } = await adminDb
        .from("customers")
        .update(customerPayload)
        .eq("id", customerId)
        .select("id")
        .single();

      if (error) throw error;
      customerId = data.id;
    } else {
      let existingCustomerId: string | null = null;

      if (userId) {
        const { data, error } = await adminDb
          .from("customers")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;
        existingCustomerId = data?.id ?? null;
      }

      if (!existingCustomerId) {
        const { data, error } = await adminDb
          .from("customers")
          .select("id")
          .eq("email", rawEmail)
          .eq("document", rawDocument)
          .maybeSingle();

        if (error) throw error;
        existingCustomerId = data?.id ?? null;
      }

      if (existingCustomerId) {
        customerId = existingCustomerId;

        const { data, error } = await adminDb
          .from("customers")
          .update(customerPayload)
          .eq("id", customerId)
          .select("id")
          .single();

        if (error) throw error;
        customerId = data.id;
      } else {
        const { data, error } = await adminDb
          .from("customers")
          .insert({
            ...customerPayload,
            created_at: now,
          })
          .select("id")
          .single();

        if (error) throw error;
        customerId = data.id;
      }
    }

    if (!customerId) {
      return json(
        {
          ok: false,
          code: "CUSTOMER_SAVE_FAILED",
          message: "Não foi possível salvar o cliente.",
        },
        500
      );
    }

    // ADDRESS
    const addressPayload = {
      customer_id: customerId,
      label: "Entrega",
      recipient_name: rawName,
      phone: rawPhone,
      cep: rawCep,
      street: rawStreet,
      number: rawNumber,
      complement: rawComplement,
      neighborhood: rawNeighborhood,
      city: rawCity,
      state: rawState,
      country: "BR",
      is_default: true,
      updated_at: now,
    };

    if (addressId) {
      const { data, error } = await adminDb
        .from("addresses")
        .update(addressPayload)
        .eq("id", addressId)
        .select("id")
        .single();

      if (error) throw error;
      addressId = data.id;
    } else {
      const { data, error } = await adminDb
        .from("addresses")
        .insert({
          ...addressPayload,
          created_at: now,
        })
        .select("id")
        .single();

      if (error) throw error;
      addressId = data.id;
    }

    if (!addressId) {
      return json(
        {
          ok: false,
          code: "ADDRESS_SAVE_FAILED",
          message: "Não foi possível salvar o endereço.",
        },
        500
      );
    }

    // ORDER
    const subtotalCents = normalizedItems.reduce((acc, item) => {
      return acc + item.unit_price_cents * item.quantity;
    }, 0);

    const shippingCents = toCents(body.checkout?.shipping_price ?? 0);
    const giftWrapCents = body.checkout?.gift_wrap
      ? toCents(body.checkout?.gift_wrap_price ?? 0)
      : 0;
    const totalCents = subtotalCents + shippingCents + giftWrapCents;

    const orderPayload = {
      customer_id: customerId,
      shipping_address_id: addressId,
      status: "draft",
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      gift_wrap_cents: giftWrapCents,
      total_cents: totalCents,
      coupon_code: String(body.checkout?.coupon ?? "").trim() || null,
      discount_cents: 0,
      updated_at: now,
    };

    if (orderId) {
      const { data, error } = await adminDb
        .from("orders")
        .update(orderPayload)
        .eq("id", orderId)
        .select("id")
        .single();

      if (error) throw error;
      orderId = data.id;
    } else {
      const { data, error } = await adminDb
        .from("orders")
        .insert({
          ...orderPayload,
          created_at: now,
        })
        .select("id")
        .single();

      if (error) throw error;
      orderId = data.id;
    }

    if (!orderId) {
      return json(
        {
          ok: false,
          code: "ORDER_SAVE_FAILED",
          message: "Não foi possível salvar o pedido.",
        },
        500
      );
    }

    // ORDER ITEMS
    const { error: deleteItemsError } = await adminDb
      .from("order_items")
      .delete()
      .eq("order_id", orderId);

    if (deleteItemsError) throw deleteItemsError;

    const orderItemsPayload = normalizedItems.map((item) => ({
      order_id: orderId,
      sku_id: item.sku_id,
      unit_price_cents: item.unit_price_cents,
      quantity: item.quantity,
    }));

    const { error: insertItemsError } = await adminDb
      .from("order_items")
      .insert(orderItemsPayload);

    if (insertItemsError) throw insertItemsError;

    return json({
      ok: true,
      code: "CHECKOUT_SAVED",
      message: "Checkout salvo com sucesso.",
      data: {
        customer_id: customerId,
        address_id: addressId,
        order_id: orderId,
        subtotal_cents: subtotalCents,
        shipping_cents: shippingCents,
        gift_wrap_cents: giftWrapCents,
        total_cents: totalCents,
      },
    });
  } catch (error) {
    console.error("checkout-save function error:", error);
    return json(
      {
        ok: false,
        code: "UNEXPECTED_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Erro interno do servidor.",
      },
      500
    );
  }
});