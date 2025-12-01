'use client';

import { useState } from 'react';

const EMAIL_TYPES = [
  {
    id: 'pr-opened',
    name: 'PR Opened',
    description: 'Sent when a user opens a PR linked to a bounty',
    sender: 'no-reply@luccilabs.xyz',
    fields: ['to', 'username', 'prNumber', 'prTitle', 'repoFullName', 'bountyAmount', 'tokenSymbol', 'issueNumber']
  },
  {
    id: 'bounty-expired',
    name: 'Bounty Expired',
    description: 'Sent when a bounty expires without being closed',
    sender: 'no-reply@luccilabs.xyz',
    fields: ['to', 'username', 'bountyAmount', 'tokenSymbol', 'issueNumber', 'issueTitle', 'repoFullName']
  },
  {
    id: 'error',
    name: 'Error Notification',
    description: 'Sent to user AND ops when an error affects them',
    sender: 'no-reply@luccilabs.xyz',
    fields: ['to', 'username', 'errorType', 'errorMessage', 'context', 'repoFullName', 'issueNumber']
  },
  {
    id: 'beta-received',
    name: 'Beta Application Received',
    description: 'Sent when a user submits a beta application',
    sender: 'beta@luccilabs.xyz',
    fields: ['to', 'username']
  },
  {
    id: 'beta-approved',
    name: 'Beta Application Approved',
    description: 'Sent when a beta application is approved',
    sender: 'beta@luccilabs.xyz',
    fields: ['to', 'username']
  },
  {
    id: 'beta-rejected',
    name: 'Beta Application Rejected',
    description: 'Sent when a beta application is rejected',
    sender: 'beta@luccilabs.xyz',
    fields: ['to', 'username']
  }
];

const DEFAULT_VALUES = {
  to: '',
  username: 'testuser',
  prNumber: '42',
  prTitle: 'Fix authentication bug',
  repoFullName: 'lucci-xyz/bounty',
  bountyAmount: '100.00',
  tokenSymbol: 'USDC',
  issueNumber: '15',
  issueTitle: 'Authentication fails on mobile',
  errorType: 'Payment Processing Error',
  errorMessage: 'Transaction failed: insufficient gas',
  context: 'Attempted to process bounty payout after PR merge'
};

export default function TestEmailsPage() {
  const [selectedType, setSelectedType] = useState(EMAIL_TYPES[0]);
  const [formData, setFormData] = useState(DEFAULT_VALUES);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType.id,
          ...formData
        })
      });

      const data = await response.json();
      setResult({
        success: response.ok,
        data
      });
    } catch (error) {
      setResult({
        success: false,
        data: { error: error.message }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type) => {
    setSelectedType(type);
    setResult(null);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-teal-400">Email Testing Console</h1>
        <p className="text-zinc-400 mb-8">Test email notifications before deploying to production</p>

        {/* Email Type Selector */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Email Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {EMAIL_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => handleTypeChange(type)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  selectedType.id === type.id
                    ? 'border-teal-500 bg-teal-500/10'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <div className="font-medium text-sm">{type.name}</div>
                <div className="text-xs text-zinc-500 mt-1">{type.sender}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Type Info */}
        <div className="mb-6 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-teal-400 font-medium">{selectedType.name}</span>
            <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded text-zinc-400">
              {selectedType.sender}
            </span>
          </div>
          <p className="text-sm text-zinc-400">{selectedType.description}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedType.fields.map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5 capitalize">
                  {field.replace(/([A-Z])/g, ' $1').trim()}
                  {field === 'to' && <span className="text-red-400 ml-1">*</span>}
                </label>
                <input
                  type={field === 'to' ? 'email' : 'text'}
                  value={formData[field] || ''}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  placeholder={field === 'to' ? 'recipient@example.com' : DEFAULT_VALUES[field]}
                  required={field === 'to'}
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !formData.to}
            className="mt-6 w-full py-3 px-6 bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Test Email
              </>
            )}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className={`mt-6 p-4 rounded-lg border ${
            result.success 
              ? 'bg-emerald-500/10 border-emerald-500/50' 
              : 'bg-red-500/10 border-red-500/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className={`font-medium ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.success ? 'Email sent successfully!' : 'Failed to send email'}
              </span>
            </div>
            <pre className="text-xs text-zinc-400 bg-zinc-900/50 p-3 rounded overflow-x-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}

        {/* Gmail Config Status */}
        <div className="mt-8 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Configuration Checklist</h3>
          <ul className="text-sm text-zinc-500 space-y-1">
            <li>• <code className="text-zinc-400">GMAIL_SERVICE_ACCOUNT_JSON</code> must be set in environment</li>
            <li>• Service account must have domain-wide delegation enabled</li>
            <li>• Gmail API scope <code className="text-zinc-400">https://www.googleapis.com/auth/gmail.send</code> must be authorized</li>
            <li>• Sender addresses must be configured as aliases in Google Workspace</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

