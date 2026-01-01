import { Plugs, ArrowRight } from '@phosphor-icons/react'

export function IntegrationPage() {
  const integrations = [
    {
      name: 'Zapier',
      description: 'Connect to 5,000+ apps and automate your workflows',
      status: 'coming-soon',
    },
    {
      name: 'Slack',
      description: 'Get notifications and updates in your Slack channels',
      status: 'coming-soon',
    },
    {
      name: 'Google Calendar',
      description: 'Sync events with your Google Calendar',
      status: 'coming-soon',
    },
    {
      name: 'Stripe',
      description: 'Accept payments and manage ticketing',
      status: 'coming-soon',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple/10 mb-4">
          <Plugs size={32} weight="duotone" className="text-purple" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Integrations</h1>
        <p className="text-muted-foreground">
          Connect open-event with your favorite tools and services
        </p>
        <span className="inline-block mt-4 px-3 py-1 text-sm font-medium bg-purple/10 text-purple rounded-full">
          Coming Soon
        </span>
      </div>

      {/* Integration Cards */}
      <div className="space-y-3">
        {integrations.map((integration) => (
          <div
            key={integration.name}
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl opacity-60"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Plugs size={20} weight="duotone" className="text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{integration.name}</h3>
                <p className="text-sm text-muted-foreground">{integration.description}</p>
              </div>
            </div>
            <button
              disabled
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-muted-foreground bg-muted rounded-lg cursor-not-allowed"
            >
              Connect
              <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Notify Me */}
      <div className="mt-12 p-6 bg-accent/50 border border-accent rounded-xl text-center">
        <h3 className="font-medium text-foreground mb-2">
          Want to be notified when integrations launch?
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          We&apos;ll let you know as soon as integrations are available.
        </p>
        <button className="px-4 py-2 bg-foreground text-background font-medium text-sm rounded-lg hover:opacity-90 transition-opacity">
          Notify Me
        </button>
      </div>
    </div>
  )
}
