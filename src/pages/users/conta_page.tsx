import React, { useEffect, useMemo, useState } from "react";
import {
  User,
  Package,
  MapPin,
  ShieldCheck,
  Heart,
  Loader2,
  Pencil,
} from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { supabase } from "../../lib/supabase";

type TabKey = "perfil" | "pedidos" | "trocas" | "enderecos" | "fidelidade";

type AuthUser = {
  id: string;
  email?: string;
  phone?: string;
};

type CustomerProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  birth_date: string | null;
};

type Address = {
  id: string;
  recipient_name: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  is_default: boolean | null;
};

type Order = {
  id: string;
  created_at: string;
  status: string | null;
  subtotal_cents: number | null;
  shipping_cents: number | null;
  discount_cents: number | null;
  total_cents: number | null;
  payment_method: string | null;
};

type LoyaltySummary = {
  totalOrders: number;
  totalSpentCents: number;
  lastOrderDate: string | null;
};

type ProfileFormState = {
  full_name: string;
  email: string;
  phone: string;
  document: string;
  birth_date: string;
};

const CALEA = {
  bg: "#FCFAF6",
  soft: "#f6f3ee",
  line: "#e9e2d6",
  primary: "#2b554e",
  accent: "#b08d57",
  textSoft: "#6f6558",
};

export default function ContaPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("pedidos");
  const [orderFilter, setOrderFilter] = useState<
    "todos" | "abertos" | "concluidos" | "cancelados"
  >("todos");
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    full_name: "",
    email: "",
    phone: "",
    document: "",
    birth_date: "",
  });

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          if (mounted) {
            setAuthUser(null);
            setProfile(null);
            setOrders([]);
            setAddresses([]);
          }
          return;
        }

        if (mounted) {
          setAuthUser({
            id: user.id,
            email: user.email,
            phone: user.phone,
          });
        }

        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .select("id, user_id, full_name, email, phone, document, birth_date")
          .eq("user_id", user.id)
          .maybeSingle();

        if (customerError) throw customerError;

        const nextProfile = (customerData as CustomerProfile | null) || null;

        if (mounted) {
          setProfile(nextProfile);
          setProfileForm({
            full_name: nextProfile?.full_name || "",
            email: nextProfile?.email || user.email || "",
            phone: nextProfile?.phone || user.phone || "",
            document: nextProfile?.document || "",
            birth_date: nextProfile?.birth_date || "",
          });
        }

        if (customerData?.id) {
          const { data: ordersData, error: ordersError } = await supabase
            .from("orders")
            .select(
              "id, created_at, status, subtotal_cents, shipping_cents, discount_cents, total_cents, payment_method"
            )
            .eq("customer_id", customerData.id)
            .order("created_at", { ascending: false });

          if (ordersError) throw ordersError;
          if (mounted) setOrders((ordersData as Order[]) || []);

          const { data: addressData, error: addressError } = await supabase
            .from("addresses")
            .select(
              "id, recipient_name, street, number, complement, neighborhood, city, state, cep, is_default"
            )
            .eq("customer_id", customerData.id)
            .order("is_default", { ascending: false });

          if (addressError) throw addressError;
          if (mounted) setAddresses((addressData as Address[]) || []);
        } else {
          if (mounted) {
            setOrders([]);
            setAddresses([]);
          }
        }
      } catch (err: any) {
        console.error("Erro ao carregar página da conta:", err);
        if (mounted) {
          setError(err?.message || "Não foi possível carregar sua conta.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const loyalty = useMemo<LoyaltySummary>(() => {
    const paidOrders = orders.filter((order) =>
      ["paid", "processing", "shipped", "delivered"].includes(
        String(order.status || "").toLowerCase()
      )
    );

    return {
      totalOrders: paidOrders.length,
      totalSpentCents: paidOrders.reduce(
        (sum, order) => sum + (order.total_cents || 0),
        0
      ),
      lastOrderDate: paidOrders[0]?.created_at || null,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = String(order.status || "").toLowerCase();
      if (orderFilter === "todos") return true;
      if (orderFilter === "abertos") {
        return ["draft", "pending_payment", "processing", "shipped"].includes(
          status
        );
      }
      if (orderFilter === "concluidos") {
        return ["paid", "delivered"].includes(status);
      }
      if (orderFilter === "cancelados") {
        return ["canceled", "cancelled", "refunded"].includes(status);
      }
      return true;
    });
  }, [orders, orderFilter]);

  const menuItems = [
    { key: "pedidos", label: "Pedidos", icon: Package },
    { key: "perfil", label: "Dados do perfil", icon: User },
    { key: "enderecos", label: "Endereços", icon: MapPin },
    { key: "trocas", label: "Notificações", icon: ShieldCheck },
    { key: "fidelidade", label: "Indicações", icon: Heart },
  ] as const;

  function updateProfileField(field: keyof ProfileFormState, value: string) {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleStartProfileEdit() {
    setProfileForm({
      full_name: profile?.full_name || "",
      email: profile?.email || authUser?.email || "",
      phone: profile?.phone || authUser?.phone || "",
      document: profile?.document || "",
      birth_date: profile?.birth_date || "",
    });
    setEditingProfile(true);
  }

  function handleCancelProfileEdit() {
    setProfileForm({
      full_name: profile?.full_name || "",
      email: profile?.email || authUser?.email || "",
      phone: profile?.phone || authUser?.phone || "",
      document: profile?.document || "",
      birth_date: profile?.birth_date || "",
    });
    setEditingProfile(false);
  }

  async function handleSaveProfile() {
    if (!profile?.id) return;

    try {
      setSavingProfile(true);
      setError(null);

      const payload = {
        full_name: profileForm.full_name.trim() || null,
        email: profileForm.email.trim().toLowerCase() || null,
        phone: cleanPhone(profileForm.phone) || null,
        document: cleanDigits(profileForm.document) || null,
        birth_date: profileForm.birth_date || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", profile.id)
        .select("id, user_id, full_name, email, phone, document, birth_date")
        .single();

      if (updateError) throw updateError;

      const nextProfile = data as CustomerProfile;
      setProfile(nextProfile);
      setProfileForm({
        full_name: nextProfile.full_name || "",
        email: nextProfile.email || "",
        phone: nextProfile.phone || "",
        document: nextProfile.document || "",
        birth_date: nextProfile.birth_date || "",
      });
      setEditingProfile(false);
    } catch (err: any) {
      setError(err?.message || "Não foi possível salvar seus dados.");
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: CALEA.bg }}>
      <Header />

      <main className="mx-auto w-full max-w-[1880px] px-5 pb-14 pt-4 md:px-6">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="pt-1">
            <h1
              className="mb-8 text-[44px] font-normal leading-none md:text-[52px]"
              style={{ color: CALEA.primary }}
            >
              Minha conta
            </h1>

            <div
              className="overflow-hidden rounded-[24px] border shadow-sm"
              style={{
                borderColor: CALEA.line,
                background: CALEA.soft,
              }}
            >
              {menuItems.map((item, index) => {
                const active = activeTab === item.key;
                const Icon = item.icon;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveTab(item.key)}
                    className={[
                      "flex w-full items-center gap-5 px-6 py-6 text-left text-[24px] transition",
                      active ? "bg-white" : "bg-transparent hover:bg-white/70",
                      index !== 0 ? "border-t" : "",
                    ].join(" ")}
                    style={{
                      borderColor: index !== 0 ? CALEA.line : undefined,
                    }}
                  >
                    <Icon size={28} strokeWidth={1.8} style={{ color: CALEA.primary }} />
                    <span style={{ color: CALEA.primary }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="pt-1">
            {loading ? (
              <div
                className="flex min-h-[320px] items-center justify-center rounded-[24px] border bg-white"
                style={{ borderColor: CALEA.line }}
              >
                <div className="flex items-center gap-3" style={{ color: CALEA.primary }}>
                  <Loader2 className="animate-spin" size={22} />
                  <span>Carregando...</span>
                </div>
              </div>
            ) : !authUser ? (
              <div
                className="rounded-[24px] border bg-white p-8"
                style={{ borderColor: CALEA.line }}
              >
                <h2 className="text-[36px]" style={{ color: CALEA.primary }}>
                  Faça login
                </h2>
                <p className="mt-3 text-lg" style={{ color: CALEA.textSoft }}>
                  Você precisa estar autenticada para acessar essa área.
                </p>
                <a
                  href="/login"
                  className="mt-6 inline-flex rounded-full px-6 py-3 text-base text-white"
                  style={{ background: CALEA.primary }}
                >
                  Ir para login
                </a>
              </div>
            ) : error ? (
              <div
                className="rounded-[24px] border bg-white p-8"
                style={{ borderColor: CALEA.line }}
              >
                <h2 className="text-[36px]" style={{ color: CALEA.primary }}>
                  Erro ao carregar
                </h2>
                <p className="mt-3 text-lg text-[#7b4545]">{error}</p>
              </div>
            ) : (
              <>
                {activeTab === "pedidos" && (
                  <div>
                    <h2
                      className="text-[44px] font-normal md:text-[52px]"
                      style={{ color: CALEA.primary }}
                    >
                      Pedidos
                    </h2>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <OrderFilterButton
                        active={orderFilter === "todos"}
                        onClick={() => setOrderFilter("todos")}
                      >
                        Todos
                      </OrderFilterButton>
                      <OrderFilterButton
                        active={orderFilter === "abertos"}
                        onClick={() => setOrderFilter("abertos")}
                      >
                        Abertos
                      </OrderFilterButton>
                      <OrderFilterButton
                        active={orderFilter === "concluidos"}
                        onClick={() => setOrderFilter("concluidos")}
                      >
                        Concluídos
                      </OrderFilterButton>
                      <OrderFilterButton
                        active={orderFilter === "cancelados"}
                        onClick={() => setOrderFilter("cancelados")}
                      >
                        Cancelados
                      </OrderFilterButton>
                    </div>

                    <div className="mt-10">
                      {filteredOrders.length === 0 ? (
                        <div
                          className="rounded-[24px] border bg-white px-8 py-12"
                          style={{ borderColor: CALEA.line }}
                        >
                          <h3 className="text-[28px]" style={{ color: CALEA.primary }}>
                            Nenhum pedido encontrado
                          </h3>
                          <p className="mt-2 text-lg" style={{ color: CALEA.textSoft }}>
                            Não há pedidos para o filtro selecionado.
                          </p>
                        </div>
                      ) : (
                        <div>
                          {filteredOrders.map((order, index) => (
                            <div
                              key={order.id}
                              className={[
                                "grid grid-cols-1 items-center gap-6 py-10 xl:grid-cols-[minmax(0,1fr)_260px_240px]",
                                index !== 0 ? "border-t" : "",
                              ].join(" ")}
                              style={{
                                borderColor: index !== 0 ? CALEA.line : undefined,
                              }}
                            >
                              <div>
                                <div
                                  className="text-[24px] md:text-[28px]"
                                  style={{ color: CALEA.primary }}
                                >
                                  {formatDateLong(order.created_at)}
                                  <span style={{ color: CALEA.textSoft }}>
                                    {" "}
                                    / {formatBRL(order.total_cents)}
                                  </span>
                                </div>

                                <p
                                  className="mt-6 text-[20px] md:text-[21px]"
                                  style={{ color: CALEA.textSoft }}
                                >
                                  Nº pedido: #{order.id.slice(0, 7)}
                                </p>

                                <div className="mt-6 flex flex-wrap items-center gap-4">
                                  <span
                                    className="text-[20px] md:text-[21px]"
                                    style={{ color: CALEA.textSoft }}
                                  >
                                    Status do pedido
                                  </span>
                                  <StatusPill status={order.status} />
                                </div>
                              </div>

                              <div className="flex items-center justify-start gap-3 xl:justify-center">
                                <ProductThumb />
                                {index % 2 === 1 ? <ProductThumb /> : null}
                              </div>

                              <div className="flex xl:justify-end">
                                <a
                                  href={`/conta/pedidos/${order.id}`}
                                  className="inline-flex min-h-[88px] min-w-[230px] items-center justify-center rounded-full border bg-white px-8 text-[22px] transition hover:bg-[#fcfaf6]"
                                  style={{
                                    borderColor: CALEA.accent,
                                    color: CALEA.primary,
                                  }}
                                >
                                  Ver pedido
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "perfil" && (
                  <div
                    className="rounded-[24px] border bg-white p-8"
                    style={{ borderColor: CALEA.line }}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <h2
                        className="text-[44px] font-normal md:text-[52px]"
                        style={{ color: CALEA.primary }}
                      >
                        Dados do perfil
                      </h2>

                      {!editingProfile ? (
                        <button
                          type="button"
                          onClick={handleStartProfileEdit}
                          className="inline-flex items-center gap-2 rounded-full border bg-white px-6 py-3 text-base transition hover:bg-[#fcfaf6]"
                          style={{
                            borderColor: CALEA.accent,
                            color: CALEA.primary,
                          }}
                        >
                          <Pencil size={16} />
                          Editar informações
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={handleCancelProfileEdit}
                            className="inline-flex rounded-full border bg-white px-6 py-3 text-base transition hover:bg-[#fafafa]"
                            style={{
                              borderColor: CALEA.line,
                              color: CALEA.primary,
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={savingProfile}
                            className="inline-flex rounded-full px-6 py-3 text-base text-white transition disabled:opacity-60"
                            style={{ background: CALEA.primary }}
                          >
                            {savingProfile ? "Salvando..." : "Salvar alterações"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <ProfileField
                        label="Nome completo"
                        value={profile?.full_name || "—"}
                        editing={editingProfile}
                        inputValue={profileForm.full_name}
                        onChange={(value) => updateProfileField("full_name", value)}
                        placeholder="Seu nome completo"
                      />

                      <ProfileField
                        label="E-mail"
                        value={profile?.email || authUser.email || "—"}
                        editing={editingProfile}
                        inputValue={profileForm.email}
                        onChange={(value) => updateProfileField("email", value)}
                        placeholder="voce@exemplo.com"
                        inputMode="email"
                      />

                      <ProfileField
                        label="Telefone"
                        value={maskPhone(profile?.phone || authUser.phone)}
                        editing={editingProfile}
                        inputValue={profileForm.phone}
                        onChange={(value) =>
                          updateProfileField("phone", formatPhoneInput(value))
                        }
                        placeholder="(11) 99999-9999"
                        inputMode="tel"
                      />

                      <ProfileField
                        label="CPF"
                        value={maskDocument(profile?.document)}
                        editing={editingProfile}
                        inputValue={profileForm.document}
                        onChange={(value) =>
                          updateProfileField("document", formatCpf(value))
                        }
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                      />

                      <ProfileField
                        label="Data de nascimento"
                        value={formatDate(profile?.birth_date)}
                        editing={editingProfile}
                        inputValue={profileForm.birth_date}
                        onChange={(value) => updateProfileField("birth_date", value)}
                        type="date"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "enderecos" && (
                  <div
                    className="rounded-[24px] border bg-white p-8"
                    style={{ borderColor: CALEA.line }}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <h2
                        className="text-[44px] font-normal md:text-[52px]"
                        style={{ color: CALEA.primary }}
                      >
                        Endereços
                      </h2>
                      <a
                        href="/checkout-identificacao"
                        className="inline-flex rounded-full border bg-white px-6 py-3 text-base"
                        style={{
                          borderColor: CALEA.accent,
                          color: CALEA.primary,
                        }}
                      >
                        Adicionar endereço
                      </a>
                    </div>

                    {addresses.length === 0 ? (
                      <p className="mt-8 text-lg" style={{ color: CALEA.textSoft }}>
                        Nenhum endereço cadastrado.
                      </p>
                    ) : (
                      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {addresses.map((address) => {
                          const lines = joinAddress(address);
                          return (
                            <div
                              key={address.id}
                              className="rounded-[18px] border p-5"
                              style={{
                                borderColor: CALEA.line,
                                background: CALEA.bg,
                              }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <h3
                                  className="text-xl"
                                  style={{ color: CALEA.primary }}
                                >
                                  {address.recipient_name || "Endereço cadastrado"}
                                </h3>
                                {address.is_default ? (
                                  <span
                                    className="rounded-full px-3 py-1 text-xs text-white"
                                    style={{ background: CALEA.primary }}
                                  >
                                    Principal
                                  </span>
                                ) : null}
                              </div>
                              <div
                                className="mt-4 space-y-1 text-base"
                                style={{ color: CALEA.textSoft }}
                              >
                                {lines.map((line, idx) => (
                                  <p key={idx}>{line}</p>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "trocas" && (
                  <div
                    className="rounded-[24px] border bg-white p-8"
                    style={{ borderColor: CALEA.line }}
                  >
                    <h2
                      className="text-[44px] font-normal md:text-[52px]"
                      style={{ color: CALEA.primary }}
                    >
                      Notificações
                    </h2>
                    <p className="mt-4 text-lg" style={{ color: CALEA.textSoft }}>
                      Área reservada para avisos da conta.
                    </p>
                  </div>
                )}

                {activeTab === "fidelidade" && (
                  <div
                    className="rounded-[24px] border bg-white p-8"
                    style={{ borderColor: CALEA.line }}
                  >
                    <h2
                      className="text-[44px] font-normal md:text-[52px]"
                      style={{ color: CALEA.primary }}
                    >
                      Indicações
                    </h2>
                    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <PlainInfoBox
                        label="Compras concluídas"
                        value={String(loyalty.totalOrders)}
                      />
                      <PlainInfoBox
                        label="Total investido"
                        value={formatBRL(loyalty.totalSpentCents)}
                      />
                      <PlainInfoBox
                        label="Última compra"
                        value={formatDate(loyalty.lastOrderDate)}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function OrderFilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "min-h-[76px] rounded-[24px] border px-8 text-[20px] transition md:text-[22px]",
        active
          ? "border-[#2b554e] bg-[#2b554e] text-white"
          : "border-[#e9e2d6] bg-[#f6f3ee] text-[#2b554e] hover:bg-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status?: string | null }) {
  const key = String(status || "").toLowerCase();
  const isDone = ["paid", "delivered"].includes(key);
  const isOpen = ["draft", "pending_payment", "processing", "shipped"].includes(key);
  const isCancelled = ["canceled", "cancelled", "refunded"].includes(key);

  let classes = "bg-[#f6f3ee] text-[#6f6558]";
  if (isDone) classes = "bg-[#e7f1ed] text-[#2b554e]";
  if (isOpen) classes = "bg-[#f8eddc] text-[#8b6a3e]";
  if (isCancelled) classes = "bg-[#f8e5e5] text-[#a35a5a]";

  return (
    <span className={`inline-flex rounded-[8px] px-4 py-2 text-[18px] leading-none ${classes}`}>
      {translateOrderStatus(status)}
    </span>
  );
}

function ProductThumb() {
  return (
    <div className="h-[132px] w-[132px] rounded-[18px] border border-[#e9e2d6] bg-[#f6f3ee]" />
  );
}

function PlainInfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#e9e2d6] bg-[#fcfaf6] p-5">
      <p className="text-sm text-[#b08d57]">{label}</p>
      <p className="mt-2 text-[20px] text-[#2b554e]">{value}</p>
    </div>
  );
}

function ProfileField({
  label,
  value,
  editing,
  inputValue,
  onChange,
  placeholder,
  inputMode,
  type = "text",
}: {
  label: string;
  value: string;
  editing?: boolean;
  inputValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: string;
}) {
  return (
    <div className="rounded-[18px] border border-[#e9e2d6] bg-[#fcfaf6] p-5">
      <p className="text-sm text-[#b08d57]">{label}</p>

      {editing ? (
        <input
          type={type}
          value={inputValue ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className="mt-3 h-12 w-full rounded-xl border border-[#e9e2d6] bg-white px-4 text-[18px] text-[#2b554e] outline-none transition focus:border-[#b08d57] focus:ring-2 focus:ring-[#b08d57]/15"
        />
      ) : (
        <p className="mt-2 text-[20px] text-[#2b554e]">{value}</p>
      )}
    </div>
  );
}

function formatDateLong(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatBRL(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((value ?? 0) / 100);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function cleanDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function cleanPhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

function formatPhoneInput(value?: string | null) {
  const digits = cleanPhone(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCpf(value?: string | null) {
  const digits = cleanDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function maskDocument(doc?: string | null) {
  if (!doc) return "—";
  const digits = doc.replace(/\D/g, "");
  if (digits.length !== 11) return doc;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function maskPhone(phone?: string | null) {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return phone;
}

function translateOrderStatus(status?: string | null) {
  const map: Record<string, string> = {
    draft: "Aberto",
    pending_payment: "Aberto",
    processing: "Aberto",
    shipped: "Aberto",
    paid: "Concluído",
    delivered: "Concluído",
    canceled: "Cancelado",
    cancelled: "Cancelado",
    refunded: "Cancelado",
  };
  return map[(status || "").toLowerCase()] || (status ? status : "—");
}

function joinAddress(address: Address) {
  const line1 = [address.street, address.number].filter(Boolean).join(", ");
  const line2 = [address.neighborhood, address.city, address.state]
    .filter(Boolean)
    .join(" • ");
  const zip = address.cep ? `CEP ${address.cep}` : "";
  return [line1, address.complement, line2, zip].filter(Boolean);
}