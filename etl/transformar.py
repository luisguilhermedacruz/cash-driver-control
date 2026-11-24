"""
ETL do histórico (Extrair + Transformar).
Lê as duas planilhas, limpa e gera 4 CSVs no formato das tabelas do banco.
- WORK_FULL: de set/2024 até jun/2026
- WORK - 2026: de jul/2026 em diante (a WORK_FULL tem erro de colagem em set/out e um valor errado em nov)
"""
import sys, re, datetime as dt
import openpyxl, pandas as pd

FULL, Y2026, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
CORTE = dt.date(2026, 7, 1)

PLAT = {'UBER': 'Uber', '99': '99', 'INDRIVER': 'InDriver', 'PRIVATE': 'Particular', 'DELIVERY': 'Entrega', 'ENTREGA': 'Entrega'}
DESP = {'RENT': ('Aluguel do carro', None), 'FUEL': ('Combustível', None), 'FOOD': ('Alimentação', None),
        'UNEXPECTED CAR': ('Manutenção', 'Imprevisto com o carro (histórico)'),
        'MOBILE PHONE CREDIT': ('Plano de celular', None), 'INDRIVER CREDIT': ('Créditos InDriver', None),
        'TOLL': ('Pedágio', None), 'WITHDRAW UBER': ('Taxa de saque', None)}
problemas = []

def money(v, onde):
    """Converte 104.22 / 'R$104.22' / 'R$ 4,00' / '-' / '#ERROR!' em número. Vazio ou '-' = None (não teve)."""
    if v is None or (isinstance(v, float) and v != v): return None
    if isinstance(v, (int, float)): return float(v) if v > 0 else None
    s = str(v).strip().replace('R$', '').replace(' ', '')
    if s in ('', '-'): return None
    if s.startswith('#'): problemas.append(f'{onde}: valor com erro ({v}) ignorado'); return None
    if ',' in s: s = s.replace('.', '').replace(',', '.')
    try:
        n = float(s); return n if n > 0 else None
    except ValueError:
        problemas.append(f'{onde}: valor não entendido ({v}) ignorado'); return None

def hora(v):
    """Só aceita horário de verdade. '-', 0, vazio = sem horário."""
    if isinstance(v, dt.time) and v != dt.time(0, 0): return v
    if isinstance(v, dt.datetime): return v.time() if v.time() != dt.time(0, 0) else None
    return None

dias = []  # cada item: dict(date, out, pause, back, end, ganhos{}, despesas{}, origem)

def norm(h):
    return 'RENT' if str(h).strip().upper() == 'RENT' else ('99' if str(h).strip() in ('99', '99.0') else str(h).strip().upper())

def add_row(date, row, cols, origem):
    g, d = {}, {}
    for c, v in zip(cols, row):
        if c in PLAT:
            m = money(v, f'{date} {c}')
            if m: g[PLAT[c]] = g.get(PLAT[c], 0) + m
        if c in DESP:
            m = money(v, f'{date} {c}')
            if m: d[c] = m
    get = lambda name: row[cols.index(name)] if name in cols else None
    dias.append(dict(date=date, out=hora(get('OUT')), pause=hora(get('PAUSE')), back=hora(get('BACK')),
                     end=hora(get('END')), ganhos=g, despesas=d, origem=origem))

# --- 1) WORK_FULL até junho/2026
wb = openpyxl.load_workbook(FULL, data_only=True); ws = wb.worksheets[0]
rows = list(ws.iter_rows(values_only=True)); cols = [norm(c) for c in rows[0]]
for r in rows[1:]:
    if isinstance(r[0], dt.datetime) and r[0].date() < CORTE:
        add_row(r[0].date(), r, cols, 'WORK_FULL')

# --- 2) WORK - 2026, abas de julho a novembro
wb = openpyxl.load_workbook(Y2026, data_only=True)
def jul_date(v):
    # Na aba JULY algumas datas viraram "mês/dia" trocado (ex.: 2026-01-07 = 01/07 = 1º de julho)
    if isinstance(v, str) and re.match(r'^\d{2}/\d{2}$', v):
        d, m = map(int, v.split('/')); return dt.date(2026, m, d)
    if isinstance(v, dt.datetime): return dt.date(2026, v.day, v.month)
    return None
for aba in ['JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER']:
    ws = wb[aba]; cols = None
    for r in ws.iter_rows(values_only=True):
        first = r[0]
        if first in ('DATE', 'DAY'): cols = [norm(c) for c in r]; continue
        if cols is None: continue
        if aba == 'JULY': date = jul_date(first)
        elif aba == 'AUGUST': date = dt.date(2026, 8, int(first)) if isinstance(first, (int, float)) else None
        else: date = first.date() if isinstance(first, dt.datetime) else None
        if date is None or date < CORTE: continue  # 29 e 30/06 ficam com a WORK_FULL
        add_row(date, r, cols, aba)

# --- 3) Transformar em turnos, pausas, ganhos e despesas
TZ = dt.timezone(dt.timedelta(hours=-3))  # São Paulo (sem horário de verão desde 2019)
def ts(date, t, base=None):
    x = dt.datetime.combine(date, t, TZ)
    while base and x <= base: x += dt.timedelta(days=1)  # regra da meia-noite: passou da meia-noite, é o dia seguinte
    return x

shifts, breaks, earnings, expenses = [], [], [], []
vistos = set()
for d in sorted(dias, key=lambda x: x['date']):
    key = None
    if d['out']:
        s = ts(d['date'], d['out'])
        brk = None
        if d['pause'] and d['back'] and d['end']:
            p = ts(d['date'], d['pause'], s); b = ts(d['date'], d['back'], p); e = ts(d['date'], d['end'], b); brk = (p, b)
        elif d['end']:
            e = ts(d['date'], d['end'], s)
        elif d['pause']:
            e = ts(d['date'], d['pause'], s)  # só o primeiro bloco foi registrado
        else:
            e = None
        if e and (e - s) < dt.timedelta(hours=24):
            key = s.isoformat()
            if key in vistos: problemas.append(f'{d["date"]}: turno repetido ignorado'); key = None
            else:
                vistos.add(key)
                shifts.append(dict(key=key, work_date=d['date'].isoformat(), started_at=key, ended_at=e.isoformat(),
                                   source='historico', time_quality='ajustado', notes=f'importado de {d["origem"]}'))
                if brk: breaks.append(dict(shift_key=key, started_at=brk[0].isoformat(), ended_at=brk[1].isoformat()))
        elif e:
            problemas.append(f'{d["date"]}: turno com mais de 24h ignorado (só os valores entram)')
    for plat, v in d['ganhos'].items():
        earnings.append(dict(work_date=d['date'].isoformat(), shift_key=key or '', platform=plat, amount=round(v, 2)))
    for c, v in d['despesas'].items():
        cat, desc = DESP[c]
        expenses.append(dict(work_date=d['date'].isoformat(), shift_key=key or '', category=cat, amount=round(v, 2),
                             description=desc or '', fuel_type=''))

for name, data in [('shifts', shifts), ('breaks', breaks), ('earnings', earnings), ('expenses', expenses)]:
    pd.DataFrame(data).to_csv(f'{OUT}/{name}.csv', index=False)
print(f'turnos={len(shifts)} pausas={len(breaks)} ganhos={len(earnings)} despesas={len(expenses)} dias_lidos={len(dias)}')
print('\n'.join(problemas) if problemas else 'sem problemas')
