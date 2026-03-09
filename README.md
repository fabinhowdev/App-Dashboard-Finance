💰 App Dashboard Finance

Uma aplicação web de dashboard financeiro criada para ajudar usuários a visualizar e gerenciar suas finanças pessoais em uma interface simples e intuitiva.

Este projeto foi desenvolvido como um projeto de aprendizado em desenvolvimento front-end, com foco na criação de interfaces modernas e na organização de dados financeiros em um layout de dashboard.

A aplicação inclui páginas de login, cadastro e um painel financeiro onde os usuários podem acompanhar suas informações financeiras.

🚀 Funcionalidades

🔐 Interface de login e cadastro de usuários

📊 Layout de dashboard financeiro

💳 Visualização de informações financeiras

📱 Design responsivo

🎨 Interface limpa e moderna

🛠 Tecnologias Utilizadas

Tecnologias de front-end usadas neste projeto:

HTML5

CSS3

JavaScript

Boxicons

Git & GitHub

## Deploy

O projeto foi migrado para **Netlify Functions + Netlify DB (Neon/PostgreSQL)**.
As páginas frontend chamam os endpoints em `/.netlify/functions/*`.

### 1) Pré-requisitos

- Node.js 20+ (recomendado para uso do Netlify CLI)
- Conta Netlify conectada ao repositório

### 2) Instalar dependências

```bash
npm install
```

### 3) Provisionar banco no Netlify

Com o projeto já conectado no Netlify:

```bash
npm run db:init
```

Isso cria e conecta o Postgres do Netlify DB (Neon) ao site.

### 4) Subir schema no banco

```bash
npm run db:push
```

O schema também está em `db/schema.sql` para referência.

### 5) Variáveis de ambiente (Site settings > Environment variables)

Obrigatória:

- `NETLIFY_DATABASE_URL` (criada automaticamente pelo `netlify db init`)

Opcionais:

- `APP_FRONTEND_URL=https://seu-site.netlify.app` (base para links de reset de senha)
- `CORS_ALLOW_ORIGINS=https://seu-site.netlify.app` (somente se usar outro domínio para frontend)
- `ENABLE_DEBUG_RESET_URL=true` (exibe link de reset no frontend para testes)
- `COOKIE_NAME=finance_session`
- `COOKIE_SAMESITE=Lax`
- `COOKIE_SECURE=true`

### 6) Deploy

No Netlify, use:

- Build command: *(vazio)*
- Publish directory: `.`

O arquivo `netlify.toml` já aponta:

- `publish = "."`
- `functions = "netlify/functions"`

### Endpoints serverless

- `/.netlify/functions/salvar`
- `/.netlify/functions/auth_login`
- `/.netlify/functions/auth_status`
- `/.netlify/functions/auth_logout`
- `/.netlify/functions/auth_forgot_password`
- `/.netlify/functions/auth_reset_password`
- `/.netlify/functions/transactions` (GET/POST/DELETE)

### Compatibilidade de Node local

Se seu ambiente local estiver em Node 18, o script `db:init` já usa internamente um runtime Node 20 para executar o comando moderno do Netlify DB.

### Observação importante

Os arquivos PHP (`auth_*.php`, `salvar.php`) foram mantidos apenas como legado/local.
No deploy em Netlify, o fluxo principal usa as Functions JS acima.
As transacoes do dashboard sao persistidas no Postgres (na tabela `transactions`).


👨‍💻 Autor

Fábio Luiz Alves do Nascimento

📍 Camaçari, Bahia - Brasil
💻 Desenvolvedor Front-end (em aprendizado)

GitHub:
https://github.com/fabinhowdev

⭐ Contribuições

Contribuições, sugestões e melhorias são bem-vindas.

Se você gostou do projeto, considere dar uma ⭐ no repositório no GitHub.
