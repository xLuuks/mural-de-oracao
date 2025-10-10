# Mural de Oracao

Mural interativo para registrar e acompanhar pedidos de oracao. Visitantes podem enviar pedidos com pre‑visualizacao, escolher cor e fixador (post‑it), ver intercessores e registrar oracoes. Ha modo administrador (Firebase Auth) para editar, finalizar e moderar atualizacoes. Os dados sao salvos em tempo real no Firestore.

Principais recursos
- Envio de pedidos com pre‑visualizacao ao digitar
- Contador de intercessoes e lista de intercessores
- Atualizacoes enviadas pelos usuarios para revisao do admin
- Modo administrador para editar/finalizar/remover pedidos

## Deploy no GitHub Pages

Este projeto e estatico (HTML/CSS/JS), ideal para publicar no GitHub Pages.

1) Subir para o GitHub
- Envie os arquivos: `index.html`, `style.css`, `script.js`, pasta `img/`, `.nojekyll` e este `README.md`.

2) Habilitar GitHub Pages
- Settings → Pages → Branch: `main` e Folder: `/root` (ou `/docs`).
- Aguarde alguns minutos ate o link ficar ativo.

Observacao: usamos caminhos relativos (ex.: `style.css`, `script.js`, `img/...`), entao funciona bem em “project pages”. O arquivo `.nojekyll` evita processamento Jekyll.

3) Autorizar dominio no Firebase (Auth)
- Firebase Console → Authentication → Settings → Authorized domains → Add domain.
- Adicione `seuusuario.github.io` (e o seu dominio custom, se usar). Para testes locais, inclua `localhost` e/ou `127.0.0.1`.

4) Regras do Firestore (seguranca)
Exemplo (troque o UID do admin):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() { return request.auth != null && request.auth.uid == 'qIxfD3Xeu7SvKGb9zf6APMhpFow2'; }

    match /pedidos/{id} {
      allow read: if true;                 // publico le
      allow create: if true;               // publico cria
      allow update, delete: if isAdmin();  // so admin altera/apaga
    }

    match /updates/{id} {
      allow read: if isAdmin();            // so admin ve a fila
      allow create: if true;               // publico envia atualizacao
      allow update: if isAdmin();          // admin marca como lida/recusada
    }
  }
}
```

5) Checklist rapido
- [ ] `.nojekyll` na raiz
- [ ] Pages habilitado no branch correto
- [ ] Dominio do Pages autorizado no Firebase Auth
- [ ] Regras do Firestore revisadas
- [ ] Teste de envio de pedido e painel admin em producao

6) Dicas
- Evite abrir como `file://`; use um servidor local (ex.: `python -m http.server 5500`).
- Se usar dominio custom no Pages, adicione-o tambem ao Firebase (Authorized domains).

