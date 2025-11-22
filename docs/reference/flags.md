# Feature Flags

The app uses Vercel’s Flags SDK plus Edge Config for all feature rollouts. This file covers the minimal steps required to read or add a flag.

## 1. Prerequisites

1. **Edge Config item** – In the Vercel dashboard create (or reuse) an Edge Config and add a JSON item named `flags`:

   ```json
   {
     "improved-nav": false,
     "beta-wallet-flow": true
   }
   ```

2. **Environment variable** – Add the Edge Config connection string (from the dashboard) as `EDGE_CONFIG` in every environment and in `.env.local`.

3. **Optional local overrides** – For quick local testing set `FLAGS_LOCAL_OVERRIDES='{"flag-key":true}'` (stringified JSON).

## 2. Defining or editing flags

All definitions live in `shared/lib/flags/index.js`. To add a flag:

```js
const newFlag = createFlagDeclaration({
  name: 'newFeature',
  key: 'new-feature',
  description: 'Short explanation',
  defaultValue: false,
  options: [
    { label: 'Off', value: false },
    { label: 'On', value: true }
  ]
});

export const flagRegistry = {
  ...,
  newFeature
};
```

Values resolve in this order:

1. `FLAGS_LOCAL_OVERRIDES`
2. Edge Config `flags` item
3. `defaultValue`

Custom transforms can further tweak the decision (see `betaWalletFlow` for a cohort example).

## 3. Reading flags on the server

```js
import { getFlags, getFlagValue } from '@/shared/lib/flags';

const flags = await getFlags();              // returns { improvedNav: false, ... }
const betaWallet = await getFlagValue('betaWalletFlow');
```

`getFlags()` batches every declaration once per request, so prefer it inside layouts, route handlers, or server actions.

## 4. Reading flags on the client

`app/layout.jsx` injects values into a `FlagProvider`, so client components can call the hook:

```js
'use client';
import { useFlag } from '@/shared/providers/FlagProvider';

const showNewNav = useFlag('improvedNav', false);
```

The current set is also exposed as `data-flag-*` attributes on `<body>` for quick inspection.

## 5. Flags Explorer / Toolbar

- `app/.well-known/vercel/flags/route.js` exposes metadata for Vercel’s Flags Explorer.
- `FlagsInspector` renders `<FlagDefinitions />` and `<FlagValues />` so overrides show up in the toolbar.

With these pieces in place you can safely gate new UI or API behavior behind Edge-configured flags without shipping new builds.


