import React, { useEffect, useState } from "react";
import {
  User,
  Package,
  MapPin,
  Bell,
  Heart,
  Loader2,
  Pencil,
  ChevronRight,
  Check,
  Copy,
  ArrowRight,
  X,
} from "lucide-react";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

/* =========================================================
   TIPOS
========================================================= */

type TabKey =
  | "pedidos"
  | "perfil"
  | "enderecos"
  | "notificacoes"
  | "indicacoes";

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
  fulfillment_status: string | null;
  shipping_status: string | null;

  tracking_code: string | null;
  tracking_url: string | null;
  carrier: string | null;

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

type ProfileFormState = {
  full_name: string;
  email: string;
  phone: string;
  document: string;
  birth_date: string;
};

/* =========================================================
   PÁGINA
========================================================= */

export default function ContaPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] =
    useState<TabKey>("pedidos");

  const [loading, setLoading] = useState(true);

  const [authUser, setAuthUser] =
    useState<AuthUser | null>(null);

  const [profile, setProfile] =
    useState<CustomerProfile | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);

  const [orderItems, setOrderItems] = useState<
    Record<string, OrderItem[]>
  >({});

  const [addresses, setAddresses] = useState<Address[]>([]);

  const [error, setError] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] =
    useState(false);

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [profileForm, setProfileForm] =
    useState<ProfileFormState>({
      full_name: "",
      email: "",
      phone: "",
      document: "",
      birth_date: "",
    });

  /* =======================================================
     CARREGAMENTO
  ======================================================= */

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

        const customerData =
          await getOrLinkCustomer(user);

        const nextProfile =
          (customerData as CustomerProfile | null) ||
          null;

        if (mounted) {
          setProfile(nextProfile);

          setProfileForm({
            full_name:
              nextProfile?.full_name || "",
            email:
              nextProfile?.email ||
              user.email ||
              "",
            phone:
              nextProfile?.phone ||
              user.phone ||
              "",
            document:
              nextProfile?.document || "",
            birth_date:
              nextProfile?.birth_date || "",
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

        /* -----------------------------------------------
           PEDIDOS

           Não filtramos status = paid.
           A conta deve continuar mostrando pedidos
           em preparação, envio e entrega.
        ------------------------------------------------ */

        const {
          data: ordersData,
          error: ordersError,
        } = await supabase
          .from("orders")
          .select(`
            id,
            order_number,
            created_at,

            status,
            payment_status,
            fulfillment_status,
            shipping_status,

            tracking_code,
            tracking_url,
            carrier,

            subtotal_cents,
            shipping_cents,
            discount_cents,
            total_cents,

            payment_method
          `)
          .eq("customer_id", customerData.id)
          .neq("status", "draft")
          .order("created_at", {
            ascending: false,
          });

        if (ordersError) throw ordersError;

        const nextOrders =
          (ordersData || []) as Order[];

        if (mounted) {
          setOrders(nextOrders);
        }

        /* -----------------------------------------------
           ITENS
        ------------------------------------------------ */

        const orderIds =
          nextOrders.map((order) => order.id);

        if (orderIds.length > 0) {
          const {
            data: itemsData,
            error: itemsError,
          } = await supabase
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

          if (itemsError) {
            console.error(
              "Erro ao carregar itens:",
              itemsError
            );
          } else if (mounted) {
            const normalized =
              (itemsData || []) as unknown as OrderItem[];

            const grouped =
              normalized.reduce(
                (acc, item) => {
                  if (!acc[item.order_id]) {
                    acc[item.order_id] = [];
                  }

                  acc[item.order_id].push(item);

                  return acc;
                },
                {} as Record<
                  string,
                  OrderItem[]
                >
              );

            setOrderItems(grouped);
          }
        } else if (mounted) {
          setOrderItems({});
        }

        /* -----------------------------------------------
           ENDEREÇOS
        ------------------------------------------------ */

        const {
          data: addressData,
          error: addressError,
        } = await supabase
          .from("addresses")
          .select(`
            id,
            recipient_name,
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            cep,
            is_default
          `)
          .eq(
            "customer_id",
            customerData.id
          )
          .order("is_default", {
            ascending: false,
          });

        if (addressError) {
          throw addressError;
        }

        if (mounted) {
          const normalizedAddresses =
            (addressData || []) as Address[];

          setAddresses(
            removeDuplicateAddresses(normalizedAddresses)
          );
        }
      } catch (err: any) {
        console.error(
          "Erro ao carregar conta:",
          err
        );

        if (mounted) {
          setError(
            err?.message ||
            "Não foi possível carregar sua conta."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     PERFIL
  ======================================================= */

  function updateProfileField(
    field: keyof ProfileFormState,
    value: string
  ) {
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startProfileEdit() {
    setProfileForm({
      full_name:
        profile?.full_name || "",
      email:
        profile?.email ||
        authUser?.email ||
        "",
      phone:
        profile?.phone ||
        authUser?.phone ||
        "",
      document:
        profile?.document || "",
      birth_date:
        profile?.birth_date || "",
    });

    setEditingProfile(true);
  }

  function cancelProfileEdit() {
    setProfileForm({
      full_name:
        profile?.full_name || "",
      email:
        profile?.email ||
        authUser?.email ||
        "",
      phone:
        profile?.phone ||
        authUser?.phone ||
        "",
      document:
        profile?.document || "",
      birth_date:
        profile?.birth_date || "",
    });

    setEditingProfile(false);
  }

  async function saveProfile() {
    if (!profile?.id) return;

    try {
      setSavingProfile(true);
      setError(null);

      const payload = {
        full_name:
          profileForm.full_name.trim() ||
          null,

        email:
          profileForm.email
            .trim()
            .toLowerCase() || null,

        phone:
          cleanPhone(profileForm.phone) ||
          null,

        document:
          cleanDigits(
            profileForm.document
          ) || null,

        birth_date:
          profileForm.birth_date ||
          null,

        updated_at:
          new Date().toISOString(),
      };

      const {
        data,
        error: updateError,
      } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", profile.id)
        .select(`
          id,
          user_id,
          full_name,
          email,
          phone,
          document,
          birth_date
        `)
        .single();

      if (updateError) {
        throw updateError;
      }

      setProfile(
        data as CustomerProfile
      );

      setEditingProfile(false);
    } catch (err: any) {
      setError(
        err?.message ||
        "Não foi possível salvar seus dados."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  /* =======================================================
     CLIENTE
  ======================================================= */

  async function getOrLinkCustomer(
    user: any
  ) {
    const email = String(
      user.email || ""
    )
      .trim()
      .toLowerCase();

    if (!email) return null;

    const {
      data: byUser,
      error: byUserError,
    } = await supabase
      .from("customers")
      .select(`
        id,
        user_id,
        full_name,
        email,
        phone,
        document,
        birth_date
      `)
      .eq("user_id", user.id)
      .maybeSingle();

    if (byUserError) {
      throw byUserError;
    }

    if (byUser) {
      return byUser;
    }

    const {
      data: byEmail,
      error: byEmailError,
    } = await supabase
      .from("customers")
      .select(`
        id,
        user_id,
        full_name,
        email,
        phone,
        document,
        birth_date
      `)
      .ilike("email", email)
      .maybeSingle();

    if (byEmailError) {
      throw byEmailError;
    }

    if (
      byEmail?.id &&
      !byEmail.user_id
    ) {
      const {
        data: linked,
        error: linkError,
      } = await supabase
        .from("customers")
        .update({
          user_id: user.id,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", byEmail.id)
        .is("user_id", null)
        .select(`
          id,
          user_id,
          full_name,
          email,
          phone,
          document,
          birth_date
        `)
        .single();

      if (linkError) {
        throw linkError;
      }

      return linked;
    }

    if (byEmail) {
      return byEmail;
    }

    const {
      data: created,
      error: createError,
    } = await supabase
      .from("customers")
      .insert({
        user_id: user.id,
        email,
        full_name:
          user.user_metadata
            ?.full_name || null,
        phone:
          user.phone || null,
      })
      .select(`
        id,
        user_id,
        full_name,
        email,
        phone,
        document,
        birth_date
      `)
      .single();

    if (createError) {
      throw createError;
    }

    return created;
  }

  /* =======================================================
     NAVEGAÇÃO
  ======================================================= */

  const menuItems: Array<{
    key: TabKey;
    label: string;
    icon: React.ElementType;
  }> = [
      {
        key: "pedidos",
        label: "Pedidos",
        icon: Package,
      },
      {
        key: "perfil",
        label: "Perfil",
        icon: User,
      },
      {
        key: "enderecos",
        label: "Endereços",
        icon: MapPin,
      },
      {
        key: "notificacoes",
        label: "Notificações",
        icon: Bell,
      },
      {
        key: "indicacoes",
        label: "Indicações",
        icon: Heart,
      },
    ];

  const latestOrder = orders[0];

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#FCFAF6]">
      <Header />

      <main className="mx-auto w-full max-w-[1380px] px-4 pb-24 pt-[118px] sm:px-6 md:px-8 md:pt-[150px] lg:px-10">
        {loading ? (
          <LoadingState />
        ) : !authUser ? (
          <LoginRequired />
        ) : error ? (
          <ErrorState error={error} />
        ) : (
          <>
            {/* ============================================
                INTRO
            ============================================ */}

            <section className="border-b border-[#2b554e]/10 pb-8 md:pb-10">
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#b08d57]">
                Minha Caléa
              </p>

              <h1 className="mt-3 font-serif text-[38px] font-normal leading-[0.98] tracking-[-0.035em] text-[#2b554e] sm:text-[46px] md:text-[54px]">
                Olá,{" "}
                {getFirstName(
                  profile?.full_name
                ) || "cliente"}.
              </h1>

              <p className="mt-4 max-w-[560px] text-sm leading-6 text-[#6f6558] sm:text-base">
                Acompanhe seus pedidos e
                cuide dos seus dados em
                um só lugar.
              </p>
            </section>

            {/* ============================================
                PEDIDO MAIS RECENTE
            ============================================ */}

            {latestOrder && (
              <LatestOrder
                order={latestOrder}
                items={
                  orderItems[
                  latestOrder.id
                  ] || []
                }
                onOpen={() =>
                  navigate(
                    `/minha-conta/pedidos/${latestOrder.id}`
                  )
                }
              />
            )}

            {/* ============================================
                NAVEGAÇÃO
            ============================================ */}

            <nav className="border-b border-[#2b554e]/10">
              <div className="flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {menuItems.map(
                  (item) => {
                    const Icon =
                      item.icon;

                    const active =
                      activeTab ===
                      item.key;

                    return (
                      <button
                        key={
                          item.key
                        }
                        type="button"
                        onClick={() =>
                          setActiveTab(
                            item.key
                          )
                        }
                        className={[
                          "relative flex shrink-0 items-center gap-2 py-5 text-xs transition sm:text-sm",
                          active
                            ? "text-[#2b554e]"
                            : "text-[#6f6558] hover:text-[#2b554e]",
                        ].join(
                          " "
                        )}
                      >
                        <Icon
                          size={17}
                          strokeWidth={
                            1.7
                          }
                        />

                        {
                          item.label
                        }

                        {active && (
                          <span className="absolute inset-x-0 bottom-0 h-px bg-[#2b554e]" />
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </nav>

            {/* ============================================
                CONTEÚDO
            ============================================ */}

            <section className="pt-8 md:pt-10">
              {activeTab ===
                "pedidos" && (
                  <OrdersSection
                    orders={orders}
                    orderItems={
                      orderItems
                    }
                  />
                )}

              {activeTab ===
                "perfil" && (
                  <ProfileSection
                    profile={
                      profile
                    }
                    authUser={
                      authUser
                    }
                    editing={
                      editingProfile
                    }
                    saving={
                      savingProfile
                    }
                    form={
                      profileForm
                    }
                    onEdit={
                      startProfileEdit
                    }
                    onCancel={
                      cancelProfileEdit
                    }
                    onSave={
                      saveProfile
                    }
                    onChange={
                      updateProfileField
                    }
                  />
                )}

              {activeTab ===
                "enderecos" && (
                  <AddressesSection
                    addresses={
                      addresses
                    }
                  />
                )}

              {activeTab ===
                "notificacoes" && (
                  <NotificationsSection />
                )}

              {activeTab ===
                "indicacoes" && (
                  <ReferralPanel
                    profile={
                      profile
                    }
                    authUser={
                      authUser
                    }
                  />
                )}
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

/* =========================================================
   PEDIDO MAIS RECENTE
========================================================= */

function LatestOrder({
  order,
  items,
  onOpen,
}: {
  order: Order;
  items: OrderItem[];
  onOpen: () => void;
}) {
  const firstItem = items[0];

  const image = firstItem
    ? getItemImage(firstItem)
    : "";

  return (
    <section className="border-b border-[#2b554e]/10 py-8 md:py-10">
      <div className="grid gap-6 sm:grid-cols-[92px_minmax(0,1fr)] md:grid-cols-[110px_minmax(0,1fr)_auto] md:items-center">
        <div className="aspect-[3/4] w-[88px] overflow-hidden bg-[#f1ede6] sm:w-[92px] md:w-[110px]">
          {image ? (
            <img
              src={image}
              alt={
                firstItem
                  ? getItemName(
                    firstItem
                  )
                  : "Pedido"
              }
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#b08d57]">
              <Package
                size={23}
                strokeWidth={1.5}
              />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-[0.19em] text-[#b08d57]">
            Pedido mais recente
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 className="font-serif text-[26px] font-normal text-[#2b554e] md:text-[30px]">
              {order.order_number ||
                `Pedido #${order.id
                  .slice(0, 8)
                  .toUpperCase()}`}
            </h2>

            <OrderState
              order={order}
            />
          </div>

          <p className="mt-2 text-xs text-[#6f6558]">
            {formatDateLong(
              order.created_at
            )}
          </p>

          {firstItem && (
            <p className="mt-4 text-sm text-[#2b554e]">
              {getItemName(
                firstItem
              )}

              {items.length > 1 &&
                ` + ${items.length -
                1
                } ${items.length -
                  1 ===
                  1
                  ? "item"
                  : "itens"
                }`}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="col-span-full inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[#2b554e] px-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#214b44] md:col-span-1"
        >
          Ver pedido
          <ChevronRight
            size={14}
          />
        </button>
      </div>
    </section>
  );
}

/* =========================================================
   PEDIDOS
========================================================= */

function OrdersSection({
  orders,
  orderItems,
}: {
  orders: Order[];
  orderItems: Record<
    string,
    OrderItem[]
  >;
}) {
  return (
    <div>
      <SectionHeader
        eyebrow="Seus pedidos"
        title="Histórico de compras"
        description="Veja seus pedidos e acompanhe cada etapa da entrega."
      />

      {orders.length === 0 ? (
        <EmptyOrders />
      ) : (
        <div className="mt-7">
          {orders.map(
            (order) => (
              <OrderCard
                key={order.id}
                order={order}
                items={
                  orderItems[
                  order.id
                  ] || []
                }
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  items,
}: {
  order: Order;
  items: OrderItem[];
}) {
  const navigate = useNavigate();

  const firstItem = items[0];

  const image = firstItem
    ? getItemImage(firstItem)
    : "";

  return (
    <article className="border-b border-[#2b554e]/10 py-6 first:pt-0 md:py-7">
      <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:items-center sm:gap-6">
        <div className="aspect-[3/4] overflow-hidden bg-[#f1ede6]">
          {image ? (
            <img
              src={image}
              alt={
                firstItem
                  ? getItemName(
                    firstItem
                  )
                  : "Pedido"
              }
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#b08d57]">
              <Package
                size={20}
              />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <OrderState
              order={order}
            />

            <span className="text-[11px] text-[#6f6558]">
              {order.order_number ||
                `Pedido #${order.id
                  .slice(0, 8)
                  .toUpperCase()}`}
            </span>
          </div>

          <p className="mt-2 text-xs text-[#6f6558]">
            {formatDateLong(
              order.created_at
            )}
          </p>

          {firstItem && (
            <p className="mt-3 truncate text-sm font-medium text-[#2b554e]">
              {getItemName(
                firstItem
              )}

              {items.length > 1 &&
                ` + ${items.length -
                1
                }`}
            </p>
          )}

          <p className="mt-2 font-serif text-[21px] text-[#2b554e]">
            {formatBRL(
              order.total_cents
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(
              `/minha-conta/pedidos/${order.id}`
            )
          }
          className="col-span-2 flex items-center justify-between border-t border-[#2b554e]/10 pt-4 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#2b554e] sm:col-span-1 sm:border-0 sm:pt-0"
        >
          Ver pedido
          <ChevronRight
            size={14}
          />
        </button>
      </div>
    </article>
  );
}

/* =========================================================
   PERFIL
========================================================= */

function ProfileSection({
  profile,
  authUser,
  editing,
  saving,
  form,
  onEdit,
  onCancel,
  onSave,
  onChange,
}: {
  profile: CustomerProfile | null;
  authUser: AuthUser;
  editing: boolean;
  saving: boolean;
  form: ProfileFormState;

  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;

  onChange: (
    field: keyof ProfileFormState,
    value: string
  ) => void;
}) {
  return (
    <div>
      <div className="flex flex-col gap-5 border-b border-[#2b554e]/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          eyebrow="Sua conta"
          title="Dados pessoais"
          description="Mantenha suas informações atualizadas para facilitar suas próximas compras."
        />

        {!editing ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#2b554e]/15 px-5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#2b554e]"
          >
            <Pencil
              size={14}
            />
            Editar
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#6f6558]"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#2b554e] px-5 text-[10px] font-semibold uppercase tracking-[0.13em] text-white disabled:opacity-50"
            >
              {saving
                ? "Salvando"
                : "Salvar"}
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 md:gap-x-12">
        <ProfileField
          label="Nome completo"
          value={
            profile?.full_name ||
            "Não informado"
          }
          editing={editing}
          inputValue={
            form.full_name
          }
          onChange={(value) =>
            onChange(
              "full_name",
              value
            )
          }
        />

        <ProfileField
          label="E-mail"
          value={
            profile?.email ||
            authUser.email ||
            "Não informado"
          }
          editing={editing}
          inputValue={
            form.email
          }
          onChange={(value) =>
            onChange(
              "email",
              value
            )
          }
          inputMode="email"
        />

        <ProfileField
          label="Telefone"
          value={maskPhone(
            profile?.phone ||
            authUser.phone
          )}
          editing={editing}
          inputValue={
            form.phone
          }
          onChange={(value) =>
            onChange(
              "phone",
              formatPhoneInput(
                value
              )
            )
          }
          inputMode="tel"
        />

        <ProfileField
          label="CPF"
          value={maskDocument(
            profile?.document
          )}
          editing={editing}
          inputValue={
            form.document
          }
          onChange={(value) =>
            onChange(
              "document",
              formatCpf(value)
            )
          }
          inputMode="numeric"
        />

        <ProfileField
          label="Data de nascimento"
          value={formatDate(
            profile?.birth_date
          )}
          editing={editing}
          inputValue={
            form.birth_date
          }
          onChange={(value) =>
            onChange(
              "birth_date",
              value
            )
          }
          type="date"
        />
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  editing,
  inputValue,
  onChange,
  inputMode,
  type = "text",
}: {
  label: string;
  value: string;

  editing?: boolean;
  inputValue?: string;

  onChange?: (
    value: string
  ) => void;

  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];

  type?: string;
}) {
  return (
    <div className="border-b border-[#2b554e]/10 py-6">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#b08d57]">
        {label}
      </p>

      {editing ? (
        <input
          type={type}
          value={
            inputValue ?? ""
          }
          onChange={(event) =>
            onChange?.(
              event.target
                .value
            )
          }
          inputMode={
            inputMode
          }
          className="mt-3 h-11 w-full border-b border-[#2b554e]/25 bg-transparent text-[15px] text-[#2b554e] outline-none transition focus:border-[#b08d57]"
        />
      ) : (
        <p className="mt-2 text-[15px] text-[#2b554e] sm:text-base">
          {value}
        </p>
      )}
    </div>
  );
}

/* =========================================================
   ENDEREÇOS
========================================================= */

function AddressesSection({
  addresses,
}: {
  addresses: Address[];
}) {
  return (
    <div>
      <div className="flex flex-col gap-5 border-b border-[#2b554e]/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          eyebrow="Entrega"
          title="Seus endereços"
          description="Endereços utilizados nas suas compras."
        />

        <a
          href="/checkout-identificacao"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#2b554e]/15 px-5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#2b554e]"
        >
          Adicionar
          <ArrowRight
            size={14}
          />
        </a>
      </div>

      {addresses.length ===
        0 ? (
        <div className="py-12">
          <p className="font-serif text-[24px] text-[#2b554e]">
            Nenhum endereço
            cadastrado.
          </p>

          <p className="mt-2 text-sm text-[#6f6558]">
            Adicione um endereço
            quando quiser.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 md:gap-x-12">
          {addresses.map(
            (address) => (
              <AddressRow
                key={
                  address.id
                }
                address={
                  address
                }
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function AddressRow({
  address,
}: {
  address: Address;
}) {
  const lines =
    joinAddress(address);

  return (
    <div className="border-b border-[#2b554e]/10 py-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-serif text-[21px] text-[#2b554e]">
          {address.recipient_name ||
            "Endereço"}
        </h3>

        {address.is_default && (
          <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#b08d57]">
            Principal
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1 text-sm leading-5 text-[#6f6558]">
        {lines.map(
          (line, index) => (
            <p key={index}>
              {line}
            </p>
          )
        )}
      </div>
    </div>
  );
}

/* =========================================================
   NOTIFICAÇÕES
========================================================= */

function NotificationsSection() {
  return (
    <div>
      <SectionHeader
        eyebrow="Atualizações"
        title="Notificações"
        description="Avisos importantes sobre seus pedidos e sua conta."
      />

      <div className="mt-8 border-y border-[#2b554e]/10 py-10">
        <Bell
          size={20}
          className="text-[#b08d57]"
        />

        <p className="mt-4 font-serif text-[24px] text-[#2b554e]">
          Tudo certo por aqui.
        </p>

        <p className="mt-2 max-w-md text-sm leading-6 text-[#6f6558]">
          Quando houver uma
          atualização importante,
          ela aparecerá aqui.
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   INDICAÇÕES
========================================================= */

function ReferralPanel({
  profile,
  authUser,
}: {
  profile: CustomerProfile | null;
  authUser: AuthUser | null;
}) {
  const [copied, setCopied] = useState(false);
  const [savingCoupon, setSavingCoupon] = useState(true);
  const [couponReady, setCouponReady] = useState(false);
  const [couponCode, setCouponCode] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadReferralCoupon() {
      if (!profile?.id || !authUser?.id) {
        if (mounted) {
          setSavingCoupon(false);
        }

        return;
      }

      try {
        setSavingCoupon(true);
        setCouponReady(false);

        const { data, error } = await supabase.rpc(
          "ensure_referral_coupon"
        );

        if (error) {
          throw error;
        }

        const result = Array.isArray(data)
          ? data[0]
          : data;

        if (!mounted) return;

        if (result?.code) {
          setCouponCode(result.code);
          setCouponReady(true);
        } else {
          setCouponCode("");
          setCouponReady(false);
        }
      } catch (error) {
        console.error(
          "Erro ao carregar cupom de indicação:",
          error
        );

        if (mounted) {
          setCouponCode("");
          setCouponReady(false);
        }
      } finally {
        if (mounted) {
          setSavingCoupon(false);
        }
      }
    }

    loadReferralCoupon();

    return () => {
      mounted = false;
    };
  }, [profile?.id, authUser?.id]);

  async function copyCoupon() {
    if (!couponCode) return;

    await navigator.clipboard.writeText(couponCode);

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Compartilhe"
        title="Indique a Caléa"
        description="Compartilhe seu código com alguém especial."
      />

      <div className="mt-8 grid gap-10 border-t border-[#2b554e]/10 pt-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#b08d57]">
            Seu código
          </p>

          <div className="mt-3 flex flex-col gap-4 border-b border-[#2b554e]/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-serif text-[32px] tracking-[0.04em] text-[#2b554e] sm:text-[40px]">
              {savingCoupon
                ? "..."
                : couponCode || "Indisponível"}
            </span>

            <button
              type="button"
              onClick={copyCoupon}
              disabled={!couponReady || savingCoupon}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#2b554e] px-6 text-[9px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#214b44] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copied ? (
                <>
                  <Check size={13} />
                  Copiado
                </>
              ) : (
                <>
                  <Copy size={13} />
                  Copiar
                </>
              )}
            </button>
          </div>

          <p className="mt-4 text-xs text-[#6f6558]">
            {savingCoupon
              ? "Preparando seu código..."
              : couponReady
                ? "Seu código está pronto para compartilhar."
                : "Não foi possível carregar seu código agora."}
          </p>
        </div>

        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#b08d57]">
            Como funciona
          </p>

          <div className="mt-4 space-y-4 text-sm leading-6 text-[#6f6558]">
            <p>01. Compartilhe seu código.</p>
            <p>02. A pessoa utiliza no checkout.</p>
            <p>
              03. Na primeira compra elegível, o benefício
              é aplicado automaticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STATUS
========================================================= */

function OrderState({
  order,
}: {
  order: Order;
}) {
  const label =
    getCustomerOrderStatus(
      order
    );

  const shipping =
    String(
      order.shipping_status ||
      ""
    ).toLowerCase();

  const isDelivered =
    shipping === "delivered" ||
    order.status ===
    "delivered";

  const isTransit = [
    "posted",
    "in_transit",
  ].includes(shipping);

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em]",
        isDelivered ||
          isTransit
          ? "text-[#2b554e]"
          : "text-[#b08d57]",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          isDelivered ||
            isTransit
            ? "bg-[#2b554e]"
            : "bg-[#b08d57]",
        ].join(" ")}
      />

      {label}
    </span>
  );
}

function getCustomerOrderStatus(
  order: Order
) {
  const shipping =
    String(
      order.shipping_status ||
      ""
    ).toLowerCase();

  const fulfillment =
    String(
      order.fulfillment_status ||
      ""
    ).toLowerCase();

  const payment =
    String(
      order.payment_status ||
      ""
    ).toLowerCase();

  if (
    shipping ===
    "delivered"
  ) {
    return "Entregue";
  }

  if (
    shipping ===
    "in_transit"
  ) {
    return "A caminho";
  }

  if (
    shipping === "posted"
  ) {
    return "Postado";
  }

  if (
    shipping ===
    "awaiting_post"
  ) {
    return "Pronto para envio";
  }

  if (
    [
      "picking",
      "packed",
      "ready_to_ship",
    ].includes(fulfillment)
  ) {
    return "Preparando";
  }

  if (
    payment === "paid"
  ) {
    return "Confirmado";
  }

  return translateOrderStatus(
    order.status
  );
}

/* =========================================================
   ESTADOS DA PÁGINA
========================================================= */

function LoadingState() {
  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <div className="flex items-center gap-3 text-[#2b554e]">
        <Loader2
          className="animate-spin"
          size={20}
        />

        <span className="text-sm">
          Carregando sua
          conta...
        </span>
      </div>
    </div>
  );
}

function LoginRequired() {
  return (
    <div className="border-y border-[#2b554e]/10 py-16 text-center">
      <User
        size={24}
        className="mx-auto text-[#b08d57]"
      />

      <h2 className="mt-5 font-serif text-[30px] text-[#2b554e]">
        Acesse sua conta
      </h2>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#6f6558]">
        Entre para acompanhar
        seus pedidos e seus
        dados.
      </p>

      <a
        href="/login"
        className="mt-7 inline-flex rounded-full bg-[#2b554e] px-7 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white"
      >
        Entrar
      </a>
    </div>
  );
}

function ErrorState({
  error,
}: {
  error: string;
}) {
  return (
    <div className="border-y border-[#2b554e]/10 py-16 text-center">
      <X
        size={24}
        className="mx-auto text-[#9c5555]"
      />

      <h2 className="mt-5 font-serif text-[30px] text-[#2b554e]">
        Não conseguimos
        carregar sua conta
      </h2>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#6f6558]">
        {error}
      </p>
    </div>
  );
}

function EmptyOrders() {
  return (
    <div className="border-y border-[#2b554e]/10 py-12">
      <Package
        size={22}
        className="text-[#b08d57]"
      />

      <h3 className="mt-4 font-serif text-[26px] text-[#2b554e]">
        Nenhum pedido por
        aqui ainda.
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-[#6f6558]">
        Quando você fizer uma
        compra, ela aparecerá
        aqui.
      </p>

      <a
        href="/joias"
        className="mt-6 inline-flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-[#2b554e]"
      >
        Ver semijoias

        <ArrowRight
          size={14}
        />
      </a>
    </div>
  );
}

/* =========================================================
   TÍTULOS
========================================================= */

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#b08d57]">
        {eyebrow}
      </p>

      <h2 className="mt-2 font-serif text-[30px] font-normal leading-tight tracking-[-0.025em] text-[#2b554e] sm:text-[36px] md:text-[42px]">
        {title}
      </h2>

      <p className="mt-3 max-w-[620px] text-sm leading-6 text-[#6f6558]">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   PRODUTOS
========================================================= */

function getItemName(
  item: OrderItem
) {
  return (
    item.skus?.products
      ?.name ||
    item.skus?.title ||
    "Produto"
  );
}

function getItemImage(
  item: OrderItem
) {
  const images =
    item.skus?.sku_images ||
    [];

  const primary =
    images.find(
      (image) =>
        image.is_primary
    ) ||
    [...images].sort(
      (a, b) =>
        Number(
          a.sort_order ?? 0
        ) -
        Number(
          b.sort_order ?? 0
        )
    )[0];

  if (!primary?.path) {
    return "";
  }

  const { data } =
    supabase.storage
      .from(
        "product-images"
      )
      .getPublicUrl(
        primary.path
      );

  return data.publicUrl;
}

/* =========================================================
   FORMATADORES
========================================================= */

function formatBRL(
  value?: number | null
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(
    (value ?? 0) / 100
  );
}

function formatDateLong(
  value?: string | null
) {
  if (!value) return "—";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return "Não informado";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Não informado";
  }

  return date.toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

function getFirstName(
  value?: string | null
) {
  if (!value) return "";

  return value
    .trim()
    .split(" ")[0];
}

/* =========================================================
   CPF / TELEFONE
========================================================= */

function cleanDigits(
  value?: string | null
) {
  return String(
    value || ""
  ).replace(/\D/g, "");
}

function cleanPhone(
  value?: string | null
) {
  return cleanDigits(
    value
  ).slice(0, 11);
}

function formatPhoneInput(
  value?: string | null
) {
  const digits =
    cleanPhone(value);

  if (
    digits.length <= 2
  ) {
    return digits;
  }

  if (
    digits.length <= 6
  ) {
    return `(${digits.slice(
      0,
      2
    )}) ${digits.slice(2)}`;
  }

  if (
    digits.length <= 10
  ) {
    return `(${digits.slice(
      0,
      2
    )}) ${digits.slice(
      2,
      6
    )}-${digits.slice(6)}`;
  }

  return `(${digits.slice(
    0,
    2
  )}) ${digits.slice(
    2,
    7
  )}-${digits.slice(7)}`;
}

function formatCpf(
  value?: string | null
) {
  const digits =
    cleanDigits(
      value
    ).slice(0, 11);

  if (
    digits.length <= 3
  ) {
    return digits;
  }

  if (
    digits.length <= 6
  ) {
    return `${digits.slice(
      0,
      3
    )}.${digits.slice(3)}`;
  }

  if (
    digits.length <= 9
  ) {
    return `${digits.slice(
      0,
      3
    )}.${digits.slice(
      3,
      6
    )}.${digits.slice(6)}`;
  }

  return `${digits.slice(
    0,
    3
  )}.${digits.slice(
    3,
    6
  )}.${digits.slice(
    6,
    9
  )}-${digits.slice(9)}`;
}

function maskDocument(
  value?: string | null
) {
  if (!value) {
    return "Não informado";
  }

  return formatCpf(value);
}

function maskPhone(
  value?: string | null
) {
  if (!value) {
    return "Não informado";
  }

  return formatPhoneInput(
    value
  );
}

/* =========================================================
   STATUS
========================================================= */

function translateOrderStatus(
  status?: string | null
) {
  const map: Record<
    string,
    string
  > = {
    pending_payment:
      "Aguardando pagamento",

    paid: "Confirmado",

    processing:
      "Preparando",

    shipped: "Enviado",

    delivered:
      "Entregue",

    canceled:
      "Cancelado",

    cancelled:
      "Cancelado",

    refunded:
      "Reembolsado",
  };

  return (
    map[
    String(
      status || ""
    ).toLowerCase()
    ] ||
    status ||
    "—"
  );
}

/* =========================================================
   ENDEREÇO
========================================================= */

function normalizeAddressPart(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function getAddressKey(address: Address) {
  return [
    normalizeAddressPart(address.cep).replace(/\D/g, ""),
    normalizeAddressPart(address.street),
    normalizeAddressPart(address.number),
    normalizeAddressPart(address.complement),
    normalizeAddressPart(address.neighborhood),
    normalizeAddressPart(address.city),
    normalizeAddressPart(address.state),
  ].join("|");
}

function removeDuplicateAddresses(addresses: Address[]) {
  const map = new Map<string, Address>();

  addresses.forEach((address) => {
    const key = getAddressKey(address);

    const existing = map.get(key);

    // Se existir duplicado, prioriza o marcado como principal
    if (!existing || address.is_default) {
      map.set(key, address);
    }
  });

  return Array.from(map.values());
}

function joinAddress(
  address: Address
) {
  const line1 = [
    address.street,
    address.number,
  ]
    .filter(Boolean)
    .join(", ");

  const line2 = [
    address.neighborhood,
    address.city,
    address.state,
  ]
    .filter(Boolean)
    .join(" • ");

  const zip =
    address.cep
      ? `CEP ${address.cep}`
      : "";

  return [
    line1,
    address.complement,
    line2,
    zip,
  ].filter(Boolean);
}



/* =========================================================
   CUPOM
========================================================= */

function normalizeCouponName(
  value?: string | null
) {
  return String(
    value || "CLIENTE"
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9]/g,
      ""
    )
    .toUpperCase()
    .slice(0, 12);
}