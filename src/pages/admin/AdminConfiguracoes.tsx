import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type AdminModule = {
  id: string;
  module_key: string;
  title: string;
  description: string | null;
  enabled: boolean;
};

type StoreConfig = {
  store_name: string;
  support_email: string;
  support_phone: string;
  whatsapp: string;
  free_shipping_min_cents: number;
};

const DEFAULT_STORE_CONFIG: StoreConfig = {
  store_name: "Caléa",
  support_email: "",
  support_phone: "",
  whatsapp: "",
  free_shipping_min_cents: 0,
};

function formatMoneyFromCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function onlyNumbers(value: string) {
  return value.replace(/\D/g, "");
}

export default function AdminConfiguracoes() {
  const [activeTab, setActiveTab] = useState<"modulos" | "loja" | "visual">("modulos");
  const [modules, setModules] = useState<AdminModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  const [savingModuleId, setSavingModuleId] = useState<string | null>(null);

  const [storeConfig, setStoreConfig] = useState<StoreConfig>(DEFAULT_STORE_CONFIG);
  const [savedMessage, setSavedMessage] = useState("");

  async function loadModules() {
    setLoadingModules(true);

    const { data, error } = await supabase
      .from("admin_modules")
      .select("id, module_key, title, description, enabled")
      .order("title", { ascending: true });

    if (error) {
      console.error("Erro ao carregar módulos:", error);
      setModules([]);
    } else {
      setModules(data || []);
    }

    setLoadingModules(false);
  }

  async function toggleModule(module: AdminModule) {
    setSavingModuleId(module.id);

    const nextEnabled = !module.enabled;

    setModules((current) =>
      current.map((item) =>
        item.id === module.id ? { ...item, enabled: nextEnabled } : item
      )
    );

    const { error } = await supabase
      .from("admin_modules")
      .update({
        enabled: nextEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", module.id);

    if (error) {
      console.error("Erro ao atualizar módulo:", error);

      setModules((current) =>
        current.map((item) =>
          item.id === module.id ? { ...item, enabled: module.enabled } : item
        )
      );

      alert("Não foi possível atualizar esse módulo.");
    }

    setSavingModuleId(null);
  }

  function handleStoreChange(field: keyof StoreConfig, value: string) {
    setStoreConfig((current) => ({
      ...current,
      [field]:
        field === "free_shipping_min_cents"
          ? Number(onlyNumbers(value || "0"))
          : value,
    }));
  }

  function saveStoreConfig() {
    localStorage.setItem("calea_admin_store_config", JSON.stringify(storeConfig));
    setSavedMessage("Configurações salvas com sucesso.");

    window.setTimeout(() => {
      setSavedMessage("");
    }, 2500);
  }

  function loadStoreConfig() {
    const saved = localStorage.getItem("calea_admin_store_config");

    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      setStoreConfig({
        ...DEFAULT_STORE_CONFIG,
        ...parsed,
      });
    } catch {
      setStoreConfig(DEFAULT_STORE_CONFIG);
    }
  }

  useEffect(() => {
    loadModules();
    loadStoreConfig();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#e9e2d6] bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-[#b08d57]">
          Painel administrativo
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-[#2b554e]">
          Configurações
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Gerencie módulos, dados da loja e preferências do painel.
        </p>
      </section>

      <section className="rounded-3xl border border-[#e9e2d6] bg-white p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("modulos")}
            className={[
              "rounded-2xl px-4 py-2 text-sm font-medium transition",
              activeTab === "modulos"
                ? "bg-[#2b554e] text-white"
                : "text-zinc-600 hover:bg-[#f6f3ee]",
            ].join(" ")}
          >
            Módulos
          </button>

          <button
            onClick={() => setActiveTab("loja")}
            className={[
              "rounded-2xl px-4 py-2 text-sm font-medium transition",
              activeTab === "loja"
                ? "bg-[#2b554e] text-white"
                : "text-zinc-600 hover:bg-[#f6f3ee]",
            ].join(" ")}
          >
            Dados da loja
          </button>

          <button
            onClick={() => setActiveTab("visual")}
            className={[
              "rounded-2xl px-4 py-2 text-sm font-medium transition",
              activeTab === "visual"
                ? "bg-[#2b554e] text-white"
                : "text-zinc-600 hover:bg-[#f6f3ee]",
            ].join(" ")}
          >
            Visual
          </button>
        </div>
      </section>

      {activeTab === "modulos" ? (
        <section className="rounded-3xl border border-[#e9e2d6] bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-[#2b554e]">
              Módulos do admin
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Ative ou desative áreas do painel administrativo.
            </p>
          </div>

          {loadingModules ? (
            <div className="rounded-2xl bg-[#f6f3ee] p-5 text-sm text-zinc-500">
              Carregando módulos...
            </div>
          ) : modules.length === 0 ? (
            <div className="rounded-2xl bg-[#f6f3ee] p-5 text-sm text-zinc-500">
              Nenhum módulo cadastrado. Rode o SQL de criação da tabela admin_modules.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {modules.map((module) => (
                <div
                  key={module.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] p-4"
                >
                  <div>
                    <h3 className="font-semibold text-[#2b554e]">
                      {module.title}
                    </h3>

                    <p className="mt-1 text-sm text-zinc-500">
                      {module.description || "Sem descrição."}
                    </p>

                    <p className="mt-2 text-xs text-zinc-400">
                      Chave: {module.module_key}
                    </p>
                  </div>

                  <button
                    onClick={() => toggleModule(module)}
                    disabled={savingModuleId === module.id}
                    className={[
                      "relative h-8 w-14 rounded-full transition disabled:opacity-60",
                      module.enabled ? "bg-[#2b554e]" : "bg-zinc-300",
                    ].join(" ")}
                    aria-label={`Alterar módulo ${module.title}`}
                  >
                    <span
                      className={[
                        "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition",
                        module.enabled ? "left-7" : "left-1",
                      ].join(" ")}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "loja" ? (
        <section className="rounded-3xl border border-[#e9e2d6] bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-[#2b554e]">
              Dados da loja
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Informações básicas usadas no painel.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Nome da loja
              </span>
              <input
                value={storeConfig.store_name}
                onChange={(event) => handleStoreChange("store_name", event.target.value)}
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
                placeholder="Caléa"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                E-mail de suporte
              </span>
              <input
                value={storeConfig.support_email}
                onChange={(event) => handleStoreChange("support_email", event.target.value)}
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
                placeholder="contato@calea.com.br"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                Telefone
              </span>
              <input
                value={storeConfig.support_phone}
                onChange={(event) => handleStoreChange("support_phone", event.target.value)}
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
                placeholder="(11) 99999-9999"
              />
            </label>

            <label className="space-y-1">
              <span className="text-sm font-medium text-zinc-700">
                WhatsApp
              </span>
              <input
                value={storeConfig.whatsapp}
                onChange={(event) => handleStoreChange("whatsapp", event.target.value)}
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
                placeholder="5511999999999"
              />
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium text-zinc-700">
                Frete grátis acima de
              </span>
              <input
                value={formatMoneyFromCents(storeConfig.free_shipping_min_cents)}
                onChange={(event) =>
                  handleStoreChange("free_shipping_min_cents", event.target.value)
                }
                className="w-full rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] px-4 py-3 text-sm outline-none focus:border-[#2b554e]"
                placeholder="R$ 0,00"
              />
            </label>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-sm text-green-700">
              {savedMessage}
            </p>

            <button
              onClick={saveStoreConfig}
              className="rounded-2xl bg-[#2b554e] px-5 py-3 text-sm font-semibold text-white hover:bg-[#244841]"
            >
              Salvar alterações
            </button>
          </div>
        </section>
      ) : null}

      {activeTab === "visual" ? (
        <section className="rounded-3xl border border-[#e9e2d6] bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-[#2b554e]">
              Visual do painel
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Referência das cores principais usadas no admin.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] p-4">
              <div className="h-16 rounded-2xl bg-[#2b554e]" />
              <h3 className="mt-3 font-semibold text-[#2b554e]">
                Verde principal
              </h3>
              <p className="text-sm text-zinc-500">#2b554e</p>
            </div>

            <div className="rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] p-4">
              <div className="h-16 rounded-2xl bg-[#b08d57]" />
              <h3 className="mt-3 font-semibold text-[#2b554e]">
                Dourado
              </h3>
              <p className="text-sm text-zinc-500">#b08d57</p>
            </div>

            <div className="rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6] p-4">
              <div className="h-16 rounded-2xl border border-[#e9e2d6] bg-[#FCFAF6]" />
              <h3 className="mt-3 font-semibold text-[#2b554e]">
                Fundo
              </h3>
              <p className="text-sm text-zinc-500">#FCFAF6</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}