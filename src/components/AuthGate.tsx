import { ChangeEvent, FormEvent, useCallback, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Check, X } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';

import { getSupabaseClient } from '../lib/supabaseClient';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Slider } from './ui/slider';
import logoUrl from '../assets/logo.png';

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
  const supabase = useMemo(() => getSupabaseClient(), []);
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
    <div className="min-h-screen grid grid-cols-3 max-md:grid-cols-1 max-md:px-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="col-start-2 max-md:col-start-1 flex w-full max-w-4xl flex-col items-center space-y-6 py-4 text-center">
        <img
          src={logoUrl}
          alt="Myth Archive"
          className="h-48 w-48 bg-white object-contain dark:border-gray-800"
        />
        <div className="space-y-2">
          <h1 className="font-display text-4xl text-gray-900 dark:text-gray-100">Myth Archive</h1>
        </div>

        <Card className="w-full gap-6 border border-gray-200 bg-white p-6 text-left shadow-lg dark:border-gray-800 dark:bg-gray-900">
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
              className="w-full rounded-xl bg-blue-500 text-base font-semibold text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,0.65)] hover:bg-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-blue-400 dark:hover:bg-blue-300 dark:focus-visible:ring-blue-300 dark:focus-visible:ring-offset-gray-900"
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'signIn' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="col-span-4 space-y-3 text-sm md:col-span-1">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                <span>{message}</span>
              </div>
            )}
          </div>
        </Card>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          {mode === 'signIn' ? "Don't have an account?" : 'Already registered?'}{' '}
          <button
            type="button"
            onClick={toggleMode}
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
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
            <div className="relative h-64 w-full overflow-hidden rounded-lg bg-gray-900/80">
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
