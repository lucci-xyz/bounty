const DEFAULT_EXTERNAL_META = Object.freeze({
  target: '_blank',
  rel: 'noopener noreferrer'
});

const freezeMeta = (meta = {}) => Object.freeze({ ...meta });
const staticLink = (href, meta = {}) => Object.freeze({ type: 'static', href, meta });
const dynamicLink = (builder, meta = {}) => Object.freeze({ type: 'dynamic', builder, meta });

const internalStatic = (href, meta) => staticLink(href, freezeMeta(meta));
const internalDynamic = (builder, meta) => dynamicLink(builder, freezeMeta(meta));
const externalStatic = (href, meta) => staticLink(href, freezeMeta({ ...DEFAULT_EXTERNAL_META, ...meta }));
const externalDynamic = (builder, meta) => dynamicLink(builder, freezeMeta({ ...DEFAULT_EXTERNAL_META, ...meta }));

const requireParams = (params = {}, keys = []) => {
  const missing = keys.filter((key) => params[key] === undefined || params[key] === null || params[key] === '');
  if (missing.length > 0) {
    throw new Error(`Missing link parameters: ${missing.join(', ')}`);
  }
  return params;
};

const trimTrailingSlash = (value) => value.replace(/\/$/, '');

const freezeSection = (section) => Object.freeze(section);

export const LINKS = Object.freeze({
  app: freezeSection({
    marketingSite: externalStatic('https://bountypay.luccilabs.xyz'),
    frontendLocal: internalStatic('http://localhost:3000'),
    manifestFallback: externalStatic('https://example.com'),
    vercelDeployment: internalDynamic(({ hostname }) => {
      const { hostname: safeHost } = requireParams({ hostname: hostname && hostname.trim() }, ['hostname']);
      return trimTrailingSlash(`https://${safeHost}`);
    })
  }),
  github: freezeSection({
    orgRoot: externalStatic('https://github.com/lucci-xyz'),
    appListing: externalStatic('https://github.com/apps/bountypay'),
    appInstallation: externalStatic('https://github.com/apps/bountypay/installations/new'),
    userProfile: externalDynamic(({ username }) => {
      const { username: safeUsername } = requireParams({ username }, ['username']);
      return `https://github.com/${safeUsername}`;
    }),
    issue: externalDynamic(({ repoFullName, issueNumber }) => {
      const { repoFullName: repo, issueNumber: issue } = requireParams({ repoFullName, issueNumber }, ['repoFullName', 'issueNumber']);
      return `https://github.com/${repo}/issues/${issue}`;
    }),
    pullRequest: externalDynamic(({ repoFullName, prNumber }) => {
      const {
        repoFullName: repo,
        prNumber: pullNumber
      } = requireParams({ repoFullName, prNumber }, ['repoFullName', 'prNumber']);
      return `https://github.com/${repo}/pull/${pullNumber}`;
    }),
    oauthAuthorize: externalDynamic(({ queryString }) => {
      const { queryString: qs } = requireParams({ queryString }, ['queryString']);
      return `https://github.com/login/oauth/authorize?${qs}`;
    }),
    oauthAccessToken: externalStatic('https://github.com/login/oauth/access_token'),
    apiUser: externalStatic('https://api.github.com/user')
  }),
  social: freezeSection({
    githubOrg: externalStatic('https://github.com/lucci-xyz'),
    discord: externalStatic('https://discord.gg/MWxWzRVSx'),
    xProfile: externalStatic('https://x.com/LucciLabs')
  }),
  services: freezeSection({
    resendEmail: externalStatic('https://api.resend.com/emails')
  }),
  explorers: freezeSection({
    baseMainnet: externalStatic('https://basescan.org'),
    baseMainnetTx: externalDynamic(({ txHash }) => {
      const { txHash: hash } = requireParams({ txHash }, ['txHash']);
      return `https://basescan.org/tx/${hash}`;
    }),
    baseSepolia: externalStatic('https://sepolia.basescan.org'),
    baseSepoliaTx: externalDynamic(({ txHash }) => {
      const { txHash: hash } = requireParams({ txHash }, ['txHash']);
      return `https://sepolia.basescan.org/tx/${hash}`;
    }),
    mezoMainnet: externalStatic('https://explorer.mezo.org'),
    mezoMainnetTx: externalDynamic(({ txHash }) => {
      const { txHash: hash } = requireParams({ txHash }, ['txHash']);
      return `https://explorer.mezo.org/tx/${hash}`;
    }),
    mezoTestnet: externalStatic('https://explorer.test.mezo.org'),
    mezoTestnetTx: externalDynamic(({ txHash }) => {
      const { txHash: hash } = requireParams({ txHash }, ['txHash']);
      return `https://explorer.test.mezo.org/tx/${hash}`;
    })
  }),
  rpc: freezeSection({
    baseMainnet: internalStatic('https://mainnet.base.org'),
    baseSepolia: internalStatic('https://sepolia.base.org'),
    mezoMainnet: internalStatic('https://rpc-http.mezo.boar.network'),
    mezoPublic: internalStatic('https://rpc.test.mezo.org'),
    mezoLavender: internalStatic('https://testnet-rpc.lavenderfive.com:443/mezo/'),
    mezoDrpc: internalStatic('https://mezo-testnet.drpc.org')
  }),
  assets: freezeSection({
    fontsApiPreconnect: internalStatic('https://fonts.googleapis.com'),
    fontsStaticPreconnect: internalStatic('https://fonts.gstatic.com'),
    fontsDmSansAndFriends: internalStatic(
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&display=swap'
    ),
    badgeBase: externalStatic('https://img.shields.io/badge'),
    badgeLinkWallet: externalStatic('https://img.shields.io/badge/Link_Wallet-00827B?style=for-the-badge&logo=ethereum&logoColor=white')
  }),
  metadata: freezeSection({
    svgXmlns: internalStatic('http://www.w3.org/2000/svg')
  }),
  protocols: freezeSection({
    https: internalStatic('https://'),
    http: internalStatic('http://')
  })
});

const getSpec = (section, key) => {
  const spec = LINKS?.[section]?.[key];
  if (!spec) {
    throw new Error(`Unknown link reference: ${String(section)}.${String(key)}`);
  }
  return spec;
};

const ensureHref = (href, section, key) => {
  if (typeof href !== 'string' || href.length === 0) {
    throw new Error(`Failed to resolve link for ${section}.${key}`);
  }
  return href;
};

export function resolveLink(section, key, params) {
  const spec = getSpec(section, key);
  if (spec.type === 'dynamic') {
    return {
      href: ensureHref(spec.builder(params ?? {}), section, key),
      meta: spec.meta
    };
  }

  return {
    href: ensureHref(spec.href, section, key),
    meta: spec.meta
  };
}

export function getLinkHref(section, key, params) {
  return resolveLink(section, key, params).href;
}

export function getLinkMeta(section, key, params) {
  return resolveLink(section, key, params).meta;
}

