# Five Bells Wallet [![circle][circle-image]][circle-url]

[circle-image]: https://circleci.com/gh/interledger/five-bells-wallet.svg?style=shield&circle-token=65d802e1ea641aabcc95f8d28f2c6ade577716a9
[circle-url]: https://circleci.com/gh/interledger/five-bells-wallet

Five Bells Wallet

## Installation

```bash
npm install
```

## Running Dev Server

```bash
npm run dev
```

## Building and Running Production Server

```bash
npm run build
npm run start
```

Use the following configuration options as environment variables:

* `API_PRIVATE_HOSTNAME` Private API hostname
* `API_HOSTNAME` Publicly visible API hostname
* `API_PORT` Publicly visible API port
* `API_DB_URI` (e.g.: postgres://root:password@localhost/wallet) URI for connecting to a database.    
* `API_SESSION_SECRET` App session secret
* `API_LEDGER_URI` Ledger URI (requests go to this uri)
* `API_LEDGER_PUBLIC_URI` Ledger public URI
* `API_LEDGER_ADMIN_NAME` Ledger admin username
* `API_LEDGER_ADMIN_PASS` Ledger admin password
* `API_CONDITION_SECRET` Condition secret
* `API_RELOAD` Turn on/off the reload endpoint
* `API_TRACK_GA` Google Analytics Tracking ID
* `API_TRACK_MIXPANEL` Mixpanel Tracking ID
* `API_GITHUB_CLIENT_ID` Github application client id (used for github oauth)
* `API_GITHUB_CLIENT_SECRET` Github application client secret (used for github oauth)
* `API_MAILGUN_API_KEY` Mailgun api key (for sending emails)
* `API_MAILGUN_DOMAIN` One of the domains attached to the Mailgun account
* `CLIENT_HOST` Publicly visible hostname
* `CLIENT_PORT` Publicly visible port
* `SENTRY_URI` Sentry tracking uri (getsentry.com)
* `WALLET_FORCE_HTTPS` Force all connections to use HTTPS
* `WALLET_TRUST_XFP_HEADER` Trust the `X-Forwarded-Proto` header

### API docs
[http://interledger.org/five-bells-wallet/apidoc](http://interledger.org/five-bells-wallet/apidoc/)

### Webfinger
Five Bells Wallet supports webfinger lookups.

Example request 
```bash
curl -X GET
https://wallet.example/.well-known/webfinger?resource=acct:alice@wallet.example
```

Example response 
```bash
HTTP/1.1 200 OK
{
  "subject": "acct:alice@wallet.example",
  "links": [
    {
      "rel": "http://webfinger.net/rel/ledgerUri",
      "href": "http://wallet.example/ledger"
    },
    {
      "rel": "http://webfinger.net/rel/ledgerAccount",
      "href": "http://wallet.example/ledger/accounts/alice"
    },
    {
      "rel": "http://webfinger.net/rel/socketIOUri",
      "href": "http://wallet.example/api/socket.io"
    }
  ]
}
```

### Using Redux DevTools

In development, Redux Devtools are enabled by default. You can toggle visibility and move the dock around using the following keyboard shortcuts:

- <kbd>Ctrl+H</kbd> Toggle DevTools Dock
- <kbd>Ctrl+Q</kbd> Move Dock Position
- see [redux-devtools-dock-monitor](https://github.com/gaearon/redux-devtools-dock-monitor) for more detail information.

### Theme customization

`npm install` generates a `src/theme/variables.scss` which contains the theme colors. You can manually edit it.
