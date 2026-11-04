# Client integration

Use `/graphql` with JSON variables. Keep tokens, passwords and email links out of URLs, logs and analytics. Bearer JWTs and single-use 96-character email tokens are different credentials.

```sh
curl http://localhost:8000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation($input:CredentialsInput!){signIn(input:$input){accessToken}}","variables":{"input":{"email":"you@example.com","password":"your-password"}}}'
```

Authenticated requests add `Authorization: Bearer <jwt>`. `Accept-Language: ka-GE, en;q=0.8` chooses email language; application message keys are translated by the client. `me` returns `id`, email, optional names/image, verification state and ISO timestamps. Optional absent fields resolve to null.

```graphql
mutation ChangePassword($input: UpdatePasswordInput!) {
  updatePassword(input: $input) {
    accessToken
  }
}
```

Use `oldPassword`/`newPassword` in this input. Persist the replacement access token after credential changes. Email update may return an optional replacement token. Reset/verification request responses intentionally avoid revealing whether an arbitrary email exists where the service applies enumeration protection.

## Multipart upload

```sh
curl http://localhost:8000/graphql \
  -H 'Authorization: Bearer <jwt>' \
  -H 'X-GraphQL-Preflight: 1' \
  -F 'operations={"query":"mutation($file:File!){uploadImage(file:$file){id image}}","variables":{"file":null}}' \
  -F 'map={"0":["variables.file"]}' \
  -F '0=@avatar.png;type=image/png'
```

The upload returns its ID and a public conversion URL. Attach it with `mutation { updateAvatar(imageId: "<id>") { messageKey } }`. Ownership is checked server-side. Only JPEG/PNG with matching decoded content is accepted; avatar output is bounded WebP. Never send a base64 string or JSON object as File.

## Error handling

```json
{
  "data": { "me": null },
  "errors": [
    {
      "message": "auth.authentication_required",
      "path": ["me"],
      "extensions": { "code": "UNAUTHENTICATED", "status": 401 }
    }
  ]
}
```

Handle errors even for HTTP 200. Use `extensions.details` for field validation. Do not display an internal exception or assume the whole document rolled back when one mutation field fails. The response header `X-Request-Id` identifies the request for support.

Export the combined SDL for client code generation. Production schema introspection is disabled; obtain the reviewed artifact rather than enabling it globally.
