// src/pages/CheckoutIdentificacao.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  CheckCircle,
  ArrowLeft,
  ShieldCheck,
  MapPin,
  AlertCircle,
  Loader2,
  ChevronRight,
  LockKeyhole,

} from "lucide-react";
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
    carrier?: string | null;
    carrier_code?: string | null;
    price?: number;
    original_price?: number;
    deadline?: string;
    delivery_time?: number | null;
    allow_buy_label?: boolean;
    raw?: any;
    free_shipping_applied?: boolean;
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
  id,
  label,
  required,
  error,
  children,
  hint,
  className = "",
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="flex items-center gap-1 text-sm font-semibold text-[#3f3a34]"
      >
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

  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [customerLoaded, setCustomerLoaded] = useState(false);
  const [hasExistingCustomer, setHasExistingCustomer] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!items.length) navigate("/checkout", { replace: true });
  }, [items.length, navigate]);

  useEffect(() => {
    let active = true;

    async function validateCheckoutSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) return;



        if (!session?.access_token || !session.user) {
          navigate("/checkout", { replace: true });
          return;
        }

        const user = session.user;

        setCurrentUser(user);
        const { data: customer, error: customerError } = await supabase
          .from("customers")
          .select(`
    id,
    full_name,
    email,
    phone,
    document,
    addresses (
      id,
      cep,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      is_default
    )
  `)
          .eq("user_id", user.id)
          .maybeSingle();

        if (customerError) {
          console.error("Erro ao carregar cliente:", customerError);
        }

        if (customer) {
          setHasExistingCustomer(true);

          sessionStorage.setItem(CUSTOMER_ID_KEY, customer.id);

          const addresses = Array.isArray(customer.addresses)
            ? customer.addresses
            : [];

          const defaultAddress =
            addresses.find((address: any) => address.is_default) ||
            addresses[0] ||
            null;

          if (defaultAddress?.id) {
            sessionStorage.setItem(ADDRESS_ID_KEY, defaultAddress.id);
          } else {
            sessionStorage.removeItem(ADDRESS_ID_KEY);
          }

          setForm((prev) => ({
            ...prev,
            name: customer.full_name || prev.name,
            email: user.email || customer.email || prev.email,
            phone: customer.phone
              ? formatPhone(customer.phone)
              : prev.phone,
            document: customer.document
              ? formatCPF(customer.document)
              : prev.document,
            cep: defaultAddress?.cep
              ? formatCEP(defaultAddress.cep)
              : prev.cep,
            street: defaultAddress?.street || prev.street,
            number: defaultAddress?.number || prev.number,
            complement: defaultAddress?.complement || prev.complement,
            neighborhood: defaultAddress?.neighborhood || prev.neighborhood,
            city: defaultAddress?.city || prev.city,
            state: defaultAddress?.state || prev.state,
          }));
        } else {
          setHasExistingCustomer(false);
          sessionStorage.removeItem(CUSTOMER_ID_KEY);
          sessionStorage.removeItem(ADDRESS_ID_KEY);
        }

        setCustomerLoaded(true);

        const accountEmail = String(user.email || "").trim().toLowerCase();

        setForm((prev) => {
          const previousEmail = String(prev.email || "").trim().toLowerCase();

          // Dados locais de outra conta nunca são reaproveitados.
          if (
            !customer &&
            previousEmail &&
            accountEmail &&
            previousEmail !== accountEmail
          ) {
            const cleanForm: Form = {
              name: "",
              email: accountEmail,
              phone: "",
              document: "",
              cep: (() => {
                try {
                  const rawDraft = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
                  const draft = rawDraft ? JSON.parse(rawDraft) : null;
                  return draft?.cep ? formatCEP(draft.cep) : "";
                } catch {
                  return "";
                }
              })(),
              street: "",
              number: "",
              complement: "",
              neighborhood: "",
              city: "",
              state: "",
            };

            localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(cleanForm));
            return cleanForm;
          }

          if (!prev.email && accountEmail) {
            return { ...prev, email: accountEmail };
          }

          return prev;
        });
      } finally {
        if (active) setAuthChecking(false);
      }
    }

    validateCheckoutSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      if (!session?.user) {
        navigate("/checkout", { replace: true });
        return;
      }

      setCurrentUser(session.user);

      const accountEmail = String(session.user.email || "").trim().toLowerCase();
      setForm((prev) => ({
        ...prev,
        email: accountEmail || prev.email,
      }));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

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

  const isFirstPurchase = customerLoaded && !hasExistingCustomer;

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
      : subtotal + (giftWrap ? giftWrapPrice : 0) + shippingPrice;

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
    const checkoutDraftRaw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);

    if (!checkoutDraftRaw) {
      throw new Error("Dados do checkout não encontrados. Volte para a sacola e calcule o frete novamente.");
    }

    const currentCheckoutDraft = JSON.parse(checkoutDraftRaw);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Sua sessão expirou. Entre novamente para continuar.");
    }

    const response = await fetch("/.netlify/functions/save-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        form: currentForm,
        items: cartItems,
        checkoutDraft: currentCheckoutDraft,
        customerId: sessionStorage.getItem(CUSTOMER_ID_KEY),
        addressId: sessionStorage.getItem(ADDRESS_ID_KEY),
        orderId: sessionStorage.getItem(ORDER_ID_KEY),
        orderNumber: sessionStorage.getItem("calea_order_number"),
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "Erro ao salvar checkout.");
    }

    sessionStorage.setItem(CUSTOMER_ID_KEY, data.customerId);
    sessionStorage.setItem(ADDRESS_ID_KEY, data.addressId);
    sessionStorage.setItem(ORDER_ID_KEY, data.orderId);

    if (data.orderNumber) {
      sessionStorage.setItem("calea_order_number", data.orderNumber);
    }

    const identificationPayload = {
      ...currentForm,
      phone: onlyDigits(currentForm.phone),
      document: onlyDigits(currentForm.document),
      cep: onlyDigits(currentForm.cep),

      customer_id: data.customerId,
      address_id: data.addressId,
      order_id: data.orderId,
      order_number: data.orderNumber || null,

      coupon_code: data.couponCode || null,
      discount_cents: data.discountCents || 0,
      total_cents: data.totalCents || 0,

      shipping_service_code: data.selectedShipping?.id || null,
      shipping_service_description: data.selectedShipping?.name || null,
      shipping_delivery_time: data.selectedShipping?.delivery_time || null,
      carrier: data.selectedShipping?.carrier || null,
      shipping: data.selectedShipping || null,

      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(currentForm));

    sessionStorage.setItem(
      CHECKOUT_IDENTIFICACAO_KEY,
      JSON.stringify(identificationPayload)
    );

    return {
      customerId: data.customerId,
      addressId: data.addressId,
      orderId: data.orderId,
    };
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
        error?.message ||
        error?.details ||
        error?.hint ||
        "Não foi possível continuar com o pedido."
      );
    } finally {
      setSaving(false)
    }
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#fcfaf6]">
        <CheckoutHeader onBack={() => navigate("/checkout")} />
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#2b554e]" />
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef} className="min-h-screen bg-[#fcfaf6]">
      <CheckoutHeader onBack={() => navigate("/checkout")} />

      <main className="pb-28 lg:pb-16">
        <section className="mx-auto max-w-6xl px-4 pb-5 pt-7 sm:px-6 sm:pb-7 sm:pt-9">
          <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-[#b08d57]">
            {isFirstPurchase ? "Primeira compra" : "Finalizar compra"}
          </p>

          <h1 className="mt-2 font-serif text-[34px] font-normal leading-[1.02] tracking-[-0.03em] text-[#2b554e] sm:text-[42px]">
            {isFirstPurchase ? "Prazer, vamos completar seu cadastro." : "Seus dados de entrega"}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#2b554e]/55">
            {isFirstPurchase
              ? "Como é sua primeira compra, precisamos de alguns dados para preparar a entrega. Nas próximas compras, tudo fica mais rápido."
              : "Confira seus dados e o endereço antes de seguir para o pagamento."}
          </p>

          {currentUser?.email && (
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-[#2b554e]/50">
              <CheckCircle className="h-3.5 w-3.5 text-[#2b554e]" />
              Conectada como <strong className="font-medium text-[#2b554e]">{currentUser.email}</strong>
            </div>
          )}

          <CheckoutProgress />
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-7">
            <div className="space-y-6">
              <div className="border-y border-[#e8dfd3] bg-white p-4 sm:rounded-[24px] sm:border sm:p-6">
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
                      Seus dados
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-[#8a8175]">
                      Preencha uma vez. Nas próximas compras, reaproveitamos seus dados.
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
                    id="checkout-name"
                    label="Nome completo"
                    required
                    error={errors.name}
                    className="sm:col-span-2"
                  >
                    <input
                      id="checkout-name"
                      name="name"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      className={inputClass(errors.name)}
                      placeholder="Digite o nome completo"
                      autoComplete="name"
                    />
                  </Field>

                  <Field id="checkout-email" label="E-mail" required error={errors.email}>
                    <input
                      id="checkout-email"
                      name="email"
                      value={form.email}
                      readOnly
                      aria-readonly="true"
                      className={`${inputClass(errors.email)} cursor-not-allowed bg-[#f7f3ec] text-[#2b554e]/65`}
                      placeholder="voce@exemplo.com"
                      inputMode="email"
                      autoComplete="email"
                    />
                  </Field>

                  <Field id="checkout-phone" label="WhatsApp" required error={errors.phone}>
                    <input
                      id="checkout-phone"
                      name="phone"
                      value={form.phone}
                      onChange={(e) => setField("phone", formatPhone(e.target.value))}
                      className={inputClass(errors.phone)}
                      placeholder="(11) 99999-9999"
                      inputMode="numeric"
                      autoComplete="tel"
                    />
                  </Field>

                  <Field
                    id="checkout-document"
                    label="CPF"
                    required
                    error={errors.document}
                    className="sm:col-span-2"
                  >
                    <input
                      id="checkout-document"
                      name="document"
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

              <div className="border-y border-[#e8dfd3] bg-white p-4 sm:rounded-[24px] sm:border sm:p-6">
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
                      Onde vamos entregar?
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
                  <Field id="checkout-cep" label="CEP" required error={errors.cep} className="sm:col-span-2">
                    <input
                      id="checkout-cep"
                      name="postalCode"
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
                    id="checkout-street"
                    label="Rua / Avenida"
                    required
                    error={errors.street}
                    className="sm:col-span-4"
                  >
                    <input
                      id="checkout-street"
                      name="street"
                      value={form.street}
                      onChange={(e) => setField("street", e.target.value)}
                      className={inputClass(errors.street)}
                      placeholder="Rua, avenida ou travessa"
                      autoComplete="address-line1"
                    />
                  </Field>

                  <Field id="checkout-number" label="Número" required error={errors.number} className="sm:col-span-2">
                    <input
                      id="checkout-number"
                      name="number"
                      value={form.number}
                      onChange={(e) => setField("number", e.target.value)}
                      className={inputClass(errors.number)}
                      placeholder="123"
                      autoComplete="address-line2"
                    />
                  </Field>

                  <Field id="checkout-complement" label="Complemento" className="sm:col-span-4">
                    <input
                      id="checkout-complement"
                      name="complement"
                      value={form.complement}
                      onChange={(e) => setField("complement", e.target.value)}
                      className={inputClass()}
                      placeholder="Apto, bloco, casa..."
                    />
                  </Field>

                  <Field
                    id="checkout-neighborhood"
                    label="Bairro"
                    required
                    error={errors.neighborhood}
                    className="sm:col-span-2"
                  >
                    <input
                      id="checkout-neighborhood"
                      name="neighborhood"
                      value={form.neighborhood}
                      onChange={(e) => setField("neighborhood", e.target.value)}
                      className={inputClass(errors.neighborhood)}
                      placeholder="Bairro"
                    />
                  </Field>

                  <Field id="checkout-city" label="Cidade" required error={errors.city} className="sm:col-span-3">
                    <input
                      id="checkout-city"
                      name="city"
                      value={form.city}
                      onChange={(e) => setField("city", e.target.value)}
                      className={inputClass(errors.city)}
                      placeholder="Cidade"
                      autoComplete="address-level2"
                    />
                  </Field>

                  <Field id="checkout-state" label="UF" required error={errors.state} className="sm:col-span-1">
                    <input
                      id="checkout-state"
                      name="state"
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
              </div>
            </div>

            <aside className="h-fit space-y-6 lg:sticky lg:top-28">
              <div className="border-y border-[#e8dfd3] bg-white p-4 sm:rounded-[24px] sm:border sm:p-6">
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

                <div className="mt-5 rounded-2xl bg-[#fcfaf6] p-4 ring-1 ring-[#e9e2d6]">
                  <p className="text-[11px] uppercase tracking-[0.20em]" style={{ color: CALEA.accent }}>
                    Entrega
                  </p>

                  <div className="mt-3 space-y-1.5 text-sm text-[#766e64]">
                    <p>
                      <strong className="text-[#2b554e]">{shippingName || "-"}</strong> ·{" "}
                      {shippingDeadline || "-"}
                    </p>

                    <p>
                      {form.street && form.number
                        ? `${form.street}, ${form.number}`
                        : "Endereço ainda não preenchido"}
                    </p>

                    <p>
                      {form.neighborhood ? `${form.neighborhood} · ` : ""}
                      {form.city && form.state ? `${form.city}/${form.state}` : ""}
                    </p>

                    <p>CEP {form.cep || "-"}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-[26px] bg-[#2b554e] px-5 py-4 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-80">Total</span>
                    <span className="text-[30px] font-semibold tracking-[-0.04em]">
                      {moneyBRL(total)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!requiredOk || saving}
                  className="mt-5 hidden h-[58px] w-full items-center justify-center gap-2 rounded-full bg-[#2b554e] text-sm font-semibold text-white shadow-[0_14px_28px_rgba(43,85,78,0.24)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 lg:flex"
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

                <div className="mt-4 hidden items-center justify-center gap-2 border-t border-[#eee7dc] pt-4 lg:flex">
                  <ShieldCheck
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: CALEA.primary }}
                  />
                  <p className="text-[10px] leading-4 text-[#2b554e]/45">
                    Ambiente seguro para concluir sua compra.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e5ddd2] bg-[#fcfaf6]/96 px-4 py-3 shadow-[0_-12px_35px_rgba(43,85,78,0.06)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-[112px]">
            <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-[#2b554e]/40">
              Total
            </p>
            <p className="font-serif text-xl text-[#2b554e]">
              {moneyBRL(total)}
            </p>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!requiredOk || saving}
            className="flex h-12 flex-1 items-center justify-center gap-2 bg-[#2b554e] px-5 text-sm font-semibold text-white transition hover:bg-[#23463f] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                Ir para pagamento
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckoutHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#e8dfd3] bg-[#fcfaf6]/95 backdrop-blur">
      <div className="mx-auto grid h-[68px] max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:h-[76px] sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 justify-self-start text-xs font-medium text-[#2b554e]/55 transition hover:text-[#2b554e]"
          aria-label="Voltar para a sacola"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Voltar para a sacola</span>
        </button>

        <button
          type="button"
          onClick={() => (window.location.href = "/")}
          className="justify-self-center text-center"
          aria-label="Ir para a loja Caléa"
        >
          <span className="block font-serif text-[20px] tracking-[0.11em] text-[#2b554e] sm:text-[22px]">
            CALÉA
          </span>
          <span className="mt-[-2px] block text-[7px] font-medium uppercase tracking-[0.38em] text-[#b08d57]">
            Blanc
          </span>
        </button>

        <div className="inline-flex items-center gap-2 justify-self-end text-[10px] font-medium uppercase tracking-[0.12em] text-[#2b554e]/45">
          <LockKeyhole className="h-3.5 w-3.5 text-[#2b554e]" />
          <span className="hidden sm:inline">Compra segura</span>
        </div>
      </div>
    </header>
  );
}

function CheckoutProgress() {
  return (
    <div className="mt-7">
      <div className="flex items-center justify-between text-[11px] font-medium">
        <span className="text-[#2b554e]">
          Identificação
        </span>

        <span className="text-[#2b554e]/35">
          2 de 4
        </span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1">
        <div className="h-[3px] bg-[#2b554e]" />
        <div className="h-[3px] bg-[#2b554e]" />
        <div className="h-[3px] bg-[#e4dbcf]" />
        <div className="h-[3px] bg-[#e4dbcf]" />
      </div>
    </div>
  );
}