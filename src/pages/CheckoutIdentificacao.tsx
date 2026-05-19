// src/pages/CheckoutIdentificacao.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  User,
  CreditCard,
  CheckCircle,
  ArrowLeft,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext";
import { supabase } from "../lib/supabase";

const CALEA = {
  primary: "#2b554e",
  accent: "#b08d57",
  bg: "#fcfaf6",
  line: "#e9e2d6",
};

const FORM_STORAGE_KEY = "checkout_identificacao_v2";
const CHECKOUT_DRAFT_KEY = "calea_checkout";
const CHECKOUT_IDENTIFICACAO_KEY = "calea_checkout_identificacao";
const CUSTOMER_ID_KEY = "calea_customer_id";
const ADDRESS_ID_KEY = "calea_address_id";
const ORDER_ID_KEY = "calea_order_id";

type Form = {
  name: string;
  email: string;
  phone: string;
  document: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

type CheckoutDraft = {
  couponCode?: string | null;
  coupon_id?: string | null;
  coupon?: {
    id: string;
    code: string;
    discount_type: "percent" | "fixed" | "free_shipping";
    percent: number | null;
    amount_cents: number | null;
    max_discount_cents: number | null;
    min_subtotal_cents: number;
    first_purchase_only: boolean;
  } | null;
  discount?: number;
  discount_cents?: number;
  cep?: string;
  giftWrap?: boolean;
  giftWrapPrice?: number;
  subtotal?: number;
  shipping?: {
    id?: string;
    name?: string;
    price?: number;
    deadline?: string;
  } | null;
  shippingPrice?: number;
  total?: number;
  updatedAt?: string;
};

function moneyBRL(v: number) {
  return (v ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function onlyDigits(v: string) {
  return String(v ?? "").replace(/\D/g, "");
}

function formatCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function formatCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function isEmail(v: string) {
  const s = String(v ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
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

function Step({
  label,
  active,
  Icon,
  onClick,
}: {
  label: string;
  active?: boolean;
  Icon: React.ElementType;
  onClick?: () => void;
}) {
  const clickable = Boolean(onClick);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={[
        "flex shrink-0 flex-col items-center gap-2",
        clickable ? "cursor-pointer" : "cursor-default",
      ].join(" ")}
      aria-current={active ? "step" : undefined}
      title={clickable ? `Ir para ${label}` : label}
    >
      <span
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors"
        style={{
          backgroundColor: active ? CALEA.primary : "white",
          borderColor: active ? CALEA.primary : "#d8d1c6",
          color: active ? "white" : clickable ? "#8f897f" : "#b3aca2",
        }}
      >
        <Icon className="h-5 w-5" />
      </span>

      <span
        className={[
          "whitespace-nowrap text-xs sm:text-sm",
          active ? "font-semibold" : "text-gray-400",
        ].join(" ")}
        style={{ color: active ? CALEA.primary : undefined }}
      >
        {label}
      </span>
    </button>
  );
}

export default function CheckoutIdentificacao() {
  const navigate = useNavigate();
  const { state } = useCart();

  const items = state.items ?? [];

  useEffect(() => {
    if (!items.length) navigate("/checkout");
  }, [items.length, navigate]);

  const [form, setForm] = useState<Form>(() => {
    const saved = localStorage.getItem(FORM_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          name: "",
          email: "",
          phone: "",
          document: "",
          cep: "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
        };
      }
    }

    return {
      name: "",
      email: "",
      phone: "",
      document: "",
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  const checkoutDraft = useMemo<CheckoutDraft | null>(() => {
    try {
      const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (checkoutDraft?.cep && !form.cep) {
      setForm((prev) => ({
        ...prev,
        cep: formatCEP(checkoutDraft.cep ?? ""),
      }));
    }
  }, [checkoutDraft, form.cep]);

  const getItemName = (it: any) => it?.name ?? it?.title ?? "Item";
  const getItemImage = (it: any) => it?.image ?? it?.img ?? it?.thumbnail ?? "";
  const getItemQty = (it: any) => Number(it?.qty ?? it?.quantity ?? 1);
  const getItemPrice = (it: any) => Number(it?.price ?? 0);
  const getItemSkuId = (it: any) => it?.sku_id ?? it?.skuId ?? null;

  const itemsSubtotal = useMemo(
    () =>
      items.reduce((acc: number, it: any) => {
        return acc + getItemPrice(it) * getItemQty(it);
      }, 0),
    [items]
  );

  const subtotal =
    typeof checkoutDraft?.subtotal === "number"
      ? checkoutDraft.subtotal
      : itemsSubtotal;

  const giftWrap = Boolean(checkoutDraft?.giftWrap);
  const giftWrapPrice =
    typeof checkoutDraft?.giftWrapPrice === "number"
      ? checkoutDraft.giftWrapPrice
      : 0;

  const shippingName = checkoutDraft?.shipping?.name ?? "";
  const shippingDeadline = checkoutDraft?.shipping?.deadline ?? "";
  const shippingPrice =
    typeof checkoutDraft?.shippingPrice === "number"
      ? checkoutDraft.shippingPrice
      : typeof checkoutDraft?.shipping?.price === "number"
        ? checkoutDraft.shipping.price
        : 0;

  const total =
    typeof checkoutDraft?.total === "number"
      ? checkoutDraft.total
      : subtotal + giftWrapPrice + shippingPrice;

  const requiredOk = useMemo(() => {
    const cepOk = onlyDigits(form.cep).length === 8;
    const emailOk = isEmail(form.email);
    const phoneOk = onlyDigits(form.phone).length >= 10;
    const docOk = isValidCPF(form.document);

    const addrOk =
      form.street.trim() &&
      form.number.trim() &&
      form.neighborhood.trim() &&
      form.city.trim() &&
      form.state.trim().length === 2;

    return Boolean(form.name.trim() && emailOk && phoneOk && docOk && cepOk && addrOk);
  }, [form]);

  function setField<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[String(key)];
      return copy;
    });
  }

  function validate() {
    const e: Record<string, string> = {};

    if (!form.name.trim()) e.name = "Informe seu nome.";
    if (!isEmail(form.email)) e.email = "E-mail inválido.";
    if (onlyDigits(form.phone).length < 10) e.phone = "Telefone inválido com DDD.";
    if (!isValidCPF(form.document)) e.document = "CPF inválido.";
    if (onlyDigits(form.cep).length !== 8) e.cep = "CEP inválido.";
    if (!form.street.trim()) e.street = "Rua ou avenida obrigatória.";
    if (!form.number.trim()) e.number = "Número obrigatório.";
    if (!form.neighborhood.trim()) e.neighborhood = "Bairro obrigatório.";
    if (!form.city.trim()) e.city = "Cidade obrigatória.";
    if (form.state.trim().length !== 2) e.state = "UF com 2 letras.";

    return e;
  }

async function persistCheckoutInDatabase(currentForm: Form, cartItems: any[]) {
  const now = new Date().toISOString();

  const cleanEmail = currentForm.email.trim().toLowerCase();
  const cleanPhone = onlyDigits(currentForm.phone);
  const cleanDocument = onlyDigits(currentForm.document);
  const cleanCep = onlyDigits(currentForm.cep);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  let customerId = sessionStorage.getItem(CUSTOMER_ID_KEY);
  let addressId = sessionStorage.getItem(ADDRESS_ID_KEY);
  let orderId = sessionStorage.getItem(ORDER_ID_KEY);
  let orderNumber = sessionStorage.getItem("calea_order_number");

  const customerPayload = {
    user_id: user?.id ?? null,
    email: cleanEmail,
    full_name: currentForm.name.trim(),
    phone: cleanPhone,
    document: cleanDocument,
    updated_at: now,
  };

  if (customerId) {
    const { error } = await supabase
      .from("customers")
      .update(customerPayload)
      .eq("id", customerId);

    if (error) throw error;
  } else {
    let existingCustomerId: string | null = null;

    if (user?.id) {
      const { data, error } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      existingCustomerId = data?.id ?? null;
    } else {
      const { data, error } = await supabase
        .from("customers")
        .select("id")
        .eq("email", cleanEmail)
        .eq("document", cleanDocument)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      existingCustomerId = data?.id ?? null;
    }

    if (existingCustomerId) {
      customerId = existingCustomerId;

      const { error } = await supabase
        .from("customers")
        .update(customerPayload)
        .eq("id", customerId);

      if (error) throw error;
    } else {
      const { data, error } = await supabase
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
    throw new Error("Não foi possível salvar o cliente.");
  }

  sessionStorage.setItem(CUSTOMER_ID_KEY, customerId);

  const addressPayload = {
    customer_id: customerId,
    label: "Entrega",
    recipient_name: currentForm.name.trim(),
    phone: cleanPhone,
    cep: cleanCep,
    street: currentForm.street.trim(),
    number: currentForm.number.trim(),
    complement: currentForm.complement.trim() || null,
    neighborhood: currentForm.neighborhood.trim() || null,
    city: currentForm.city.trim(),
    state: currentForm.state.trim().toUpperCase(),
    country: "BR",
    is_default: true,
    updated_at: now,
  };

  if (addressId) {
    const { error } = await supabase
      .from("addresses")
      .update(addressPayload)
      .eq("id", addressId);

    if (error) throw error;
  } else {
    const { data, error } = await supabase
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
    throw new Error("Não foi possível salvar o endereço.");
  }

  sessionStorage.setItem(ADDRESS_ID_KEY, addressId);

  const merchandiseSubtotalCents = cartItems.reduce((acc: number, it: any) => {
    return acc + toCents(getItemPrice(it)) * getItemQty(it);
  }, 0);

  const shippingCents = toCents(shippingPrice);
  const giftWrapCents = giftWrap ? toCents(giftWrapPrice) : 0;
  const discountCents = Number(checkoutDraft?.discount_cents || 0);

  const totalCents = Math.max(
    merchandiseSubtotalCents + shippingCents + giftWrapCents - discountCents,
    0
  );

  const couponCode =
    checkoutDraft?.couponCode ||
    checkoutDraft?.coupon?.code ||
    null;

  const orderPayload = {
    customer_id: customerId,
    shipping_address_id: addressId,
    status: "draft",
    subtotal_cents: merchandiseSubtotalCents,
    shipping_cents: shippingCents,
    gift_wrap_cents: giftWrapCents,
    total_cents: totalCents,
    coupon_code: couponCode,
    discount_cents: discountCents,
    updated_at: now,
  };

  if (orderId) {
    const { error } = await supabase
      .from("orders")
      .update(orderPayload)
      .eq("id", orderId);

    if (error) throw error;

    if (!orderNumber) {
      const { data: existingOrder, error: orderNumberError } = await supabase
        .from("orders")
        .select("order_number")
        .eq("id", orderId)
        .limit(1)
        .maybeSingle();

      if (orderNumberError) throw orderNumberError;

      if (existingOrder?.order_number) {
        orderNumber = existingOrder.order_number;
        sessionStorage.setItem("calea_order_number", existingOrder.order_number);
      }
    }
  } else {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        ...orderPayload,
        created_at: now,
      })
      .select("id, order_number")
      .single();

    if (error) throw error;

    orderId = data.id;

    if (data.order_number) {
      orderNumber = data.order_number;
      sessionStorage.setItem("calea_order_number", data.order_number);
    }
  }

  if (!orderId) {
    throw new Error("Não foi possível criar o pedido.");
  }

  sessionStorage.setItem(ORDER_ID_KEY, orderId);

  const { error: deleteItemsError } = await supabase
    .from("order_items")
    .delete()
    .eq("order_id", orderId);

  if (deleteItemsError) throw deleteItemsError;

  const orderItemsPayload = cartItems
    .map((it: any) => ({
      order_id: orderId,
      sku_id: getItemSkuId(it),
      unit_price_cents: toCents(getItemPrice(it)),
      quantity: getItemQty(it),
    }))
    .filter((item: any) => item.sku_id);

  if (orderItemsPayload.length > 0) {
    const { error: insertItemsError } = await supabase
      .from("order_items")
      .insert(orderItemsPayload);

    if (insertItemsError) throw insertItemsError;
  }

  const identificationPayload = {
    ...currentForm,
    phone: cleanPhone,
    document: cleanDocument,
    cep: cleanCep,
    customer_id: customerId,
    address_id: addressId,
    order_id: orderId,
    order_number:
      orderNumber || sessionStorage.getItem("calea_order_number") || null,
    coupon_code: couponCode,
    discount_cents: discountCents,
    total_cents: totalCents,
    updatedAt: now,
  };

  localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(currentForm));

  sessionStorage.setItem(
    CHECKOUT_IDENTIFICACAO_KEY,
    JSON.stringify(identificationPayload)
  );

  return { customerId, addressId, orderId };
}

  async function handleContinue() {
  const e = validate();
  setErrors(e);

  if (Object.keys(e).length) return;

  setSaving(true);

  try {
    await persistCheckoutInDatabase(form, items);
    navigate("/checkout/pagamento");
  } catch (error: any) {
    console.error("Erro ao salvar checkout:", error);

    alert(
      "Não foi possível continuar com o pedido. Confira os dados e tente novamente."
    );
  } finally {
    setSaving(false);
  }
}

  return (
    <div className="min-h-screen" style={{ backgroundColor: CALEA.bg }}>
      <Header />

      <main className="pt-[160px] md:pt-[180px]">
        <section className="border-b" style={{ borderColor: CALEA.line }}>
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
            <div className="text-center">
              <p
                className="text-[11px] uppercase tracking-[0.28em]"
                style={{ color: CALEA.accent }}
              >
                Checkout
              </p>

              <h1
                className="mt-2 text-2xl font-medium sm:text-3xl"
                style={{ color: CALEA.primary }}
              >
                Seus dados para entrega
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Preencha suas informações para seguir ao pagamento.
              </p>
            </div>

            <div className="mx-auto mt-8 max-w-3xl">
              <div className="flex items-center gap-6 overflow-x-auto px-2 pb-2 [-webkit-overflow-scrolling:touch] sm:justify-between sm:overflow-visible sm:px-0">
                <Step
                  label="Sacola"
                  Icon={ShoppingBag}
                  onClick={() => navigate("/checkout")}
                />
                <div className="hidden h-px flex-1 bg-[#ddd5c9] sm:block" />
                <Step label="Identificação" active Icon={User} />
                <div className="hidden h-px flex-1 bg-[#ddd5c9] sm:block" />
                <Step label="Pagamento" Icon={CreditCard} />
                <div className="hidden h-px flex-1 bg-[#ddd5c9] sm:block" />
                <Step label="Confirmação" Icon={CheckCircle} />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2
                      className="text-lg font-semibold"
                      style={{ color: CALEA.primary }}
                    >
                      Identificação
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Use os dados do destinatário da compra.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/checkout")}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 transition hover:text-black"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Nome completo
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] px-3 outline-none transition focus:border-[#2b554e]"
                      placeholder="Seu nome"
                    />
                    {errors.name && (
                      <div className="mt-1 text-sm text-red-600">{errors.name}</div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      E-mail
                    </label>
                    <input
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] px-3 outline-none transition focus:border-[#2b554e]"
                      placeholder="voce@exemplo.com"
                      inputMode="email"
                    />
                    {errors.email && (
                      <div className="mt-1 text-sm text-red-600">{errors.email}</div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      WhatsApp
                    </label>
                    <input
                      value={form.phone}
                      onChange={(e) => setField("phone", formatPhone(e.target.value))}
                      className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] px-3 outline-none transition focus:border-[#2b554e]"
                      placeholder="(11) 99999-9999"
                      inputMode="numeric"
                    />
                    {errors.phone && (
                      <div className="mt-1 text-sm text-red-600">{errors.phone}</div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">
                      CPF
                    </label>
                    <input
                      value={form.document}
                      onChange={(e) => setField("document", formatCPF(e.target.value))}
                      onBlur={() => {
                        if (form.document && !isValidCPF(form.document)) {
                          setErrors((prev) => ({
                            ...prev,
                            document: "CPF inválido.",
                          }));
                        }
                      }}
                      className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] px-3 outline-none transition focus:border-[#2b554e]"
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                    />
                    {errors.document && (
                      <div className="mt-1 text-sm text-red-600">
                        {errors.document}
                      </div>
                    )}
                  </div>
                </div>

                <div className="my-6 h-px bg-[#eee5d8]" />

                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4" style={{ color: CALEA.accent }} />
                  <h3 className="font-semibold" style={{ color: CALEA.primary }}>
                    Endereço de entrega
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      CEP
                    </label>
                    <input
                      value={form.cep}
                      onChange={(e) => setField("cep", formatCEP(e.target.value))}
                      className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] px-3 outline-none transition focus:border-[#2b554e]"
                      placeholder="00000-000"
                      inputMode="numeric"
                      maxLength={9}
                    />
                    {errors.cep && (
                      <div className="mt-1 text-sm text-red-600">{errors.cep}</div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Rua / Avenida
                    </label>
                    <input
                      value={form.street}
                      onChange={(e) => setField("street", e.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] px-3 outline-none transition focus:border-[#2b554e]"
                      placeholder="Rua Exemplo"
                    />
                    {errors.street && (
                      <div className="mt-1 text-sm text-red-600">{errors.street}</div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      Número
                    </label>
                    <input
                      value={form.number}
                      onChange={(e) => setField("number", e.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] px-3 outline-none transition focus:border-[#2b554e]"
                      placeholder="123"
                    />
                    {errors.number && (
                      <div className="mt-1 text-sm text-red-600">{errors.number}</div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Complemento
                    </label>
                    <input
                      value={form.complement}
                      onChange={(e) => setField("complement", e.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] px-3 outline-none transition focus:border-[#2b554e]"
                      placeholder="Apto, bloco, casa..."
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      Bairro
                    </label>
                    <input
                      value={form.neighborhood}
                      onChange={(e) => setField("neighborhood", e.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] px-3 outline-none transition focus:border-[#2b554e]"
                      placeholder="Centro"
                    />
                    {errors.neighborhood && (
                      <div className="mt-1 text-sm text-red-600">
                        {errors.neighborhood}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      Cidade
                    </label>
                    <input
                      value={form.city}
                      onChange={(e) => setField("city", e.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] px-3 outline-none transition focus:border-[#2b554e]"
                      placeholder="São Paulo"
                    />
                    {errors.city && (
                      <div className="mt-1 text-sm text-red-600">{errors.city}</div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      UF
                    </label>
                    <input
                      value={form.state}
                      onChange={(e) =>
                        setField("state", e.target.value.toUpperCase().slice(0, 2))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-[#d8d1c6] px-3 outline-none transition focus:border-[#2b554e]"
                      placeholder="SP"
                      maxLength={2}
                    />
                    {errors.state && (
                      <div className="mt-1 text-sm text-red-600">{errors.state}</div>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="text-xs text-gray-500 underline transition hover:text-black"
                    title="Voltar para a loja"
                  >
                    Voltar para a loja
                  </button>

                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!requiredOk || saving}
                    className="h-12 w-full rounded-full px-5 font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                    style={{ backgroundColor: CALEA.accent }}
                    title={!requiredOk ? "Preencha os campos obrigatórios" : ""}
                  >
                    {saving ? "Salvando..." : "Continuar para pagamento"}
                  </button>
                </div>
              </div>
            </div>

            <aside className="h-fit space-y-6 lg:sticky lg:top-24">
              <div className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: CALEA.primary }}
                  >
                    Resumo do pedido
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/checkout")}
                    className="text-xs text-gray-500 underline transition hover:text-black"
                  >
                    Voltar
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((it: any) => {
                    const name = getItemName(it);
                    const img = getItemImage(it);
                    const qty = getItemQty(it);
                    const price = getItemPrice(it);

                    return (
                      <div key={it.id ?? `${name}-${qty}`} className="flex items-center gap-3">
                        {img ? (
                          <img
                            src={img}
                            alt={name}
                            className="h-16 w-16 rounded-2xl object-cover ring-1 ring-black/5"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-2xl bg-[#f7f3ec] ring-1 ring-black/5" />
                        )}

                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-semibold"
                            style={{ color: CALEA.primary }}
                          >
                            {name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Qtd: {qty}
                            {shippingDeadline ? ` • ${shippingDeadline}` : ""}
                          </p>
                        </div>

                        <p className="text-sm font-semibold">
                          {moneyBRL(price * qty)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="my-5 h-px bg-[#eee5d8]" />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">{moneyBRL(subtotal)}</span>
                  </div>

                  {giftWrap && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Embalagem presente</span>
                      <span className="font-semibold">
                        {moneyBRL(giftWrapPrice)}
                      </span>
                    </div>
                  )}

                  {shippingPrice > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">
                        Frete{shippingName ? ` (${shippingName})` : ""}
                      </span>
                      <span className="font-semibold">
                        {moneyBRL(shippingPrice)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="my-5 h-px bg-[#eee5d8]" />

                <div className="flex items-center justify-between text-base">
                  <span
                    className="font-semibold"
                    style={{ color: CALEA.primary }}
                  >
                    Total
                  </span>
                  <span
                    className="text-xl font-semibold"
                    style={{ color: CALEA.primary }}
                  >
                    {moneyBRL(total)}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl bg-[#fcfaf6] p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      className="mt-0.5 h-5 w-5 shrink-0"
                      style={{ color: CALEA.primary }}
                    />
                    <p className="text-xs leading-5 text-gray-500">
                      Seus dados ficam salvos para continuar a compra com segurança.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}