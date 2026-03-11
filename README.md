# Dashboard GRID (Portfolio Demo)

Versao demonstrativa do dashboard operacional com dados de exemplo, pronta para portfolio.

## Stack
- Next.js 14 (App Router)
- React + Tailwind
- Recharts

## Rodar local
```bash
npm install
npm run dev
```
Acesse `http://localhost:3002/dashboard`.

## Publicacao no GitHub Pages
O deploy roda automaticamente via GitHub Actions a cada push na `main`.

URL publicada:
- `https://levoratoo.github.io/estoqueemtemporeal/`

## Observacoes
- Esta versao usa dataset mock em `lib/portfolio-demo.ts`.
- Nao depende de SQL Server nem de rotas `/api`.
- O objetivo e exibicao visual e navegabilidade para portfolio.
