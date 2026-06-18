---
name: OpenAPI default vs server default
description: OpenAPI spec `default:` values get codegen'd into Zod schemas and silently win over server-side fallbacks.
---

## Rule
Never put `default:` on optional query parameters in the OpenAPI spec if the server is supposed to control the default behavior. Remove the `default:` and let the server code use `?? serverDefault`.

## Why
Orval codegen translates `default: 10` in the spec to `zod.coerce.number().default(10)` in the generated Zod schema. When the route parses `req.query` with `.safeParse()`, if the parameter is absent, Zod fills in `10` and `parsed.data.count` is never `undefined`, so the server's `?? QUESTIONS.length` fallback never runs.

## How to apply
- Remove `default:` from optional query params in `lib/api-spec/openapi.yaml`
- Re-run `pnpm --filter @workspace/api-spec run codegen`
- The server route should then use `parsed.data.count ?? serverDefault` as the sole source of truth
