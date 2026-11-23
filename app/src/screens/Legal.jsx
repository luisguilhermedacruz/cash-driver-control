import { LEGAL } from '../legal'
import { Logo } from '../ui'

// Páginas públicas (abrem sem login): /privacidade e /termos.
// Modelo inicial, escrito para o MVP. Antes de crescer, revise com um advogado.

function Wrap({ title, children }) {
  return (
    <main className="page legal">
      <a href="/" className="brand legal-brand"><Logo size={28} /> Cash Driver Control</a>
      <h1>{title}</h1>
      <p className="muted small">Vigente desde {LEGAL.vigencia}.</p>
      {children}
      <p className="muted small">Dúvidas: <a href={`mailto:${LEGAL.contato}`}>{LEGAL.contato}</a></p>
      <a href="/" className="btn btn-secondary">Voltar ao app</a>
    </main>
  )
}

export function Privacidade() {
  return (
    <Wrap title="Política de Privacidade">
      <p>Esta política explica quais dados o <strong>Cash Driver Control</strong> coleta, por que coleta e como você pode exercer seus direitos, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 · LGPD).</p>

      <h2>1. Quem é o responsável</h2>
      <p>O controlador dos dados é <strong>{LEGAL.controlador}</strong>, responsável pelo Cash Driver Control. Contato: <a href={`mailto:${LEGAL.contato}`}>{LEGAL.contato}</a>.</p>

      <h2>2. Quais dados coletamos</h2>
      <ul>
        <li><strong>Dados da conta:</strong> nome, e-mail e foto de perfil (quando você entra com o Google) e a senha (quando entra com e-mail, guardada de forma criptografada).</li>
        <li><strong>Dados que você lança:</strong> turnos de trabalho (início, fim e pausas), ganhos por plataforma, despesas (categoria, valor, descrição e tipo de combustível), sua meta de ganhos por hora e observações.</li>
        <li><strong>Dados técnicos:</strong> informações mínimas para manter você conectado, guardadas no seu navegador.</li>
      </ul>
      <p>Não coletamos localização, contatos, dados bancários nem informações das plataformas (Uber, 99, InDriver). Tudo o que está no app foi digitado por você.</p>

      <h2>3. Para que usamos</h2>
      <ul>
        <li>Criar e manter sua conta e permitir o login.</li>
        <li>Calcular suas métricas (horas, ganho por hora, lucro, avaliação do dia) e gerar relatórios.</li>
        <li>Melhorar o app, usando apenas números agregados, sem identificar ninguém.</li>
      </ul>
      <p><strong>Base legal:</strong> execução do serviço que você solicitou ao criar a conta (art. 7º, V, da LGPD).</p>

      <h2>4. Com quem compartilhamos</h2>
      <p>Não vendemos nem cedemos seus dados. Usamos fornecedores que processam dados em nosso nome:</p>
      <ul>
        <li><strong>Supabase</strong>: banco de dados e autenticação (servidores na região de São Paulo).</li>
        <li><strong>Vercel</strong>: hospedagem do site.</li>
        <li><strong>Google</strong>: apenas quando você escolhe entrar com sua conta Google.</li>
      </ul>
      <p>Alguns desses fornecedores podem processar dados fora do Brasil, com medidas de proteção adequadas.</p>

      <h2>5. Segurança</h2>
      <p>A conexão é criptografada (HTTPS). No banco, cada motorista só consegue acessar as próprias informações: essa regra fica no próprio banco de dados (segurança por linha), e não apenas no app.</p>

      <h2>6. Por quanto tempo guardamos</h2>
      <p>Enquanto sua conta estiver ativa. Se você pedir a exclusão, apagamos sua conta e todos os seus lançamentos em até 15 dias, exceto o que a lei nos obrigar a manter.</p>

      <h2>7. Seus direitos</h2>
      <p>Você pode, a qualquer momento: confirmar se tratamos seus dados, acessá-los, corrigi-los, pedir uma cópia (portabilidade), pedir a exclusão e revogar o consentimento (art. 18 da LGPD). Seu nome e sua meta podem ser alterados direto em <em>Configurações</em>. Para os demais pedidos, escreva para <a href={`mailto:${LEGAL.contato}`}>{LEGAL.contato}</a>.</p>

      <h2>8. Menores de idade</h2>
      <p>O app é destinado a maiores de 18 anos.</p>

      <h2>9. Mudanças nesta política</h2>
      <p>Se esta política mudar, avisaremos no app. A data de vigência fica sempre no topo desta página.</p>
    </Wrap>
  )
}

export function Termos() {
  return (
    <Wrap title="Termos de Uso">
      <p>Ao criar uma conta no <strong>Cash Driver Control</strong>, você concorda com estes termos.</p>

      <h2>1. O que é o serviço</h2>
      <p>O Cash Driver Control é uma ferramenta para motoristas de aplicativo registrarem turnos, ganhos e despesas e acompanharem seu desempenho, como ganho por hora e lucro. O app não tem ligação com Uber, 99, InDriver ou qualquer outra plataforma.</p>

      <h2>2. Sua conta</h2>
      <ul>
        <li>A conta é pessoal: não compartilhe seu acesso.</li>
        <li>Você é responsável pelas informações que lança. Os cálculos dependem do que foi digitado.</li>
        <li>Você precisa ter 18 anos ou mais.</li>
      </ul>

      <h2>3. Preço</h2>
      <p>O uso é gratuito neste momento. No futuro, poderão existir planos pagos com recursos extras. Qualquer cobrança será avisada com antecedência e só acontecerá se você contratar.</p>

      <h2>4. Uso correto</h2>
      <p>Não é permitido tentar acessar dados de outras pessoas, atrapalhar o funcionamento do serviço ou usá-lo para fins ilegais. Contas que violarem estas regras podem ser suspensas.</p>

      <h2>5. Limites de responsabilidade</h2>
      <ul>
        <li>O app mostra cálculos e estatísticas. Ele <strong>não é aconselhamento financeiro, contábil ou fiscal</strong>.</li>
        <li>O serviço é oferecido no estado em que se encontra. Fazemos o possível para mantê-lo no ar e sem erros, mas podem ocorrer falhas ou interrupções.</li>
      </ul>

      <h2>6. Encerramento</h2>
      <p>Você pode deixar de usar o app quando quiser e pedir a exclusão da conta e dos dados (veja a <a href="/privacidade">Política de Privacidade</a>).</p>

      <h2>7. Mudanças e lei aplicável</h2>
      <p>Estes termos podem ser atualizados, e avisaremos no app. Vale a lei brasileira.</p>
    </Wrap>
  )
}
