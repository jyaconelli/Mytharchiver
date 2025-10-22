import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

type AuthMode = 'signIn' | 'signUp';

export function AuthGate() {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signIn') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          setMessage('Check your inbox to confirm the sign up request.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'signIn' ? 'signUp' : 'signIn'));
    setError(null);
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Myth Archive</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {mode === 'signIn'
              ? 'Sign in to continue organizing myth variants.'
              : 'Create an account to start building your myth archive.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              placeholder="At least 6 characters"
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'signIn' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            <span>{message}</span>
          </div>
        )}

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          {mode === 'signIn' ? "Don't have an account?" : 'Already registered?'}{' '}
          <button
            type="button"
            onClick={toggleMode}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {mode === 'signIn' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </Card>
    </div>
  );
}
