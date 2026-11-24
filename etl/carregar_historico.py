"""
ETL do histórico · etapa L (Load / Carregar).
Lê os CSVs limpos de data/processed e grava no Supabase com o SEU user_id.

Uso (na raiz do projeto, com o .venv ligado):
  python etl/carregar_historico.py --user-id SEU_UID              -> só SIMULA (não grava nada)
  python etl/carregar_historico.py --user-id SEU_UID --gravar     -> grava de verdade
  ... --substituir   apaga o histórico importado antes (para rodar de novo sem duplicar)
  ... --ate 2026-11-22   ignora os dias depois dessa data

Precisa no .env: SUPABASE_URL e SUPABASE_SECRET_KEY (a chave SECRETA: ela passa por cima do RLS,
por isso este script só roda no seu computador e nunca vai para o site).
"""
import argparse, csv, json, os, sys, urllib.request, urllib.error
from collections import defaultdict
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / 'data' / 'processed'

def ler_env():
    env = {}
    for linha in (RAIZ / '.env').read_text(encoding='utf-8').splitlines():
        if '=' in linha and not linha.strip().startswith('#'):
            k, v = linha.split('=', 1); env[k.strip()] = v.strip()
    return env

ENV = ler_env()
URL = ENV['SUPABASE_URL'].rstrip('/') + '/rest/v1'
KEY = ENV['SUPABASE_SECRET_KEY']

def api(method, path, body=None, prefer=None):
    """Conversa com a API do banco (PostgREST)."""
    headers = {'apikey': KEY, 'Content-Type': 'application/json'}
    if KEY.startswith('eyJ'):  # chave antiga (JWT) também vai no Authorization
        headers['Authorization'] = 'Bearer ' + KEY
    if prefer: headers['Prefer'] = prefer
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(URL + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else None
    except urllib.error.HTTPError as e:
        sys.exit(f'\nERRO {e.code} em {method} {path}:\n{e.read().decode()}')

def ler(nome, ate):
    with open(PASTA / f'{nome}.csv', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    if ate:
        campo = 'work_date' if 'work_date' in rows[0] else None
        rows = [r for r in rows if not campo or r[campo] <= ate]
    return rows

def em_lotes(lista, n=500):
    for i in range(0, len(lista), n): yield lista[i:i + n]

def epoch(ts):
    return datetime.fromisoformat(ts.replace('Z', '+00:00')).timestamp()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--user-id', required=True)
    ap.add_argument('--gravar', action='store_true')
    ap.add_argument('--substituir', action='store_true')
    ap.add_argument('--ate')
    a = ap.parse_args()
    uid = a.user_id

    shifts, earnings, expenses = ler('shifts', a.ate), ler('earnings', a.ate), ler('expenses', a.ate)
    keys = {s['key'] for s in shifts}
    breaks = [b for b in ler('breaks', None) if b['shift_key'] in keys]

    # Resumo por mês (para conferir com as planilhas ANTES de gravar)
    mes = defaultdict(lambda: [0.0, 0.0])
    for e in earnings: mes[e['work_date'][:7]][0] += float(e['amount'])
    for x in expenses: mes[x['work_date'][:7]][1] += float(x['amount'])
    print('Mês       Receita      Despesas')
    for m in sorted(mes): print(f'{m}  {mes[m][0]:>11,.2f}  {mes[m][1]:>11,.2f}')
    print(f'\nTurnos: {len(shifts)} · Pausas: {len(breaks)} · Ganhos: {len(earnings)} · Despesas: {len(expenses)}')

    # Os ids das plataformas e categorias vêm do banco, pelo nome
    plats = {p['name']: p['id'] for p in api('GET', '/platforms?select=id,name&user_id=is.null')}
    cats = {c['name']: c['id'] for c in api('GET', '/expense_categories?select=id,name&user_id=is.null')}
    faltando = {e['platform'] for e in earnings} - plats.keys() | {x['category'] for x in expenses} - cats.keys()
    if faltando: sys.exit(f'Não achei no banco: {faltando}')

    perfil = api('GET', f'/profiles?select=id,full_name&id=eq.{uid}')
    if not perfil: sys.exit('Esse user_id não existe em profiles. Confira o UID em Authentication > Users.')
    print(f'Usuário: {perfil[0].get("full_name") or uid}')

    ja = api('GET', f'/shifts?select=id&user_id=eq.{uid}&source=eq.historico&limit=1') or \
         api('GET', f'/earnings?select=id&user_id=eq.{uid}&source=eq.historico&limit=1')
    if ja and not a.substituir:
        sys.exit('\nJá existe histórico importado para este usuário. Use --substituir para apagar e importar de novo.')

    if not a.gravar:
        print('\nSIMULAÇÃO: nada foi gravado. Confira os totais e rode de novo com --gravar.')
        return

    if a.substituir:
        for t in ('earnings', 'expenses', 'shifts'):  # as pausas somem junto com os turnos (on delete cascade)
            api('DELETE', f'/{t}?user_id=eq.{uid}&source=eq.historico')
        print('Histórico anterior apagado.')

    # 1) Turnos: grava e guarda o id que o banco criou para cada um
    ids = {}
    for lote in em_lotes(shifts):
        body = [{k: s[k] for k in ('work_date', 'started_at', 'ended_at', 'source', 'time_quality', 'notes')} | {'user_id': uid} for s in lote]
        for r in api('POST', '/shifts?select=id,started_at', body, 'return=representation'):
            ids[epoch(r['started_at'])] = r['id']
    sid = lambda key: ids.get(epoch(key)) if key else None
    print(f'Turnos gravados: {len(ids)}')

    # 2) Pausas
    body = [{'shift_id': sid(b['shift_key']), 'user_id': uid, 'started_at': b['started_at'], 'ended_at': b['ended_at']} for b in breaks]
    for lote in em_lotes(body): api('POST', '/breaks', lote, 'return=minimal')
    print(f'Pausas gravadas: {len(body)}')

    # 3) Ganhos
    body = [{'user_id': uid, 'work_date': e['work_date'], 'shift_id': sid(e['shift_key']), 'platform_id': plats[e['platform']],
             'amount': float(e['amount']), 'source': 'historico'} for e in earnings]
    for lote in em_lotes(body): api('POST', '/earnings', lote, 'return=minimal')
    print(f'Ganhos gravados: {len(body)}')

    # 4) Despesas
    body = [{'user_id': uid, 'work_date': x['work_date'], 'shift_id': sid(x['shift_key']), 'category_id': cats[x['category']],
             'amount': float(x['amount']), 'description': x['description'] or None, 'source': 'historico'} for x in expenses]
    for lote in em_lotes(body): api('POST', '/expenses', lote, 'return=minimal')
    print(f'Despesas gravadas: {len(body)}')
    print('\nPronto! Abra o app e confira os relatórios.')

if __name__ == '__main__':
    main()
