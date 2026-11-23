# Cash Driver Control · web app

Site (SaaS) feito com **React + Vite**, usando o **Supabase** (banco + login).

## Rodar no seu computador (opcional)

```powershell
cd app
npm install          # baixa as bibliotecas listadas no package.json
copy .env.example .env.local   # depois preencha as duas variáveis
npm run dev          # abre em http://localhost:5173
```

## Publicar (Vercel)

- Root Directory: `app`
- Environment Variables: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`
- A cada `git push` na `main`, a Vercel publica de novo sozinha.

## Onde fica cada coisa

| Arquivo | O que faz |
|---|---|
| `src/App.jsx` | decide a tela: login → onboarding → dia a dia |
| `src/lib/supabase.js` | conexão com o banco |
| `src/lib/metrics.js` | horas, R$/hora e avaliação (segue `docs/metricas.md`) |
| `src/lib/format.js` | datas no horário de São Paulo e dinheiro em R$ |
| `src/lib/data.js` | busca turnos, pausas, ganhos e despesas de um período |
| `src/screens/` | uma tela por arquivo |
| `src/styles.css` | o visual (tema escuro) |
