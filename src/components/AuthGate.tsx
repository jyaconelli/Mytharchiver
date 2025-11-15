import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Check, X } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';

import { getSupabaseClient } from '../lib/supabaseClient';
import { Button } from './ui/button';
import { Card, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { TypewriterText } from './TypewriterText';
import { Slider } from './ui/slider';
import logoUrl from '../assets/logo.png';

const TYPEWRITER_TEXT = `a myth can be understood as a culturally embedded narrative form that simultaneously serves
        as a mode of knowing, a symbolic vocabulary, a metaphysical architecture, a social charter,
        a psychological projection, a structural mechanism, a ritual script, and an
        identity-generating device and it accomplishes all of these simultaneously because myths
        articulate cosmological assumptions about how the world came into being, why it has the
        shape it does, and what kinds of causal or supernatural forces sustain it while also
        transforming chaotic reality into an ordered cosmos through narratives that do not pretend
        to empirical truth yet achieve a deeper kind of explanatory resonance, and at the same time
        myth functions, in the Malinowskian sense, as a “charter” that legitimizes kinship systems,
        gender roles, authority structures, ritual obligations, and systems of economic or political
        power by rooting them in primordial precedent or divine sanction so that what a society does
        becomes framed as necessary, timeless, and natural rather than contingent or contestable,
        and simultaneously myths operate in the psychoanalytic sense as symbolic externalizations of
        unconscious processes so that the heroic journeys, sacrifices, metamorphoses, descents to
        the underworld, divine mothers, trickster figures, and cosmic battles all reflect archetypal
        patterns of anxiety, desire, individuation, loss, maturation, and reconciliation, thus
        making myth a kind of shared dreamwork in which individual and collective psyches converge,
        and simultaneously myths in the Lévi-Straussian structuralist model function not primarily
        as stories but as systems of binary oppositions (nature/culture, life/death, chaos/order,
        male/female, sky/earth, raw/cooked, sacred/profane) which are endlessly recombined in order
        to mediate contradictions embedded in the social world so that myth becomes a symbolic
        machine that produces intellectual resolution where practical resolution is impossible, and
        simultaneously myth in the ritualist and phenomenological frameworks (Eliade, Turner, etc.)
        is not only something told but something enacted such that reciting or performing a myth
        allows participants to reenter mythic time—an atemporal sacred interval that collapses
        historical sequence into a perennial origin point—thereby regenerating the cosmos, the
        community, and the self through periodic reactivation of foundational narratives, making
        myth a temporal bridge between “then” and “now,” and simultaneously myth functions as a
        medium of identity formation by offering populations a coherent genealogy and symbolic
        vocabulary through which they define who they are, where they come from, what unites them,
        and what boundaries distinguish them from outsiders, so that national myths, ancestral
        myths, founding epics, and heroic genealogies become indispensable tools for shaping
        collective memory and belonging, and simultaneously myth persists in modernity, even in
        ostensibly rational and scientific societies, by migrating into new forms such as consumer
        culture’s narratives of transformation and salvation through commodities, technology
        culture’s utopian myths of innovation and disruption, political movements’ mythic framings
        of corruption, purity, rebirth, struggle, and destiny, and media franchises that produce new
        pantheons of superheroes, invented cosmologies, and secular creation stories that satisfy
        the same deep narrative impulses once met by divine sagas, and because all these dimensions
        coexist and interweave, a myth can be synthesized as a culturally authoritative,
        symbolically dense, ritually reactivatable narrative-structure that encodes fundamental
        patterns of meaning, resolves or conceals structural contradictions, provides frameworks for
        collective identity, legitimizes social organization, articulates unconscious psychic life,
        and sustains a community’s sense of reality, meaning that myth is simultaneously story,
        explanation, ideology, ritual, dream, symbol, cognitive schema, and existential scaffold,
        all operating at once without requiring internal consistency, historical accuracy, or
        logical coherence, so that ultimately a myth may be described as an enormous,
        ever-recycling, boundary-blurring narrative-symbolic-ritual apparatus through which human
        beings, across all cultures and eras, transform chaos into order, uncertainty into
        intelligibility, contingency into necessity, and existence into something that feels
        coherent, purposeful, and livable, even if that coherence is produced through narrative
        rather than fact, through symbolism rather than reason, and through collective imagination
        rather than empirical demonstration, and thus myth is both ancient and modern, both
        psychological and sociological, both structural and poetic, both sacred and political, and
        it continues to operate beneath, within, and alongside all systems of human meaning whether
        we acknowledge it or not because myth is not something cultures once had but something they
        cannot stop generating.`;

type AuthMode = 'signIn' | 'signUp';

const PASSWORD_REQUIREMENTS = [
  {
    label: 'At least 6 characters long',
    test: (value: string) => value.length >= 6,
  },
  {
    label: 'Includes an uppercase letter',
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    label: 'Includes a lowercase letter',
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    label: 'Includes a number',
    test: (value: string) => /[0-9]/.test(value),
  },
] as const;

export function AuthGate() {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarDataUrl, setAvatarDataUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarSource, setAvatarSource] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [textLength, setTextLength] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => setTextLength((n) => n + Math.round(Math.random())), 50);
    return () => clearInterval(interval);
  }, []);

  const supabase = useMemo<ReturnType<typeof getSupabaseClient> | null>(() => {
    try {
      return getSupabaseClient();
    } catch (error) {
      if (typeof window === 'undefined') {
        return null;
      }
      throw error;
    }
  }, []);
  const emailRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) {
        setError('Unable to read the selected image. Please try a different file.');
        return;
      }
      setAvatarSource(result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setShowCropper(true);
    };
    reader.onerror = () => {
      setError('Unable to read the selected image. Please try a different file.');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCropCancel = useCallback(() => {
    setShowCropper(false);
    setCroppedAreaPixels(null);
    if (!avatarPreview) {
      setAvatarSource(null);
    } else {
      setAvatarSource(avatarPreview);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [avatarPreview]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleZoomChange = useCallback((value: number[] | readonly number[]) => {
    setZoom(typeof value[0] === 'number' ? value[0] : 1);
  }, []);

  const handleCropConfirm = useCallback(async () => {
    if (!avatarSource) {
      return;
    }
    try {
      const croppedImage = await getCroppedImage(avatarSource, croppedAreaPixels);
      setAvatarDataUrl(croppedImage);
      setAvatarPreview(croppedImage);
      setAvatarSource(croppedImage);
      setShowCropper(false);
      setCroppedAreaPixels(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError('We hit a snag cropping that image. Try choosing a different file.');
    }
  }, [avatarSource, croppedAreaPixels]);

  const handleOpenCropper = useCallback(() => {
    if (!avatarPreview) {
      return;
    }
    setAvatarSource(avatarPreview);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setShowCropper(true);
  }, [avatarPreview]);

  const handleCropperOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleCropCancel();
      } else {
        setShowCropper(true);
      }
    },
    [handleCropCancel],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const trimmedDisplayName = displayName.trim();

    if (mode === 'signUp') {
      if (!trimmedDisplayName) {
        setError('Please add a display name so collaborators recognize you.');
        return;
      }
      if (!avatarDataUrl) {
        setError('Please upload and crop a profile image to continue.');
        return;
      }
      const unmetRequirement = PASSWORD_REQUIREMENTS.find((rule) => !rule.test(password));
      if (unmetRequirement) {
        setError(`Password requirement not met: ${unmetRequirement.label}.`);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'signIn') {
        if (!supabase) {
          setError('Authentication client is unavailable. Please refresh the page.');
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
        }
      } else {
        if (!supabase) {
          setError('Authentication client is unavailable. Please refresh the page.');
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo,
            data: {
              display_name: trimmedDisplayName,
              avatar_url: avatarDataUrl,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
        } else {
          setMessage('Check your inbox to confirm the sign up request.');
          setMode('signIn');
          setPassword('');
          setConfirmPassword('');
          setDisplayName('');
          setAvatarDataUrl('');
          setAvatarPreview(null);
          setAvatarSource(null);
          setCrop({ x: 0, y: 0 });
          setZoom(1);
          setCroppedAreaPixels(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
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
    setDisplayName('');
    setAvatarDataUrl('');
    setAvatarPreview(null);
    setAvatarSource(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setPassword('');
    setConfirmPassword('');
  };

  const passwordHints =
    mode === 'signUp'
      ? PASSWORD_REQUIREMENTS.map((rule) => ({
          label: rule.label,
          ok: rule.test(password),
        }))
      : [];

  const allRequirementsMet = passwordHints.length > 0 && passwordHints.every((hint) => hint.ok);
  const passwordsMatch = password === confirmPassword;
  return (
    <div className="min-h-screen bg-white grid grid-cols-3 max-md:grid-cols-1 max-md:px-4 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
      <div className="h-screen w-screen fixed grid grid-cols-7 gap-2 opacity-30">
        <div className="overflow-hidden flex font-robot text-justify z-0">
          {TYPEWRITER_TEXT.substring(
            Math.floor(textLength / 2),
            (textLength + textLength / 2) % TYPEWRITER_TEXT.length,
          )}
        </div>
        <div className="overflow-hidden flex font-robot text-justify z-0">
          {TYPEWRITER_TEXT.substring(
            textLength % TYPEWRITER_TEXT.length,
            (2 * textLength) % TYPEWRITER_TEXT.length,
          )}
        </div>
        <div className="overflow-hidden flex font-robot text-justify z-0">
          {TYPEWRITER_TEXT.substring(
            (2 * textLength) % TYPEWRITER_TEXT.length,
            (3 * textLength) % TYPEWRITER_TEXT.length,
          )}
        </div>
        <div className="overflow-hidden flex font-robot text-justify z-0">
          {TYPEWRITER_TEXT.substring(
            (3 * textLength) % TYPEWRITER_TEXT.length,
            (4 * textLength) % TYPEWRITER_TEXT.length,
          )}
        </div>
        <div className="overflow-hidden flex font-robot text-justify z-0">
          {TYPEWRITER_TEXT.substring(
            (4 * textLength) % TYPEWRITER_TEXT.length,
            (5 * textLength) % TYPEWRITER_TEXT.length,
          )}
        </div>
        <div className="overflow-hidden flex font-robot text-justify z-0">
          {TYPEWRITER_TEXT.substring(
            (6 * textLength) % TYPEWRITER_TEXT.length,
            (7 * textLength) % TYPEWRITER_TEXT.length,
          )}
        </div>
        <div className="overflow-hidden flex font-robot text-justify z-0">
          {TYPEWRITER_TEXT.substring(
            (7 * textLength) % TYPEWRITER_TEXT.length,
            (8 * textLength) % TYPEWRITER_TEXT.length,
          )}
        </div>
      </div>
      <div className="z-10 col-start-2 max-md:col-start-1 flex w-full max-w-4xl flex-col items-center space-y-6 py-4 text-center">
        <img
          src={logoUrl}
          alt="Myth Archive"
          className="h-48 w-48 object-contain dark:border-gray-800"
        />

        <Card className="w-full bg-background gap-6 border border-black p-6 text-left dark:border-gray-800 dark:bg-gray-900">
          <CardHeader>
            <h1 className="font-display bg-background px-2 text-6xl text-foreground dark:text-gray-100">
              Myth Archive
            </h1>
          </CardHeader>
          <form onSubmit={handleSubmit} className="col-span-4 space-y-4 md:col-span-3">
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

            {mode === 'signUp' && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Display name"
                  required
                />
              </div>
            )}

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
                placeholder={
                  mode === 'signIn' ? 'At least 6 characters' : 'Create a strong password'
                }
              />
              {mode === 'signUp' &&
                password &&
                (allRequirementsMet ? (
                  <p className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Password meets all requirements.</span>
                  </p>
                ) : (
                  <ul className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    {passwordHints.map((hint) => (
                      <li key={hint.label} className="flex items-center gap-2">
                        {hint.ok ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
                        )}
                        <span className={hint.ok ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                          {hint.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>

            {mode === 'signUp' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                  />
                  {confirmPassword && (
                    <p
                      className={`flex items-center gap-2 text-xs ${
                        passwordsMatch
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {passwordsMatch ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {passwordsMatch ? 'Passwords match.' : 'Passwords do not match yet.'}
                      </span>
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profileImage">Profile image</Label>
                  <input
                    ref={fileInputRef}
                    id="profileImage"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Profile preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[0.65rem] uppercase text-gray-400">
                          Upload
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {avatarPreview ? 'Choose a different image' : 'Upload image'}
                      </Button>
                      {avatarPreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="justify-start px-0 text-blue-600 hover:text-blue-500 dark:text-blue-400"
                          onClick={handleOpenCropper}
                        >
                          Re-crop image
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Square images look best.
                  </p>
                </div>
              </>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full text-base font-semibold text-white hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'signIn' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="col-span-4 space-y-3 text-sm md:col-span-1">
            {error && (
              <div className="flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                <span>{message}</span>
              </div>
            )}
          </div>
        </Card>

        <p className="text-sm text-gray-600 dark:text-gray-400 bg-background p-3">
          {mode === 'signIn' ? "Don't have an account?" : 'Already registered?'}{' '}
          <button
            type="button"
            onClick={toggleMode}
            className="font-medium font-robot text-blue-600 hover:opacity-50 animate-bounce underline dark:text-blue-400"
          >
            {mode === 'signIn' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>

      <Dialog open={showCropper} onOpenChange={handleCropperOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Crop profile image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative h-64 w-full overflow-hidden bg-gray-900/80">
              {avatarSource ? (
                <Cropper
                  image={avatarSource}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  showGrid={false}
                />
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatarZoom">Zoom</Label>
              <Slider
                id="avatarZoom"
                min={1}
                max={3}
                step={0.1}
                value={[zoom]}
                onValueChange={handleZoomChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCropCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCropConfirm}>
              Use image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function getCroppedImage(source: string, area: Area | null): Promise<string> {
  const image = await createImage(source);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not access 2D canvas context.');
  }

  let cropArea = area;
  if (!cropArea) {
    const size = Math.min(image.width, image.height);
    cropArea = {
      x: (image.width - size) / 2,
      y: (image.height - size) / 2,
      width: size,
      height: size,
    };
  }

  const originalWidth = Math.max(1, Math.round(cropArea.width));
  const originalHeight = Math.max(1, Math.round(cropArea.height));
  const LONG_EDGE_TARGET = 256;
  const scale = Math.min(1, LONG_EDGE_TARGET / Math.max(originalWidth, originalHeight));
  const scaledWidth = Math.max(1, Math.round(originalWidth * scale));
  const scaledHeight = Math.max(1, Math.round(originalHeight * scale));
  canvas.width = scaledWidth;
  canvas.height = scaledHeight;

  context.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    scaledWidth,
    scaledHeight,
  );

  return canvas.toDataURL('image/jpeg', 0.85);
}

function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image.'));
    image.src = src;
  });
}
