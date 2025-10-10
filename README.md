# Mural de Oração

Mural interativo para registrar e acompanhar pedidos de oração. Visitantes podem enviar pedidos (com pré‑visualização em tempo real), escolher cor do post‑it e fixador (pin), ver intercessores e registrar orações. Há modo administrador (Firebase Auth) para editar, finalizar e moderar atualizações. Os dados são salvos em tempo real no Firestore (Cloud Firestore).

## Recursos
- Envio de pedidos com pré‑visualização ao digitar
- Contador e lista de intercessores (com prevenção de múltiplos registros por usuário local)
- Atualizações de pedidos enviadas pelos usuários para revisão do admin
- Painel lateral de atualizações para o admin (marcar como lida/recusar)
- Modo administrador: editar texto do post‑it, finalizar e remover pedidos
- UX mobile aprimorada (empilhamento de formulário/preview e botão de envio dedicado)

## Tecnologias
- HTML/CSS/JS puro (sem build)
- Firebase compat SDK (via CDN): Auth + Firestore
- GitHub Pages para deploy estático

## Estrutura de pastas
```
/
├─ index.html         # página principal
├─ style.css          # estilos (inclui ajustes para mobile)
├─ script.js          # lógica de UI + integração Firebase
├─ img/               # imagens e ícones usados no site
├─ .nojekyll          # evita processamento Jekyll no GitHub Pages
└─ README.md          # este arquivo
```

## Como usar
- Clique em "Novo Pedido" para abrir o formulário.
- Digite seu pedido; a pré‑visualização à direita (ou abaixo no mobile) vai se atualizando.
- Escolha a cor do post‑it e o fixador (pin) e envie.
- Nos cards, use "Desejo orar" para registrar uma oração. "Ver intercessores" mostra a lista.
- Admin: use "Entrar como administrador", informe email/senha do admin. A interface mostra botões de editar/finalizar/remover e o painel de atualizações.

## Roadmap (ideias)
- Filtro/pesquisa de pedidos
- Modo escuro com `prefers-color-scheme`
- Exportar pedidos (CSV/JSON)
- Auditoria simples de ações de admin

## Atribuição recomendada
Embora o código esteja sob uma licença permissiva, recomenda‑se manter uma referência clara à origem do projeto ao reutilizar ou criar derivados:

- Incluir no README ou em um arquivo `NOTICE` a nota:
  - "Baseado em 'Mural de Oração' desenvolvido por Lucas Augusto para o Instituto Bíblico do Norte (IBN)."
- Se houver uma página “Sobre” ou créditos na interface, opcionalmente exibir: "Mural de Oração — Instituto Bíblico do Norte" com link para o repositório original.
- Respeitar as restrições de marca e imagens descritas em `ASSETS-LICENSE.md` (logo do IBN com direitos reservados e pinos/ícone sujeitos à licença da Canva).

Documentos úteis:
- Política e Termos: `Politica-e-Termos.md`
- Licença de assets: `ASSETS-LICENSE.md`
