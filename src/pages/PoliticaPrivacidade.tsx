export default function PoliticaPrivacidade() {
  return (
    <main className="min-h-screen bg-[#fcfaf6] text-[#2b554e]">
      <section className="relative overflow-hidden border-b border-[#e8dfd3] bg-white">
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(176,141,87,0.4),transparent_45%)]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-20 md:px-8 md:py-28">
          <p className="text-[11px] uppercase tracking-[0.35em] text-[#b08d57]">
            Caléa Blanc
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-light leading-[1.02] tracking-[-0.05em] text-[#2b554e] md:text-6xl">
            Política de Privacidade
          </h1>

          <p className="mt-6 max-w-2xl text-[15px] leading-8 text-[#2b554e]/72 md:text-lg">
            Transparência, segurança e respeito aos seus dados fazem parte da
            experiência Caléa Blanc. Esta política explica como coletamos,
            utilizamos e protegemos suas informações pessoais.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14 md:px-8 md:py-20">
        <div className="space-y-6">
          <PrivacyCard
            number="01"
            title="Coleta de informações"
            text="Podemos coletar informações fornecidas diretamente por você, como nome, e-mail, telefone, CPF, endereço de entrega e dados necessários para finalização de pedidos. Também poderemos coletar informações de navegação, como endereço IP, dispositivo utilizado, páginas acessadas e tempo de permanência no site."
          />

          <PrivacyCard
            number="02"
            title="Uso das informações"
            text="Os dados coletados podem ser utilizados para processar pedidos, realizar entregas, prestar suporte ao cliente, enviar comunicações relacionadas às compras, melhorar sua experiência de navegação, personalizar conteúdos e cumprir obrigações legais e regulatórias. Também poderemos utilizar ferramentas analíticas, como Microsoft Clarity, para compreender a navegação e otimizar a experiência no site."
          />

          <PrivacyCard
            number="03"
            title="Compartilhamento de dados"
            text="Os dados poderão ser compartilhados apenas com parceiros essenciais para operação da loja, como plataformas de pagamento, transportadoras, hospedagem, tecnologia e ferramentas analíticas. A Caléa Blanc não comercializa dados pessoais."
          />

          <PrivacyCard
            number="04"
            title="Cookies e tecnologias"
            text="Utilizamos cookies para melhorar a navegação, armazenar preferências e compreender o comportamento dos usuários dentro da plataforma. Você pode gerenciar ou desabilitar cookies diretamente em seu navegador."
          />

          <PrivacyCard
            number="05"
            title="Segurança das informações"
            text="Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados contra acessos não autorizados, perda, alteração, divulgação ou uso indevido. Apesar disso, nenhum sistema é totalmente invulnerável."
          />

          <PrivacyCard
            number="06"
            title="Direitos do titular"
            text="Você poderá solicitar acesso, atualização, correção, anonimização, portabilidade ou exclusão de seus dados pessoais, conforme previsto pela legislação aplicável."
          />

          <PrivacyCard
            number="07"
            title="Retenção de dados"
            text="Os dados serão mantidos pelo período necessário para cumprimento das finalidades descritas nesta política, obrigações legais, fiscais, regulatórias e exercício regular de direitos."
          />

          <PrivacyCard
            number="08"
            title="Alterações desta política"
            text="Esta Política de Privacidade poderá ser atualizada periodicamente para refletir alterações legais, operacionais ou técnicas. A versão mais recente estará sempre disponível nesta página."
          />

          <PrivacyCard
            number="09"
            title="Contato"
            text="Em caso de dúvidas relacionadas a esta Política de Privacidade ou ao tratamento de dados pessoais, entre em contato pelos canais oficiais da Caléa Blanc."
          />
        </div>

        <div className="mt-12 rounded-[28px] border border-[#e7ded2] bg-white px-6 py-5 shadow-[0_10px_30px_rgba(43,85,78,0.04)]">
          <p className="text-sm text-[#2b554e]/70">
            Última atualização: junho de 2026
          </p>
        </div>
      </section>
    </main>
  );
}

function PrivacyCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[32px] border border-[#e7ded2] bg-white p-7 shadow-[0_14px_40px_rgba(43,85,78,0.04)] transition hover:-translate-y-[2px] hover:shadow-[0_18px_50px_rgba(43,85,78,0.08)] md:p-9">
      <div className="flex items-start gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f5efe6] text-sm font-semibold tracking-[0.08em] text-[#b08d57]">
          {number}
        </div>

        <div>
          <h2 className="text-2xl font-medium tracking-[-0.03em] text-[#2b554e]">
            {title}
          </h2>

          <p className="mt-4 text-[15px] leading-8 text-[#2b554e]/72">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}