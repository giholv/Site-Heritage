import React, { useEffect, useMemo, useState } from "react";
import {
  User,
  Package,
  MapPin,
  ShieldCheck,
  Heart,
  Loader2,
  Pencil,
  ShoppingBag,
  ChevronRight,
  CreditCard,
  Truck,
} from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { supabase } from "../../lib/supabase";

type TabKey = "pedidos" | "perfil" | "enderecos" | "trocas" | "fidelidade";

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
  order_number: string | null;
  created_at: string;
  status: string | null;
  payment_status: string | null;
  subtotal_cents: number | null;
  shipping_cents: number | null;
  discount_cents: number | null;
  total_cents: number | null;
  payment_method: string | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  sku_id: string | null;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number | null;
  skus:
  | {
    id: string;
    variant_name: string | null;
    title: string | null;
    plating_type: string | null;
    products:
    | {
      id: string;
      name: string;
      slug: string;
    }
    | null;
    sku_images:
    | {
      id: string;
      path: string;
      alt: string | null;
      is_primary: boolean;
      sort_order: number;
    }[]
    | null;
  }
  | null;
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

  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
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
            setOrderItems({});
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

        const customerData = await getOrLinkCustomer(user);

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
        if (!customerData?.id) {
          if (mounted) {
            setOrders([]);
            setOrderItems({});
            setAddresses([]);
          }
          return;
        }

        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select(
            "id, order_number, created_at, status, payment_status, subtotal_cents, shipping_cents, discount_cents, total_cents, payment_method"
          )
          .eq("customer_id", customerData.id)
          .eq("payment_status", "paid")
          .eq("status", "paid")
          .order("created_at", { ascending: false });

        if (ordersError) throw ordersError;

        const nextOrders = (ordersData as Order[]) || [];

        if (mounted) setOrders(nextOrders);

        const orderIds = nextOrders.map((order) => order.id);

        if (orderIds.length > 0) {
          const { data: itemsData, error: itemsError } = await supabase
            .from("order_items")
            .select(`
                id,
                order_id,
                sku_id,
                unit_price_cents,
                quantity,
                line_total_cents,
                skus:sku_id (
                  id,
                  variant_name,
                  title,
                  plating_type,
                  products:product_id (
                    id,
                    name,
                    slug
                  ),
                  sku_images (
                    id,
                    path,
                    alt,
                    is_primary,
                    sort_order
                  )
                )
              `)
            .in("order_id", orderIds);

          if (!itemsError && mounted) {
            const normalizedItems = ((itemsData || []) as unknown as OrderItem[]);

            const grouped = normalizedItems.reduce(
              (acc, item) => {
                if (!acc[item.order_id]) acc[item.order_id] = [];
                acc[item.order_id].push(item);
                return acc;
              },
              {} as Record<string, OrderItem[]>
            );

            setOrderItems(grouped);
          }
        } else if (mounted) {
          setOrderItems({});
        }

        const { data: addressData, error: addressError } = await supabase
          .from("addresses")
          .select(
            "id, recipient_name, street, number, complement, neighborhood, city, state, cep, is_default"
          )
          .eq("customer_id", customerData.id)
          .order("is_default", { ascending: false });

        if (addressError) throw addressError;

        if (mounted) setAddresses((addressData as Address[]) || []);
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
    return orders;
  }, [orders]);



  const menuItems: Array<{
    key: TabKey;
    label: string;
    icon: React.ElementType;
  }> = [
      { key: "pedidos", label: "Pedidos", icon: Package },
      { key: "perfil", label: "Dados do perfil", icon: User },
      { key: "enderecos", label: "Endereços", icon: MapPin },
      { key: "trocas", label: "Notificações", icon: ShieldCheck },
      { key: "fidelidade", label: "Indicações", icon: Heart },
    ];

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
      phone: profile?.phone || "",
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
  async function getOrLinkCustomer(user: any) {
    const userEmail = String(user.email || "").trim().toLowerCase();

    if (!userEmail) return null;

    // 1. Primeiro tenta achar pelo usuário logado
    const { data: byUserId, error: byUserError } = await supabase
      .from("customers")
      .select("id, user_id, full_name, email, phone, document, birth_date")
      .eq("user_id", user.id)
      .maybeSingle();

    if (byUserError) throw byUserError;

    if (byUserId) return byUserId;

    // 2. Se não achou, tenta achar pelo mesmo e-mail usado na compra
    const { data: byEmail, error: byEmailError } = await supabase
      .from("customers")
      .select("id, user_id, full_name, email, phone, document, birth_date")
      .ilike("email", userEmail)
      .maybeSingle();

    if (byEmailError) throw byEmailError;

    // 3. Se achou cliente antigo sem user_id, vincula ao login atual
    if (byEmail?.id && !byEmail.user_id) {
      const { data: linkedCustomer, error: linkError } = await supabase
        .from("customers")
        .update({
          user_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", byEmail.id)
        .is("user_id", null)
        .select("id, user_id, full_name, email, phone, document, birth_date")
        .single();

      if (linkError) throw linkError;

      return linkedCustomer;
    }

    // 4. Se achou pelo email, mas já tem user_id, retorna
    if (byEmail?.id) return byEmail;

    // 5. Se não existe customer, cria um novo
    const { data: newCustomer, error: createError } = await supabase
      .from("customers")
      .insert({
        user_id: user.id,
        email: userEmail,
        full_name: user.user_metadata?.full_name || null,
        phone: user.phone || null,
      })
      .select("id, user_id, full_name, email, phone, document, birth_date")
      .single();

    if (createError) throw createError;

    return newCustomer;
  }
  return (
    <div className="min-h-screen" style={{ background: CALEA.bg }}>
      <Header />

      <main className="mx-auto w-full max-w-[1560px] px-4 pb-20 pt-[190px] md:px-8 md:pt-[220px]">
        <div className="mb-6 overflow-hidden rounded-[28px] border bg-white shadow-sm md:mb-8">
          <div
            className="grid gap-5 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8"
            style={{ borderColor: CALEA.line }}
          >
            <div>
              <p
                className="mb-3 text-xs font-semibold uppercase tracking-[0.22em]"
                style={{ color: CALEA.accent }}
              >
                Área do cliente
              </p>

              <h1
                className="text-[34px] font-normal leading-tight md:text-[48px]"
                style={{ color: CALEA.primary }}
              >
                Olá, {getFirstName(profile?.full_name) || "cliente"}.
              </h1>

              <p className="mt-3 max-w-2xl text-base md:text-lg" style={{ color: CALEA.textSoft }}>
                Acompanhe seus pedidos, dados cadastrais, endereços e histórico de compras.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <SummaryCard label="Pedidos pagos" value={String(orders.length)} />
              <SummaryCard label="Status" value="Pagos" />
              <SummaryCard label="Total" value={formatBRL(loyalty.totalSpentCents)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-24 xl:h-fit">
            <div
              className="flex gap-3 overflow-x-auto rounded-[24px] border p-2 xl:block xl:overflow-hidden xl:p-0"
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
                      "flex shrink-0 items-center gap-3 rounded-[18px] px-5 py-4 text-left text-sm transition xl:w-full xl:rounded-none xl:px-6 xl:py-5 xl:text-base",
                      active ? "bg-white shadow-sm" : "bg-transparent hover:bg-white/70",
                      index !== 0 ? "xl:border-t" : "",
                    ].join(" ")}
                    style={{
                      borderColor: index !== 0 ? CALEA.line : undefined,
                      color: CALEA.primary,
                    }}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section>
            {loading ? (
              <LoadingBox />
            ) : !authUser ? (
              <LoginRequired />
            ) : error ? (
              <ErrorBox error={error} />
            ) : (
              <>
                {activeTab === "pedidos" && (
                  <div>
                    <SectionHeader
                      title="Meus pedidos"
                      description="Veja os pedidos realizados e acompanhe o andamento da compra."
                    />


                    <div className="mt-6 space-y-4">
                      {filteredOrders.length === 0 ? (
                        <EmptyOrders />
                      ) : (
                        filteredOrders.map((order) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            items={orderItems[order.id] || []}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "perfil" && (
                  <div
                    className="rounded-[28px] border bg-white p-6 shadow-sm md:p-8"
                    style={{ borderColor: CALEA.line }}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <SectionTitle title="Dados do perfil" />

                      {!editingProfile ? (
                        <button
                          type="button"
                          onClick={handleStartProfileEdit}
                          className="inline-flex items-center justify-center gap-2 rounded-full border bg-white px-5 py-3 text-sm transition hover:bg-[#fcfaf6]"
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
                            className="inline-flex rounded-full border bg-white px-5 py-3 text-sm transition hover:bg-[#fafafa]"
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
                            className="inline-flex rounded-full px-5 py-3 text-sm text-white transition disabled:opacity-60"
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
                    className="rounded-[28px] border bg-white p-6 shadow-sm md:p-8"
                    style={{ borderColor: CALEA.line }}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <SectionTitle title="Endereços" />

                      <a
                        href="/checkout-identificacao"
                        className="inline-flex items-center justify-center rounded-full border bg-white px-5 py-3 text-sm"
                        style={{
                          borderColor: CALEA.accent,
                          color: CALEA.primary,
                        }}
                      >
                        Adicionar endereço
                      </a>
                    </div>

                    {addresses.length === 0 ? (
                      <p className="mt-8 text-base" style={{ color: CALEA.textSoft }}>
                        Nenhum endereço cadastrado.
                      </p>
                    ) : (
                      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {addresses.map((address) => {
                          const lines = joinAddress(address);

                          return (
                            <div
                              key={address.id}
                              className="rounded-[22px] border p-5"
                              style={{
                                borderColor: CALEA.line,
                                background: CALEA.bg,
                              }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <h3 className="text-lg" style={{ color: CALEA.primary }}>
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
                                className="mt-4 space-y-1 text-sm md:text-base"
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
                  <InfoPanel
                    title="Notificações"
                    description="Área reservada para avisos da conta, trocas, entregas e atualizações importantes."
                  />
                )}

                {activeTab === "fidelidade" && (
                  <div
                    className="rounded-[28px] border bg-white p-6 shadow-sm md:p-8"
                    style={{ borderColor: CALEA.line }}
                  >
                    <SectionTitle title="Indicações" />

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

function LoadingBox() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border bg-white">
      <div className="flex items-center gap-3 text-[#2b554e]">
        <Loader2 className="animate-spin" size={22} />
        <span>Carregando sua conta...</span>
      </div>
    </div>
  );
}

function LoginRequired() {
  return (
    <div className="rounded-[28px] border bg-white p-8 shadow-sm">
      <h2 className="text-[32px] font-normal text-[#2b554e]">Faça login</h2>

      <p className="mt-3 text-base text-[#6f6558]">
        Você precisa estar autenticada para acessar seus pedidos e dados da conta.
      </p>

      <a
        href="/login"
        className="mt-6 inline-flex rounded-full px-6 py-3 text-sm text-white"
        style={{ background: CALEA.primary }}
      >
        Ir para login
      </a>
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return (
    <div className="rounded-[28px] border bg-white p-8 shadow-sm">
      <h2 className="text-[32px] font-normal text-[#2b554e]">Erro ao carregar</h2>

      <p className="mt-3 text-base text-[#7b4545]">{error}</p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-[34px] font-normal leading-tight text-[#2b554e] md:text-[44px]">
        {title}
      </h2>

      <p className="mt-2 max-w-2xl text-base text-[#6f6558]">{description}</p>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="text-[32px] font-normal leading-tight text-[#2b554e] md:text-[42px]">
      {title}
    </h2>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border bg-[#FCFAF6] p-4" style={{ borderColor: CALEA.line }}>
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#b08d57]">
        {label}
      </p>

      <p className="mt-2 truncate text-lg font-medium text-[#2b554e] md:text-xl">
        {value}
      </p>
    </div>
  );
}

function OrderCard({ order, items }: { order: Order; items: OrderItem[] }) {
  const visibleItems = items.slice(0, 3);
  const moreItems = Math.max(items.length - visibleItems.length, 0);

  return (
    <article
      className="overflow-hidden rounded-[28px] border bg-white shadow-sm"
      style={{ borderColor: CALEA.line }}
    >
      <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={order.status} />

            <span className="text-sm text-[#6f6558]">
              {order.order_number || `Pedido #${order.id.slice(0, 8).toUpperCase()}`}
            </span>
          </div>

          <h3 className="mt-4 text-[24px] font-normal text-[#2b554e] md:text-[30px]">
            {formatBRL(order.total_cents)}
          </h3>

          <div className="mt-3 grid gap-2 text-sm text-[#6f6558] md:grid-cols-3">
            <span className="inline-flex items-center gap-2">
              <ShoppingBag size={16} />
              {formatDateLong(order.created_at)}
            </span>

            <span className="inline-flex items-center gap-2">
              <CreditCard size={16} />
              {translatePaymentMethod(order.payment_method)}
            </span>

            <span className="inline-flex items-center gap-2">
              <Truck size={16} />
              Frete {formatBRL(order.shipping_cents)}
            </span>
          </div>
        </div>

        <div className="flex items-center md:justify-end">
          <a
            href={`/conta/pedidos/${order.id}`}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border bg-white px-5 text-sm transition hover:bg-[#fcfaf6]"
            style={{
              borderColor: CALEA.accent,
              color: CALEA.primary,
            }}
          >
            Ver detalhes
            <ChevronRight size={16} />
          </a>
        </div>
      </div>

      <div className="border-t px-5 py-5 md:px-6" style={{ borderColor: CALEA.line }}>
        {items.length === 0 ? (
          <p className="text-sm text-[#6f6558]">
            Pedido encontrado. Os itens não foram retornados pela tabela de itens do pedido.
          </p>
        ) : (
          <div className="space-y-3">
            {visibleItems.map((item, index) => (
              <OrderItemRow key={item.id || `${item.order_id}-${index}`} item={item} />
            ))}

            {moreItems > 0 ? (
              <p className="pt-1 text-sm text-[#6f6558]">
                + {moreItems} item(ns) neste pedido
              </p>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

function OrderItemRow({ item }: { item: OrderItem }) {
  const image = getItemImage(item);
  const name = getItemName(item);
  const variant = getItemVariant(item);
  const qty = item.quantity || 1;
  const total = item.line_total_cents ?? item.unit_price_cents * qty;

  return (
    <div className="flex gap-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[16px] border bg-[#f6f3ee]">
        {image ? (
          <img src={image} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#b08d57]">
            <Package size={22} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-[#2b554e]">{name}</p>

        <p className="mt-1 text-sm text-[#6f6558]">
          {variant ? `${variant} • ` : ""}
          Qtd. {qty}
        </p>
      </div>

      <div className="text-right text-sm font-medium text-[#2b554e]">
        {formatBRL(total)}
      </div>
    </div>
  );
}

function EmptyOrders() {
  return (
    <div
      className="rounded-[28px] border bg-white px-6 py-12 text-center shadow-sm"
      style={{ borderColor: CALEA.line }}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f6f3ee] text-[#2b554e]">
        <Package size={26} />
      </div>

      <h3 className="mt-5 text-[24px] font-normal text-[#2b554e]">
        Nenhum pedido encontrado
      </h3>

      <p className="mx-auto mt-2 max-w-md text-base text-[#6f6558]">
        Quando a cliente finalizar uma compra, o pedido aparecerá aqui automaticamente.
      </p>

      <a
        href="/produtos"
        className="mt-6 inline-flex rounded-full px-6 py-3 text-sm text-white"
        style={{ background: CALEA.primary }}
      >
        Ver produtos
      </a>
    </div>
  );
}

function InfoPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className="rounded-[28px] border bg-white p-6 shadow-sm md:p-8"
      style={{ borderColor: CALEA.line }}
    >
      <SectionTitle title={title} />

      <p className="mt-4 text-base text-[#6f6558]">{description}</p>
    </div>
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
    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${classes}`}>
      {translateOrderStatus(status)}
    </span>
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
    <div className="rounded-[20px] border border-[#e9e2d6] bg-[#fcfaf6] p-5">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#b08d57]">
        {label}
      </p>

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
    <div className="rounded-[20px] border border-[#e9e2d6] bg-[#fcfaf6] p-5">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#b08d57]">
        {label}
      </p>

      {editing ? (
        <input
          type={type}
          value={inputValue ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className="mt-3 h-12 w-full rounded-xl border border-[#e9e2d6] bg-white px-4 text-base text-[#2b554e] outline-none transition focus:border-[#b08d57] focus:ring-2 focus:ring-[#b08d57]/15"
        />
      ) : (
        <p className="mt-2 text-lg text-[#2b554e]">{value}</p>
      )}
    </div>
  );
}

function getItemName(item: OrderItem) {
  return item.skus?.products?.name || item.skus?.title || "Produto";
}

function getItemVariant(item: OrderItem) {
  return item.skus?.variant_name || item.skus?.plating_type || "";
}

function getItemImage(item: OrderItem) {
  const images = item.skus?.sku_images || [];

  const primary =
    images.find((img) => img.is_primary) ||
    [...images].sort((a, b) => a.sort_order - b.sort_order)[0];

  if (!primary?.path) return "";

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(primary.path);

  return data.publicUrl;
}

function getFirstName(value?: string | null) {
  if (!value) return "";
  return value.trim().split(" ")[0];
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

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
    6,
    9
  )}-${digits.slice(9)}`;
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
    pending_payment: "Aguardando pagamento",
    processing: "Em separação",
    shipped: "Enviado",
    paid: "Pago",
    delivered: "Entregue",
    canceled: "Cancelado",
    cancelled: "Cancelado",
    refunded: "Reembolsado",
  };

  return map[(status || "").toLowerCase()] || (status ? status : "—");
}

function translatePaymentMethod(method?: string | null) {
  const map: Record<string, string> = {
    pix: "Pix",
    boleto: "Boleto",
    card: "Cartão",
    credit_card: "Cartão",
    debit_card: "Débito",
  };

  return map[(method || "").toLowerCase()] || method || "Pagamento";
}

function joinAddress(address: Address) {
  const line1 = [address.street, address.number].filter(Boolean).join(", ");

  const line2 = [address.neighborhood, address.city, address.state]
    .filter(Boolean)
    .join(" • ");

  const zip = address.cep ? `CEP ${address.cep}` : "";

  return [line1, address.complement, line2, zip].filter(Boolean);
}