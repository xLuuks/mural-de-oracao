# Regras de acesso do Firestore

`firestore.rules` contem a proposta de regras compativel com o fluxo atual do mural. Criar esse arquivo ou executar os testes nao publica regras no Firebase. A configuracao `firebase.emulator.json` e destinada ao emulador local.

## Permissoes propostas

| Operacao | Visitante / conta comum | Administrador |
| :--- | :--- | :--- |
| Ler pedidos | Permitido | Permitido |
| Cadastrar pedido | Permitido, com campos e valores iniciais validados | Mesmas validacoes do formulario publico |
| Registrar oracao | Apenas acrescentar um nome, um ID novo e incrementar o contador em um | Mesmas validacoes de intercessao |
| Editar nome, cidade e texto | Negado | Permitido, com validacao dos campos |
| Finalizar pedido | Negado | Permitido, com timestamp do servidor |
| Excluir pedido | Negado | Permitido |
| Ler ou gravar `updates` | Negado | Negado pelos SDKs cliente |
| Outras colecoes e subcolecoes | Negado | Negado pelos SDKs cliente |

O administrador e identificado pelo UID ja utilizado no aplicativo. Acesso via Console Firebase e SDKs de servidor usa permissoes administrativas proprias, nao as permissoes dos SDKs cliente.

## O que foi corrigido em relacao as regras fornecidas

- `affectedKeys()` considera campos adicionados, removidos e alterados. `changedKeys()` sozinho deixava campos adicionados/removidos fora da restricao.
- O cadastro exige os campos enviados pelo formulario atual, texto de ate 600 caracteres, data do servidor, arrays vazios e contador zero. Campos administrativos ou extras nao sao aceitos na criacao.
- Uma intercessao preserva integralmente os arrays anteriores, incluindo nomes repetidos, acrescentando exatamente uma entrada a cada array. O ID novo nao pode constar no array anterior.
- O contador cresce em um a partir do valor antigo valido; nao precisa ser igual ao tamanho do array de nomes, preservando compatibilidade com a deduplicacao de versoes antigas.
- Pedidos finalizados nao aceitam novas intercessoes.
- O editor administrativo pode alterar nome, cidade e texto juntos, inclusive em pedidos finalizados, sem modificar outros campos.
- A colecao antiga `updates` fica fechada para o aplicativo. Os documentos existentes nao sao apagados.

## Limite importante da identidade local

Visitantes nao autenticam uma conta. O ID salvo em localStorage pode ser apagado ou substituido pelo proprio visitante. As regras garantem integridade de cada alteracao, mas nao comprovam identidade humana nem impedem que alguem registre varios IDs distintos ou envie spam.

Garantias mais fortes exigem uma estrategia adicional de autenticacao e protecao contra abuso. App Check pode complementar a protecao, mas nao substitui regras nem garante uma intercessao por pessoa. As restricoes da chave Google API tambem precisam ser conferidas no Google Cloud separadamente.

## Testar localmente

Requisitos: Node.js compativel com as dependencias de teste, Java 21 e Firebase CLI. Os testes usam somente o projeto demonstrativo `demo-mural-rules` e o emulador em `127.0.0.1:8088`.

```sh
npm --prefix tests/firestore ci
firebase emulators:exec --project demo-mural-rules --only firestore --config firebase.emulator.json "npm --prefix tests/firestore test"
```

Neste ambiente, Java e o emulador foram baixados para `.tools`, sem instalacao global de Java. Para usa-los no PowerShell atual:

```powershell
$env:JAVA_HOME = (Get-ChildItem .tools/java -Directory | Select-Object -First 1).FullName
$env:Path = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:Path
$env:FIREBASE_EMULATORS_PATH = Join-Path (Get-Location) '.tools/firebase-emulators'
```

Se o executavel `firebase` nao estiver no PATH mas a CLI estiver instalada no diretorio global padrao do npm, substitua `firebase` por:

```powershell
node "$env:APPDATA/npm/node_modules/firebase-tools/lib/bin/firebase.js"
```

Os testes cobrem operacoes permitidas e negadas, injeccao/remocao de campos, arrays substituidos, contadores forjados, IDs repetidos, formatos invalidos, dados legados e isolamento administrativo.

## Aplicar no projeto real

Antes de publicar, confira o UID do administrador, as restricoes da chave API e se os testes passam. As regras novas restringem futuros cadastros; documentos existentes nao sao migrados automaticamente.

No Console Firebase, abra o projeto correto, acesse Firestore Database > Regras e substitua o conteudo pela versao de `firestore.rules`. Confira o diff antes de selecionar Publicar. Depois, verifique cadastro, registro de oracao, login, edicao, finalizacao e exclusao no site.

Uma publicacao de regras e independente do deploy no Netlify e do envio ao GitHub. Esta tarefa nao publicou alteracoes no Firebase.

## Referencias

- [Firebase: controle de campos e affectedKeys](https://firebase.google.com/docs/firestore/security/rules-fields).
- [Firebase: operacoes de listas](https://firebase.google.com/docs/reference/rules/rules.List).
- [Firebase: testes de regras no emulador](https://firebase.google.com/docs/firestore/security/test-rules-emulator).
- [Firebase: chaves API](https://firebase.google.com/docs/projects/api-keys).
