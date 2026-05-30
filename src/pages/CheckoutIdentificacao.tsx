// src/pages/CheckoutIdentificacao.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  User,
  CreditCard,
  CheckCircle,
  ArrowLeft,
  ShieldCheck,
  MapPin,
  AlertCircle,
  Loader2,
  Home,
  ChevronRight,
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
  soft: "#f6f3ee",
  muted: "#8a8175",
  danger: "#dc2626",
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
  done,
  Icon,
  onClick,
}: {
  label: string;
  active?: boolean;
  done?: boolean;
  Icon: React.ElementType;
  onClick?: () => void | Promise<void>;
}) {
  const content = (
    <>
      <span
        className={[
          "inline-flex h-10 w-10 items-center justify-center rounded-full border transition",
          active
            ? "border-[#2b554e] bg-[#2b554e] text-white shadow-[0_10px_22px_rgba(43,85,78,0.18)]"
            : done
              ? "border-[#b08d57] bg-[#fff8ed] text-[#b08d57]"
              : "border-[#ddd5ca] bg-white text-[#aaa197]",
        ].join(" ")}
      >
        <Icon className="h-5 w-5" />
      </span>

      <span
        className={[
          "whitespace-nowrap text-[11px] sm:text-xs",
          active ? "font-semibold text-[#2b554e]" : "text-[#9a9187]",
        ].join(" ")}
      >
        {label}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-[82px] flex-col items-center gap-2"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex min-w-[82px] flex-col items-center gap-2">
      {content}
    </div>
  );
}

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;

  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
      <AlertCircle className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
  hint,
  className = "",
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="flex items-center gap-1 text-sm font-semibold text-[#3f3a34]">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-2">{children}</div>
      {hint && !error && <p className="mt-1.5 text-xs text-[#8a8175]">{hint}</p>}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

function inputClass(error?: string) {
  return [
    "h-12 w-full rounded-2xl border bg-[#fffdf9] px-4 text-sm text-[#2f2a24] outline-none transition",
    "placeholder:text-[#b5aea5] focus:bg-white focus:ring-4",
    error
      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
      : "border-[#ddd5c9] focus:border-[#2b554e] focus:ring-[#2b554e]/10",
  ].join(" ");
}


export default function CheckoutIdentificacao() {
  const navigate = useNavigate();
  const topRef = useRef<HTMLDivElement | null>(null);
  const { state } = useCart();

  const items = state.items ?? [];

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!items.length) navigate("/checkout", { replace: true });
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
  const [cepLoading, setCepLoading] = useState(false);
  const [cepAutoFilled, setCepAutoFilled] = useState(false);

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

  useEffect(() => {
    const cep = onlyDigits(form.cep);

    if (cep.length !== 8) {
      setCepAutoFilled(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function fetchAddressByCep() {
      setCepLoading(true);

      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
          signal: controller.signal,
        });

        const data = await response.json();

        if (cancelled) return;

        if (data?.erro) {
          setErrors((prev) => ({
            ...prev,
            cep: "CEP não encontrado.",
          }));
          setCepAutoFilled(false);
          return;
        }

        setForm((prev) => ({
          ...prev,
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        }));

        setErrors((prev) => {
          const copy = { ...prev };
          delete copy.cep;
          delete copy.street;
          delete copy.neighborhood;
          delete copy.city;
          delete copy.state;
          return copy;
        });

        setCepAutoFilled(true);
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          setCepAutoFilled(false);
        }
      } finally {
        if (!cancelled) setCepLoading(false);
      }
    }

    const timer = window.setTimeout(fetchAddressByCep, 350);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [form.cep]);

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

    if (Object.keys(e).length) {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

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
    <div ref={topRef} className="min-h-screen" style={{ backgroundColor: CALEA.bg }}>
      <Header />

      <main className="pt-[128px] md:pt-[156px]">
        <section className="border-b border-[#e9e2d6] bg-[#fcfaf6]">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <button
              type="button"
              onClick={() => navigate("/checkout")}
              className="mb-5 inline-flex items-center gap-2 text-sm text-[#756d63] transition hover:text-[#2b554e]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para a sacola
            </button>

            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#b08d57]">
                  Checkout
                </p>

                <h1 className="mt-2 text-[30px] font-light leading-tight tracking-[-0.04em] text-[#2b554e] sm:text-[40px]">
                  Dados de entrega
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#7a746c]">
                  Complete seus dados para criarmos o pedido e seguir para o pagamento com segurança.
                </p>
              </div>
            </div>

            <div className="mt-8 overflow-x-auto pb-2">
              <div className="flex min-w-max items-center gap-4 sm:min-w-0 sm:justify-between">
                <Step
                  label="Sacola"
                  done
                  Icon={ShoppingBag}
                  onClick={() => navigate("/checkout")}
                />

                <div className="h-px w-10 bg-[#ddd5c9] sm:flex-1" />

                <Step label="Identificação" active Icon={User} />

                <div className="h-px w-10 bg-[#ddd5c9] sm:flex-1" />

                <Step label="Pagamento" Icon={CreditCard} />

                <div className="h-px w-10 bg-[#ddd5c9] sm:flex-1" />

                <Step label="Confirmação" Icon={CheckCircle} />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-6">
              <div className="rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#fcfaf6] px-3 py-1 text-xs font-semibold text-[#2b554e] ring-1 ring-[#e9e2d6]">
                      <User className="h-3.5 w-3.5" />
                      Identificação
                    </div>

                    <h2
                      className="mt-3 text-xl font-semibold"
                      style={{ color: CALEA.primary }}
                    >
                      Quem vai receber a compra?
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-[#8a8175]">
                      Os campos com asterisco são obrigatórios.
                    </p>
                  </div>
                </div>

                {Object.keys(errors).length > 0 && (
                  <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Revise os campos destacados antes de continuar.
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="Nome completo"
                    required
                    error={errors.name}
                    className="sm:col-span-2"
                  >
                    <input
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      className={inputClass(errors.name)}
                      placeholder="Digite o nome completo"
                      autoComplete="name"
                    />
                  </Field>

                  <Field label="E-mail" required error={errors.email}>
                    <input
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      className={inputClass(errors.email)}
                      placeholder="voce@exemplo.com"
                      inputMode="email"
                      autoComplete="email"
                    />
                  </Field>

                  <Field label="WhatsApp" required error={errors.phone}>
                    <input
                      value={form.phone}
                      onChange={(e) => setField("phone", formatPhone(e.target.value))}
                      className={inputClass(errors.phone)}
                      placeholder="(11) 99999-9999"
                      inputMode="numeric"
                      autoComplete="tel"
                    />
                  </Field>

                  <Field
                    label="CPF"
                    required
                    error={errors.document}
                    className="sm:col-span-2"
                  >
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
                      className={inputClass(errors.document)}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#fcfaf6] px-3 py-1 text-xs font-semibold text-[#2b554e] ring-1 ring-[#e9e2d6]">
                      <MapPin className="h-3.5 w-3.5" />
                      Endereço
                    </div>

                    <h2
                      className="mt-3 text-xl font-semibold"
                      style={{ color: CALEA.primary }}
                    >
                      Endereço de entrega
                    </h2>
                  </div>

                  {cepLoading && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#fcfaf6] px-3 py-2 text-xs font-semibold text-[#2b554e] ring-1 ring-[#e9e2d6]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Buscando CEP
                    </div>
                  )}

                  {cepAutoFilled && !cepLoading && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Endereço encontrado
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                  <Field label="CEP" required error={errors.cep} className="sm:col-span-2">
                    <input
                      value={form.cep}
                      onChange={(e) => {
                        const nextCep = formatCEP(e.target.value);

                        setForm((prev) => ({
                          ...prev,
                          cep: nextCep,
                          street: "",
                          neighborhood: "",
                          city: "",
                          state: "",
                        }));

                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.cep;
                          delete copy.street;
                          delete copy.neighborhood;
                          delete copy.city;
                          delete copy.state;
                          return copy;
                        });

                        setCepAutoFilled(false);
                      }}
                      className={inputClass(errors.cep)}
                      placeholder="00000-000"
                      inputMode="numeric"
                      maxLength={9}
                      autoComplete="postal-code"
                    />
                  </Field>

                  <Field
                    label="Rua / Avenida"
                    required
                    error={errors.street}
                    className="sm:col-span-4"
                  >
                    <input
                      value={form.street}
                      onChange={(e) => setField("street", e.target.value)}
                      className={inputClass(errors.street)}
                      placeholder="Rua, avenida ou travessa"
                      autoComplete="address-line1"
                    />
                  </Field>

                  <Field label="Número" required error={errors.number} className="sm:col-span-2">
                    <input
                      value={form.number}
                      onChange={(e) => setField("number", e.target.value)}
                      className={inputClass(errors.number)}
                      placeholder="123"
                      autoComplete="address-line2"
                    />
                  </Field>

                  <Field label="Complemento" className="sm:col-span-4">
                    <input
                      value={form.complement}
                      onChange={(e) => setField("complement", e.target.value)}
                      className={inputClass()}
                      placeholder="Apto, bloco, casa..."
                    />
                  </Field>

                  <Field
                    label="Bairro"
                    required
                    error={errors.neighborhood}
                    className="sm:col-span-2"
                  >
                    <input
                      value={form.neighborhood}
                      onChange={(e) => setField("neighborhood", e.target.value)}
                      className={inputClass(errors.neighborhood)}
                      placeholder="Bairro"
                    />
                  </Field>

                  <Field label="Cidade" required error={errors.city} className="sm:col-span-3">
                    <input
                      value={form.city}
                      onChange={(e) => setField("city", e.target.value)}
                      className={inputClass(errors.city)}
                      placeholder="Cidade"
                      autoComplete="address-level2"
                    />
                  </Field>

                  <Field label="UF" required error={errors.state} className="sm:col-span-1">
                    <input
                      value={form.state}
                      onChange={(e) =>
                        setField("state", e.target.value.toUpperCase().slice(0, 2))
                      }
                      className={inputClass(errors.state)}
                      placeholder="SP"
                      maxLength={2}
                      autoComplete="address-level1"
                    />
                  </Field>
                </div>

                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-[#766e64] transition hover:bg-[#fcfaf6] hover:text-[#2b554e]"
                    title="Voltar para a loja"
                  >
                    <Home className="h-4 w-4" />
                    Voltar para a loja
                  </button>

                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!requiredOk || saving}
                    className="inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[260px]"
                    style={{ backgroundColor: CALEA.primary }}
                    title={!requiredOk ? "Preencha os campos obrigatórios" : ""}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        Continuar para pagamento
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <aside className="h-fit space-y-6 lg:sticky lg:top-28">
              <div className="rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p
                      className="text-[11px] uppercase tracking-[0.24em]"
                      style={{ color: CALEA.accent }}
                    >
                      Resumo
                    </p>
                    <h2
                      className="mt-2 text-lg font-semibold"
                      style={{ color: CALEA.primary }}
                    >
                      Seu pedido
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/checkout")}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-[#8a8175] ring-1 ring-[#e9e2d6] transition hover:bg-[#fcfaf6] hover:text-[#2b554e]"
                  >
                    Editar
                  </button>
                </div>

                <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                  {items.map((it: any) => {
                    const name = getItemName(it);
                    const img = getItemImage(it);
                    const qty = getItemQty(it);
                    const price = getItemPrice(it);

                    return (
                      <div
                        key={it.id ?? `${name}-${qty}`}
                        className="flex items-center gap-3 rounded-2xl bg-[#fcfaf6] p-3 ring-1 ring-[#e9e2d6]"
                      >
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
                          <p className="mt-1 text-xs text-[#8a8175]">Quantidade: {qty}</p>
                        </div>

                        <p className="text-sm font-semibold text-[#3f3a34]">
                          {moneyBRL(price * qty)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="my-5 h-px bg-[#eee5d8]" />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#766e64]">Subtotal</span>
                    <span className="font-semibold text-[#3f3a34]">{moneyBRL(subtotal)}</span>
                  </div>

                  {giftWrap && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#766e64]">Embalagem presente</span>
                      <span className="font-semibold text-[#3f3a34]">
                        {moneyBRL(giftWrapPrice)}
                      </span>
                    </div>
                  )}

                  {shippingPrice > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#766e64]">
                        Frete{shippingName ? ` (${shippingName})` : ""}
                      </span>
                      <span className="font-semibold text-[#3f3a34]">
                        {moneyBRL(shippingPrice)}
                      </span>
                    </div>
                  )}

                  {checkoutDraft?.discount_cents ? (
                    <div className="flex items-center justify-between text-emerald-700">
                      <span>Desconto</span>
                      <span className="font-semibold">
                        -{moneyBRL(Number(checkoutDraft.discount_cents) / 100)}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="my-5 h-px bg-[#eee5d8]" />

                <div className="rounded-3xl bg-[#2b554e] p-5 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-80">Total</span>
                    <span className="text-2xl font-semibold">{moneyBRL(total)}</span>
                  </div>

                  {shippingDeadline && (
                    <p className="mt-2 text-xs opacity-80">
                      Prazo estimado: {shippingDeadline}
                    </p>
                  )}
                </div>

                <div className="mt-4 rounded-2xl bg-[#fcfaf6] p-4 ring-1 ring-[#e9e2d6]">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      className="mt-0.5 h-5 w-5 shrink-0"
                      style={{ color: CALEA.primary }}
                    />
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