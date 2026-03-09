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

Este projeto possui backend em PHP (`auth_*.php`, `salvar.php`) para login/cadastro/sessão.
Por isso, **deploy estático puro (ex.: Netlify sem Functions)** não executa essas rotas e o frontend não recebe JSON válido.

Para funcionar em produção, use uma das opções:

1. Hospedar frontend + PHP em um servidor com suporte a PHP/MySQL (Apache/Nginx + PHP-FPM).
2. Manter frontend no Netlify e mover a API para outro host com PHP, ajustando o prefixo da API no frontend.
3. Reescrever as rotas PHP como funções serverless compatíveis com a plataforma escolhida.

### Opção 2 (Netlify + API PHP externa)

No frontend, configure a base da API no arquivo `src/js/runtime-config.js` antes do deploy:

```js
window.__API_BASE_URL__ = "https://sua-api.exemplo.com/";
```

No backend PHP, configure as variáveis de ambiente:

- `APP_FRONTEND_URL=https://seu-site.netlify.app`
- `CORS_ALLOW_ORIGINS=https://seu-site.netlify.app`
- `COOKIE_SAMESITE=None`
- `COOKIE_SECURE=true`

Observações:

- `APP_FRONTEND_URL` também é usado para montar o link de redefinição de senha enviado por e-mail.
- Em produção HTTPS, `SameSite=None` exige `Secure=true` para o cookie de sessão funcionar entre domínios.


👨‍💻 Autor

Fábio Luiz Alves do Nascimento

📍 Camaçari, Bahia - Brasil
💻 Desenvolvedor Front-end (em aprendizado)

GitHub:
https://github.com/fabinhowdev

⭐ Contribuições

Contribuições, sugestões e melhorias são bem-vindas.

Se você gostou do projeto, considere dar uma ⭐ no repositório no GitHub.
