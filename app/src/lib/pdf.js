// Gera o PDF do relatório NO NAVEGADOR (grátis, sem servidor) e abre o compartilhamento do celular.
// jsPDF monta o documento; jspdf-autotable desenha as tabelas.
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { money, hoursLabel, pauseLabel, dayLabel, timeLabel } from './format'
import { shiftTimes } from './metrics'

const VERDE = [18, 161, 80]
const TINTA = [22, 24, 29]
const CINZA = [91, 98, 112]
const COR = { otimo: [31, 95, 181], bom: [11, 122, 92], regular: [168, 106, 0], ruim: [192, 57, 43] }

let logoCache = null
export async function preloadLogo() {
  if (logoCache) return logoCache
  const blob = await fetch('/quantofez-192.png').then((r) => r.blob())
  logoCache = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob) })
  return logoCache
}

export async function gerarPDF({ user, name, label, sum, byPlatform, byGroup, tab, data, start, end }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const M = 18, W = 210 - M * 2
  let y = M

  // Cabeçalho
  try { doc.addImage(await preloadLogo(), 'PNG', M, y - 2, 12, 12) } catch { /* sem logo, segue */ }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...TINTA)
  doc.text('Quanto', M + 15, y + 6); doc.setTextColor(...VERDE); doc.text('Fez', M + 15 + doc.getTextWidth('Quanto'), y + 6)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...CINZA)
  const agora = new Date()
  doc.text(`Gerado em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, M + W, y + 6, { align: 'right' })
  y += 13; doc.setDrawColor(...TINTA); doc.setLineWidth(0.5); doc.line(M, y, M + W, y); y += 10

  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...TINTA)
  doc.text('Relatório de desempenho', M, y); y += 8
  const info = [['Motorista', user.full_name || name], ['Período', label], ['Meta', `${money(user.hourly_goal)} por hora`]]
  info.forEach(([k, v], i) => {
    const x = M + i * (W / 3)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...CINZA); doc.text(k, x, y)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...TINTA)
    doc.text(doc.splitTextToSize(String(v), W / 3 - 4), x, y + 5)
  })
  y += 16

  // Resumo em cartões (3 x 2)
  const t = sum.total
  const pct = t.perHour && user.hourly_goal ? ` (${((t.perHour / user.hourly_goal) * 100).toFixed(1).replace('.', ',')}% da meta)` : ''
  const cards = [
    ['Receita bruta', money(t.revenue), `${t.days} ${t.days === 1 ? 'dia trabalhado' : 'dias trabalhados'}`],
    ['Despesas', money(t.expenses), ''],
    ['Lucro líquido', money(t.profit), t.revenue ? `margem de ${((t.profit / t.revenue) * 100).toFixed(1).replace('.', ',')}%` : ''],
    ['Horas trabalhadas', hoursLabel(t.seconds), t.pauses ? `${pauseLabel(t.paused)} em ${t.pauses} pausas` : ''],
    ['R$/hora', t.perHour ? money(t.perHour) : '-', pct.trim()],
    ['Avaliação', t.rating ? t.rating.label : '-', ''],
  ]
  const cw = (W - 8) / 3, ch = 20
  cards.forEach(([k, v, s], i) => {
    const x = M + (i % 3) * (cw + 4), yy = y + Math.floor(i / 3) * (ch + 4)
    doc.setDrawColor(201, 206, 214); doc.setLineWidth(0.3); doc.roundedRect(x, yy, cw, ch, 2, 2)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...CINZA); doc.text(k, x + 4, yy + 6)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
    doc.setTextColor(...(k === 'Avaliação' && t.rating ? COR[t.rating.key] : TINTA)); doc.text(v, x + 4, yy + 13)
    if (s) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...CINZA); doc.text(s, x + 4, yy + 17.5) }
  })
  y += ch * 2 + 4 + 8

  if (t.seconds > 0) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...TINTA)
    doc.text(`Jornada total ${hoursLabel(t.span)} · trabalhadas ${hoursLabel(t.seconds)} · em pausa ${pauseLabel(t.paused)}. ` +
      `Cada hora de trabalho custou ${money(t.costPerHour)} e deu ${money(t.profitPerHour)} de lucro.`, M, y, { maxWidth: W })
    y += 12
  }

  const tabela = (titulo, head, body, foot, extra = {}) => {
    if (y > 250) { doc.addPage(); y = M }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...TINTA); doc.text(titulo, M, y); y += 3
    autoTable(doc, {
      startY: y, head: [head], body, foot: foot ? [foot] : undefined, margin: { left: M, right: M },
      styles: { font: 'helvetica', fontSize: 9.5, textColor: TINTA, cellPadding: 2.2 },
      headStyles: { fillColor: [235, 245, 239], textColor: TINTA, fontStyle: 'bold' },
      footStyles: { fillColor: [255, 255, 255], textColor: TINTA, fontStyle: 'bold' },
      columnStyles: Object.fromEntries(head.map((_, i) => [i, { halign: i === 0 ? 'left' : 'right' }])),
      theme: 'grid', ...extra,
      didParseCell: (h) => {
        h.cell.styles.halign = h.column.index === 0 ? 'left' : 'right' // títulos e totais alinhados com os números
        extra.didParseCell?.(h)
      },
    })
    y = doc.lastAutoTable.finalY + 10
  }

  const plat = Object.entries(byPlatform).sort((a, b) => b[1] - a[1])
  if (plat.length) tabela('Ganhos por plataforma', ['Plataforma', 'Valor', '%'],
    plat.map(([n, v]) => [n, money(v), `${((v / t.revenue) * 100).toFixed(1).replace('.', ',')}%`]), ['Total', money(t.revenue), '100%'])

  const grp = Object.entries(byGroup).sort((a, b) => b[1] - a[1])
  if (grp.length) tabela('Despesas por tipo', ['Tipo', 'Valor', '%'],
    grp.map(([n, v]) => [n, money(v), `${((v / t.expenses) * 100).toFixed(1).replace('.', ',')}%`]), ['Total', money(t.expenses), '100%'])

  if (tab === 'dia' && data.shifts.length) {
    tabela('Turnos', ['Início', 'Fim', 'Trabalhado', 'Pausas'], data.shifts.map((s) => {
      const st = shiftTimes(s, data.breaks.filter((b) => b.shift_id === s.id))
      return [timeLabel(s.started_at), s.ended_at ? timeLabel(s.ended_at) : 'em andamento', hoursLabel(st.worked), pauseLabel(st.paused)]
    }))
  } else if (sum.days.length) {
    const dias = [...sum.days].sort((a, b) => a.date.localeCompare(b.date))
    tabela('Dias', ['Data', 'Horas', 'Receita', 'R$/hora', 'Avaliação'],
      dias.map((d) => [dayLabel(d.date, { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit' }), d.seconds ? hoursLabel(d.seconds) : '-',
        money(d.revenue), d.perHour ? money(d.perHour) : '-', d.rating ? d.rating.label : '-']),
      null, {
        didParseCell: (h) => {
          if (h.section === 'body' && h.column.index === 4) {
            const r = dias[h.row.index]?.rating
            if (r) { h.cell.styles.textColor = COR[r.key]; h.cell.styles.fontStyle = 'bold' }
          }
        },
      })
  }

  // Rodapé em todas as páginas
  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...CINZA)
    doc.text('QuantoFez · relatório gerado a partir dos lançamentos do motorista · valores em R$', M, 287)
    doc.text(`página ${i} de ${n}`, M + W, 287, { align: 'right' })
  }

  const file = new File([doc.output('blob')], `QuantoFez-relatorio-${start}_a_${end}.pdf`, { type: 'application/pdf' })
  return file
}

// Abre o menu de compartilhar do celular (WhatsApp etc.). Onde não existe (computador), baixa o arquivo.
export async function compartilhar(file) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Relatório QuantoFez' })
      return 'shared'
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled' // a pessoa fechou o menu
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a'); a.href = url; a.download = file.name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'downloaded'
}
