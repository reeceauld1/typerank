import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function Contact() {
  useDocumentTitle('contact');
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mailtoFallback = () => {
    const bodyLines = [
      message.trim(),
      '',
      contactEmail.trim() ? `Reply-to: ${contactEmail.trim()}` : null,
      `Page: ${window.location.href}`,
    ].filter((line): line is string => line !== null);
    const subject = encodeURIComponent('Contact — typeladder');
    const body = encodeURIComponent(bodyLines.join('\n'));
    window.location.href = `mailto:contact@typeladder.com?subject=${subject}&body=${body}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) {
      mailtoFallback();
      return;
    }

    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from('contact_messages').insert({
      user_id: user?.id ?? null,
      message: message.trim(),
      contact_email: contactEmail.trim() || null,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
    });
    setSubmitting(false);

    if (insertError) {
      setError("Couldn't submit that — try again, or email contact@typeladder.com directly.");
      return;
    }
    setDone(true);
  };

  return (
    <div className="flex-1 flex flex-col py-10 px-6">
      <div className="max-w-2xl w-full mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-correct)]">contact</h1>
        <Link
          to="/"
          className="text-sm border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-secondary)] px-4 py-2 rounded-lg transition-colors"
        >
          back to test
        </Link>
      </div>

      <div className="max-w-2xl w-full mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
        {done ? (
          <p className="text-[var(--accent)] text-sm">Thanks — your message was sent.</p>
        ) : (
          <>
            <p className="text-[var(--text-muted)] text-sm mb-6">
              Questions, feedback, or a feature you'd like to see? Send it below — no email client needed. Found
              something broken instead?{' '}
              <Link to="/report-bug" className="text-[var(--accent)] hover:underline">
                report a bug
              </Link>{' '}
              here.
            </p>
            <form onSubmit={e => void handleSubmit(e)} className="flex flex-col gap-3">
              <textarea
                required
                rows={6}
                placeholder="What's on your mind? Feature requests welcome too."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-correct)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none"
              />
              <input
                type="email"
                placeholder="your email (optional, if you want a reply)"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
                className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-correct)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />

              {error && <p className="text-[var(--text-incorrect)] text-xs">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full bg-[var(--accent)] hover:brightness-110 disabled:opacity-50 text-[var(--bg)] px-6 py-2.5 rounded-lg font-semibold transition-all cursor-pointer"
              >
                {submitting ? '...' : 'send message'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
