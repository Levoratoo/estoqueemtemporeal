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

## Docker (servidor / rede local)

Build estatico servido por nginx na porta **3012** do host:

```bash
docker compose build
docker compose up -d
```

Dashboard: `http://<host>:3012/dashboard/`

Deploy remoto (Linux/macOS com SSH na LAN):

```bash
REMOTE_HOST=192.168.1.82 REMOTE_USER=pedro-levorato ./deploy/remote-deploy.sh
```

No Windows (Weisul, pasta Documents + servidor 192.168.1.82):

```powershell
$env:SSHPASS = 'sua_senha_ssh'   # opcional, com WSL + sshpass
cd "C:\Users\pedro.levorato\Documents\estoque em tempo real"
.\deploy\deploy-from-windows.ps1
```

**Nginx Proxy Manager:** proxy host HTTP → `192.168.1.82:3012`.

## Observacoes
- Esta versao usa dataset mock em `lib/portfolio-demo.ts`.
- Nao depende de SQL Server nem de rotas `/api`.
- O objetivo e exibicao visual e navegabilidade para portfolio.
