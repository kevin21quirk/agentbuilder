import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Loader2, Shield, ExternalLink, LogOut, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface Integration {
  name: string;
  description: string;
  icon: string;
  authType: 'oauth' | 'env';
  oauthReady: boolean;
  setupUrl: string | null;
  connected: boolean;
  connectedAt: string | null;
}

// Map integration name → OAuth provider slug used in backend routes
const OAUTH_SLUGS: Record<string, string> = {
  'Zoho CRM': 'zoho',
  'Google Workspace': 'google',
  'Slack': 'slack',
  'Stripe': 'stripe',
  'WhatsApp': 'whatsapp'
};

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showInstructions, setShowInstructions] = useState(false);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();
      setIntegrations(data);
    } catch (err) {
      console.error('Error fetching integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();

    // Handle OAuth redirect result from URL params
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected) {
      setToast({ type: 'success', message: `${connected} connected successfully via OAuth!` });
      setSearchParams({}, { replace: true });
    } else if (error) {
      const messages: Record<string, string> = {
        unknown_provider: 'Unknown integration provider.',
        no_code: 'OAuth authorization was denied or failed.',
        token_exchange_failed: 'Failed to exchange authorization code for tokens.',
        callback_failed: 'OAuth callback encountered an error.'
      };
      setToast({ type: 'error', message: messages[error] || `OAuth error: ${error}` });
      setSearchParams({}, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleOAuthConnect = (integration: Integration) => {
    const slug = OAUTH_SLUGS[integration.name];
    if (!slug) return;
    // Redirect to backend OAuth authorize endpoint which redirects to provider
    window.location.href = `/api/oauth/${slug}/authorize`;
  };

  const handleEnvConnect = async (name: string) => {
    setActionLoading(name);
    try {
      const res = await fetch(`/api/integrations/${encodeURIComponent(name)}/connect`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: 'error', message: data.hint || data.error });
      } else {
        setToast({ type: 'success', message: `${name} connected!` });
        await fetchIntegrations();
      }
    } catch (err) {
      console.error('Error connecting:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (name: string) => {
    if (!confirm(`Disconnect ${name}? Stored tokens will be revoked.`)) return;
    setActionLoading(name);
    try {
      await fetch(`/api/integrations/${encodeURIComponent(name)}/disconnect`, { method: 'POST' });
      setToast({ type: 'success', message: `${name} disconnected.` });
      await fetchIntegrations();
    } catch (err) {
      console.error('Error disconnecting:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Integrations</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Connect your favorite tools and services</p>
        </div>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff' }}
        >
          <BookOpen className="h-4 w-4 mr-2" />
          {showInstructions ? 'Hide' : 'Show'} Setup Guide
        </button>
      </div>

      {/* Setup Instructions Panel */}
      {showInstructions && (
        <div className="mb-6 rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <BookOpen className="h-5 w-5 mr-2" style={{ color: '#00d4ff' }} />
            Integration Setup Guide
          </h2>
          <p className="text-sm text-blue-200/60 mb-6">Follow these steps to configure OAuth for Zoho CRM and Google Workspace</p>

          {/* Zoho CRM Guide */}
          <div className="mb-4 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setExpandedGuide(expandedGuide === 'zoho' ? null : 'zoho')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔷</span>
                <span className="font-semibold text-white">Zoho CRM Setup</span>
              </div>
              {expandedGuide === 'zoho' ? <ChevronUp className="h-5 w-5" style={{ color: '#6b9fd4' }} /> : <ChevronDown className="h-5 w-5" style={{ color: '#6b9fd4' }} />}
            </button>
            {expandedGuide === 'zoho' && (
              <div className="p-4 pt-0 space-y-4 text-sm" style={{ color: '#b8d4f1' }}>
                <div>
                  <p className="font-semibold text-white mb-2">Step 1: Create OAuth Application</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs" style={{ color: '#6b9fd4' }}>
                    <li>Go to <a href="https://api-console.zoho.com/" target="_blank" rel="noopener" className="underline" style={{ color: '#00d4ff' }}>Zoho API Console</a></li>
                    <li>Click "Add Client" → Select "Server-based Applications"</li>
                    <li>Client Name: <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>Agent Builder Platform</code></li>
                    <li>Homepage URL: <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>http://localhost:5173</code></li>
                    <li>Redirect URI: <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>http://localhost:3001/api/oauth/zoho/callback</code></li>
                    <li>Copy the Client ID and Client Secret</li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold text-white mb-2">Step 2: Add to .env File</p>
                  <pre className="p-3 rounded-lg text-xs overflow-x-auto" style={{ background: 'rgba(0,0,0,0.4)', color: '#00d4ff' }}>{`ZOHO_CLIENT_ID=your_client_id_here
ZOHO_CLIENT_SECRET=your_client_secret_here
ZOHO_REGION=com`}</pre>
                  <p className="text-xs mt-2" style={{ color: '#6b9fd4' }}>Set ZOHO_REGION=eu if your account is in EU</p>
                </div>
                <div>
                  <p className="font-semibold text-white mb-2">Step 3: Restart & Connect</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs" style={{ color: '#6b9fd4' }}>
                    <li>Restart dev server: <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>npm run dev</code></li>
                    <li>Click "Connect" button on Zoho CRM card below</li>
                    <li>Authorize in Zoho consent screen</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Google Workspace Guide */}
          <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setExpandedGuide(expandedGuide === 'google' ? null : 'google')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📧</span>
                <span className="font-semibold text-white">Google Workspace Setup</span>
              </div>
              {expandedGuide === 'google' ? <ChevronUp className="h-5 w-5" style={{ color: '#6b9fd4' }} /> : <ChevronDown className="h-5 w-5" style={{ color: '#6b9fd4' }} />}
            </button>
            {expandedGuide === 'google' && (
              <div className="p-4 pt-0 space-y-4 text-sm" style={{ color: '#b8d4f1' }}>
                <div>
                  <p className="font-semibold text-white mb-2">Step 1: Create Google Cloud Project</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs" style={{ color: '#6b9fd4' }}>
                    <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" className="underline" style={{ color: '#00d4ff' }}>Google Cloud Console</a></li>
                    <li>Click "Select a project" → "New Project"</li>
                    <li>Name: <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>Agent Builder Platform</code></li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold text-white mb-2">Step 2: Enable APIs</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs" style={{ color: '#6b9fd4' }}>
                    <li>Go to "APIs & Services" → "Library"</li>
                    <li>Enable: Gmail API, Google Calendar API, Google Drive API</li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold text-white mb-2">Step 3: Create OAuth Credentials</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs" style={{ color: '#6b9fd4' }}>
                    <li>Go to "APIs & Services" → "Credentials"</li>
                    <li>Click "+ CREATE CREDENTIALS" → "OAuth client ID"</li>
                    <li>Configure consent screen if prompted (External, add your email as test user)</li>
                    <li>Application type: Web application</li>
                    <li>Redirect URI: <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>http://localhost:3001/api/oauth/google/callback</code></li>
                    <li>Copy Client ID and Client Secret</li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold text-white mb-2">Step 4: Add to .env File</p>
                  <pre className="p-3 rounded-lg text-xs overflow-x-auto" style={{ background: 'rgba(0,0,0,0.4)', color: '#00d4ff' }}>{`GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret_here`}</pre>
                </div>
                <div>
                  <p className="font-semibold text-white mb-2">Step 5: Restart & Connect</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs" style={{ color: '#6b9fd4' }}>
                    <li>Restart dev server: <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>npm run dev</code></li>
                    <li>Click "Connect" on Google Workspace card below</li>
                    <li>If you see "This app isn't verified", click Advanced → Continue</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}>
            <p className="text-xs" style={{ color: '#00d4ff' }}>
              💡 <strong>Tip:</strong> Full setup guide available in <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>INTEGRATION_SETUP.md</code> in project root
            </p>
          </div>
        </div>
      )}

      {/* Security banner */}
      <div className="mb-8 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Secure OAuth authentication</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              Integrations use OAuth so you log in directly with each provider. No API keys are entered in the browser. Tokens are stored securely on the server and never exposed to the frontend.
            </p>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center space-x-3 ${
          toast.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 flex-shrink-0" />}
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <div key={integration.name} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl">{integration.icon}</div>
              {integration.connected ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </span>
              ) : integration.oauthReady ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  Ready
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Setup needed
                </span>
              )}
            </div>

            {/* Info */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{integration.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{integration.description}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              {integration.authType === 'oauth' ? 'Connects via OAuth' : 'Connects via environment variables'}
            </p>

            {/* Connected timestamp */}
            {integration.connected && integration.connectedAt && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                Connected {new Date(integration.connectedAt).toLocaleDateString()}
              </p>
            )}

            {/* Actions — pushed to bottom */}
            <div className="mt-auto space-y-2">
              {integration.connected ? (
                <button
                  onClick={() => handleDisconnect(integration.name)}
                  disabled={actionLoading === integration.name}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {actionLoading === integration.name ? 'Disconnecting...' : 'Disconnect'}
                </button>
              ) : integration.oauthReady ? (
                integration.authType === 'oauth' ? (
                  <button
                    onClick={() => handleOAuthConnect(integration)}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-black to-red-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect with {integration.name.split(' ')[0]}
                  </button>
                ) : (
                  <button
                    onClick={() => handleEnvConnect(integration.name)}
                    disabled={actionLoading === integration.name}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-black to-red-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {actionLoading === integration.name ? 'Connecting...' : 'Connect'}
                  </button>
                )
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {integration.authType === 'oauth'
                      ? 'OAuth credentials not configured. An admin needs to register an OAuth app and add the Client ID & Secret to the server .env file.'
                      : 'Environment variables not set. Add them to the server .env file.'}
                  </p>
                  {integration.setupUrl && (
                    <a
                      href={integration.setupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Developer Console
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
