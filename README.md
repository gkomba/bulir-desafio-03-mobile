# Presta-ja: app móvel (Desafio 3)

App React Native (Expo) em TypeScript para a plataforma de contratação de prestadores de serviços. Consome a API do Desafio 1 ([bulir-desafio-01-backend](https://github.com/gkomba/bulir-desafio-01-backend)).

## Funcionalidades

| Perfil | O que faz |
| --- | --- |
| Todos | Entrar com **e-mail ou NIF** e senha, criar conta, ver o histórico de reservas, terminar sessão |
| Cliente | Ver o catálogo (com pesquisa, **categorias** e ordenação), contratar um serviço escolhendo o **dia e a hora**, carregar saldo, cancelar uma reserva (o valor é devolvido), marcar favoritos |
| Prestador (o NIF é só dele) | Criar, editar e excluir os seus serviços (escolhendo a **categoria**), ver o saldo, concluir reservas |

As regras de permissão estão no servidor e a app também as aplica: cada perfil só vê as suas telas. Os formulários validam com Zod, com os mesmos limites da API.

## Executar

1. Subir o backend (ver o README dele). Por defeito escuta em `http://localhost:3000`.
2. `npm install`
3. `npx expo start`, e escolher `a` (Android), `i` (iOS) ou `w` (web).

O endereço da API muda conforme onde a app corre:

| Onde | Endereço |
| --- | --- |
| Telemóvel real, emulador ou simulador, no Expo Go | O IP do computador que serve a app, na porta 3000 (descoberto sozinho; o telemóvel tem de estar na mesma Wi-Fi) |
| Web | `http://localhost:3000` |
| O Expo não dá um IP (modo túnel, ou uma app instalada fora do Expo Go) | `10.0.2.2` no emulador Android e `localhost` no simulador iOS. **Num telemóvel real, `EXPO_PUBLIC_API_URL` é obrigatória** |
| Uma API hospedada, ou para forçar um endereço | `EXPO_PUBLIC_API_URL=https://<endereço da API> npx expo start` (manda sobre tudo o resto) |

A app acrescenta `/v1` ao endereço (ver `src/config.ts`). A API tem de escutar em `0.0.0.0` (o Docker Compose já o faz), para se chegar a ela pelo IP da rede. Para voltar ao comportamento antigo no emulador, use `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000`. Se, num telemóvel, aparecer "Sem ligação ao servidor", confirme que a API está a correr, que o telemóvel e o computador estão na mesma rede e que a firewall do computador deixa entrar a porta 3000.

## Autenticação

A API do Desafio 1 autentica por cookies `HttpOnly`, que uma app React Native não guarda nem reenvia de forma fiável. Por isso o backend aceita agora o cabeçalho `X-Client-Type: mobile`: o login devolve os tokens no corpo e o access token vai em `Authorization: Bearer` (alterações no backend: [#15](https://github.com/gkomba/bulir-desafio-01-backend/pull/15) e, para o login por NIF, [#16](https://github.com/gkomba/bulir-desafio-01-backend/pull/16)).

- Os dois tokens e o utilizador ficam em estado global (Zustand) e no armazenamento seguro do dispositivo (`expo-secure-store`).
- Quando um pedido dá `401`, o cliente HTTP renova o access token com o refresh token e repete o pedido. Há uma só renovação de cada vez, porque o refresh token roda e dois pedidos em paralelo revogariam a sessão. Se a renovação falhar, a sessão termina.
- "Terminar sessão" revoga o refresh token no servidor.

## Contrato com a API

`src/api/index.ts` é o único sítio que conhece o formato da API e converte-o para os tipos da app. A API guarda dinheiro em **cêntimos**; a app mostra e edita Kwanzas.

| Na app | Na API |
| --- | --- |
| Login com e-mail ou NIF | `POST /auth/login` com `{ email }` ou `{ nif }` |
| Criar conta | `POST /auth/register`, e depois login |
| Utilizador e saldo | `GET /auth/me` |
| Catálogo | `GET /services` (paginado: junta as páginas; cada serviço traz a `category`) |
| Serviços do prestador | `GET /services?providerId=` |
| Criar, editar, excluir serviço | `POST`, `PATCH` e `DELETE /services/:id` (`name`, `priceCents`, `category`, `imageUrl`) |
| Imagem do serviço | `POST /services/image-signature` (só prestadores) e envio direto ao Cloudinary |
| Contratar | `POST /bookings` com `serviceId` e `scheduledAt`, com `Idempotency-Key` |
| Histórico | `GET /bookings` (cada reserva traz `clientName` e `providerName`) |
| Cancelar (cliente) e concluir (prestador) | `POST /bookings/:id/cancel` e `/complete` |
| Carregar saldo | `POST /payments` (pagamento simulado, com `Idempotency-Key`) |

Contratar envia uma `Idempotency-Key`, por isso repetir o pedido (por exemplo, com rede instável) não cobra duas vezes. A app verifica o saldo antes, mas quem decide, de forma atómica, é o servidor.

## Imagens dos serviços

O prestador escolhe uma foto ao criar ou editar um serviço. O ficheiro nunca passa pela API.

- **Antes de enviar** (`src/imageUpload.ts`): a foto é reduzida (lado maior a 1280 px, nunca ampliada) e comprimida em JPEG, com uma qualidade cada vez menor (0,8 a 0,4) e, se for preciso, um tamanho menor (1024 e 800 px) até ficar abaixo de 450 KB. Cada tentativa parte do original, e o JPEG não leva os metadados da câmara, por isso a localização da foto não sai do telemóvel. Só se envia ao guardar o serviço, e por isso desistir não deixa imagens esquecidas.
- **Envio** (`src/cloudinaryUpload.ts`): com a assinatura que o backend dá, diretamente ao Cloudinary, com progresso, limite de tempo e uma repetição se falhar a rede. Uma recusa nunca se repete.
- **Ao mostrar** (`src/images.ts`): pede-se ao Cloudinary a imagem já no tamanho do sítio e da densidade do ecrã, arredondado a escalões (96, 192, 320, 480, 720, 1080 e 1440 px, para a rede de distribuição reaproveitar as versões), com recorte no assunto, formato e qualidade automáticos (`c_fill,g_auto,q_auto,f_auto`). Enquanto carrega, aparece uma mancha desfocada de 24 px. O `expo-image` guarda as imagens em memória e em disco, e as primeiras 8 da lista de serviços descarregam-se antes de aparecerem. Sem imagem, ou se falhar, mostra-se o ícone da categoria.

## Estrutura

```
App.tsx              sessão, fontes e React Query
src/api/             cliente HTTP (Bearer e refresh) e camada de API
src/navigation/      rotas por perfil (React Navigation)
src/screens/         telas
src/components/      componentes reutilizáveis
src/store/           estado global (Zustand): sessão, favoritos, cartões, diálogos
src/hooks/           consultas (React Query) e a contratação
src/schemas.ts       validação dos formulários (Zod)
```

Ecossistema: React Query (consulta e cache), Zustand (estado), React Hook Form com Zod (formulários), Axios.

## Verificações

```bash
npm run typecheck
npm run lint
npm test
```

## Testes

Jest com `jest-expo` e a React Native Testing Library. Os testes ficam ao lado do código (`*.test.ts` e `*.test.tsx`) e correm sem rede nem emulador. A API é simulada por um servidor falso (`src/api/testing.ts`) que troca o adaptador do cliente HTTP: o pedido passa por todos os interceptors reais (Bearer, renovação da sessão) e o teste vê exatamente o que a app enviou.

O que cobrem, pelos pontos do enunciado:

| Enunciado | Testes |
| --- | --- |
| Login com e-mail ou NIF, token guardado | `schemas`, `LoginScreen`, `api/index`, `store/auth` (envia `{ email }` ou `{ nif }`, guarda a sessão, recupera-a ao abrir a app) |
| Sessão e renovação do token | `api/client` (Bearer, renovação num 401, uma só de cada vez, quando a sessão termina e quando não) |
| Serviços: criar, listar, editar e excluir | `ServiceFormScreen`, `MyServicesScreen`, `api/index` (`PATCH`, preço em cêntimos, lista só do prestador) |
| Apenas prestadores gerem serviços e só clientes contratam | `navigation` (cada perfil só vê as suas telas e só faz os seus pedidos) |
| Só clientes veem os serviços e contratam | `ExploreScreen` (pesquisa e ordenação), `ServiceDetailScreen` (com saldo segue para o pagamento, sem saldo leva à carteira) |
| Contratar com verificação de saldo | `CheckoutScreen`, `useHire` (saldo igual ao preço chega, a menos não; chave de idempotência; duplo toque) |
| Atualizar o saldo do cliente e do prestador | `WalletScreen`, `TransactionsScreen` (cancelar devolve o valor, o saldo é relido) |
| Histórico: serviço, prestador, cliente e valor | `TxRow` (mostra o nome das duas partes), `TransactionsScreen` (filtros, balanço sem as canceladas, ações por perfil) |
| Categorias dos serviços | `constants`, `CategoryRow`, `ServiceFormScreen`, `ExploreScreen` (filtro, também vindo do início) |
| Validações dos formulários | `schemas` e as telas (limites iguais aos da API) |
| Estado local | `favorites` (por utilizador) e `dialog` |

O que **não** cobrem: a aparência das telas, a navegação num emulador ou telemóvel, e a atomicidade das operações de saldo, que é do servidor (testada no backend).

## Limitações conhecidas

- A API não tem avaliações, notificações nem edição de perfil ou da senha, por isso a app não os oferece. Uma imagem substituída ou tirada continua no Cloudinary (apagá-la exigiria o segredo no servidor). Os serviços sem imagem mostram o ícone da categoria.
- As categorias são uma lista fixa de 8 (Casa, Beleza, Tecnologia, Educação, Saúde, Eventos, Automóvel e Outros). A API guarda só o código (`HOME`, `BEAUTY`…); os nomes em português estão em `src/constants.ts`. Os serviços criados antes das categorias aparecem em "Outros".
- Os cartões da carteira só guardam os últimos 4 dígitos e servem de escolha na UI: o carregamento é um pagamento simulado pela API.
