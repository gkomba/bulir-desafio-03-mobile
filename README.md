# Presta-ja: app móvel (Desafio 3)

App React Native (Expo) em TypeScript para a plataforma de contratação de prestadores de serviços. Consome a API do Desafio 1 ([bulir-desafio-01-backend](https://github.com/gkomba/bulir-desafio-01-backend)).

## Funcionalidades

| Perfil | O que faz |
| --- | --- |
| Todos | Entrar com **e-mail ou NIF** e senha, criar conta, ver o histórico de reservas, terminar sessão |
| Cliente | Ver o catálogo (com pesquisa e ordenação), contratar um serviço escolhendo o **dia e a hora**, carregar saldo, cancelar uma reserva (o valor é devolvido), marcar favoritos |
| Prestador (o NIF é só dele) | Criar, editar e excluir os seus serviços, ver o saldo, concluir reservas |

As regras de permissão estão no servidor e a app também as aplica: cada perfil só vê as suas telas. Os formulários validam com Zod, com os mesmos limites da API.

## Executar

1. Subir o backend (ver o README dele). Por defeito escuta em `http://localhost:3000`.
2. `npm install`
3. `npx expo start`, e escolher `a` (Android), `i` (iOS) ou `w` (web).

O endereço da API muda conforme onde a app corre:

| Onde | Endereço |
| --- | --- |
| Emulador Android | `http://10.0.2.2:3000` (já é o padrão) |
| Simulador iOS ou web | `http://localhost:3000` (já é o padrão) |
| Telemóvel real | `EXPO_PUBLIC_API_URL=http://<IP do computador>:3000 npx expo start` |

A app acrescenta `/v1` ao endereço (ver `src/config.ts`).

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
| Catálogo | `GET /services` (paginado: junta as páginas) |
| Serviços do prestador | `GET /services?providerId=` |
| Criar, editar, excluir serviço | `POST`, `PATCH` e `DELETE /services/:id` (`name`, `priceCents`) |
| Contratar | `POST /bookings` com `serviceId` e `scheduledAt`, com `Idempotency-Key` |
| Histórico | `GET /bookings` |
| Cancelar (cliente) e concluir (prestador) | `POST /bookings/:id/cancel` e `/complete` |
| Carregar saldo | `POST /payments` (pagamento simulado, com `Idempotency-Key`) |

Contratar envia uma `Idempotency-Key`, por isso repetir o pedido (por exemplo, com rede instável) não cobra duas vezes. A app verifica o saldo antes, mas quem decide, de forma atómica, é o servidor.

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
| Histórico: serviço, prestador, cliente e valor | `TxRow`, `TransactionsScreen` (filtros, balanço sem as canceladas, ações por perfil) |
| Validações dos formulários | `schemas` e as telas (limites iguais aos da API) |
| Estado local | `favorites` (por utilizador) e `dialog` |

O que **não** cobrem: a aparência das telas, a navegação num emulador ou telemóvel, e a atomicidade das operações de saldo, que é do servidor (testada no backend).

## Limitações conhecidas

- **Nomes no histórico.** A API só devolve os identificadores do prestador e do cliente de cada reserva. A app mostra o nome do próprio utilizador e `#<id>` para a outra parte.
- A API não tem imagens, categorias, avaliações, notificações nem edição de perfil ou da senha, por isso a app não os oferece.
- Os cartões da carteira só guardam os últimos 4 dígitos e servem de escolha na UI: o carregamento é um pagamento simulado pela API.
