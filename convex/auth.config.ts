export default {
  providers: [
    {
      // Convex Auth handles its own JWT validation
      // This config tells Convex to trust tokens from @convex-dev/auth
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
  ],
}
