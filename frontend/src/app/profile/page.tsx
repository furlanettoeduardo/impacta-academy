'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, PenLine, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignaturePad, type SignaturePadHandle } from '@/components/SignaturePad';
import { apiRequest, isAuthError } from '@/lib/api';
import { clearToken, getToken } from '@/lib/auth';

type Profile = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PROFESSOR' | 'ALUNO';
  isActive: boolean;
  signatureUrl?: string | null;
  createdAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const roleLabels: Record<Profile['role'], string> = {
  ADMIN: 'Administrador',
  PROFESSOR: 'Professor',
  ALUNO: 'Aluno',
};

async function uploadSignature(blob: Blob, token: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', blob, 'assinatura.png');

  const response = await fetch(`${API_URL}/upload/signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const body = await response.json();
  if (!response.ok) {
    const message = body?.message ?? 'Erro ao enviar assinatura.';
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return body.url as string;
}

type Feedback = { type: 'success' | 'error'; message: string } | null;

function FeedbackText({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p
      className={`text-sm ${
        feedback.type === 'error' ? 'text-destructive' : 'text-emerald-600'
      }`}
    >
      {feedback.message}
    </p>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountFeedback, setAccountFeedback] = useState<Feedback>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

  const [removeSignature, setRemoveSignature] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const [signatureFeedback, setSignatureFeedback] = useState<Feedback>(null);
  const signaturePadRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    apiRequest<Profile>('/users/me', { token })
      .then((user) => {
        setProfile(user);
        setName(user.name);
        setEmail(user.email);
        setLoadError('');
      })
      .catch((err) => {
        setLoadError(
          err instanceof Error ? err.message : 'Erro ao carregar o perfil.',
        );
        if (isAuthError(err)) {
          clearToken();
          router.replace('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleSaveAccount = async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    if (!name.trim() || !email.trim()) {
      setAccountFeedback({ type: 'error', message: 'Preencha nome e e-mail.' });
      return;
    }

    setSavingAccount(true);
    setAccountFeedback(null);

    try {
      const updated = await apiRequest<Profile>('/users/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      setProfile(updated);
      setName(updated.name);
      setEmail(updated.email);
      setAccountFeedback({
        type: 'success',
        message: 'Dados atualizados com sucesso.',
      });
    } catch (err) {
      setAccountFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Erro ao atualizar os dados.',
      });
    } finally {
      setSavingAccount(false);
    }
  };

  const handleChangePassword = async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'Preencha todos os campos de senha.',
      });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordFeedback({
        type: 'error',
        message: 'A nova senha deve ter pelo menos 6 caracteres.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'A confirmação não confere com a nova senha.',
      });
      return;
    }

    setSavingPassword(true);
    setPasswordFeedback(null);

    try {
      await apiRequest<Profile>('/users/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ currentPassword, password: newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({
        type: 'success',
        message: 'Senha alterada com sucesso.',
      });
    } catch (err) {
      setPasswordFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Erro ao alterar a senha.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveSignature = async () => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const pad = signaturePadRef.current;
    let signatureUrl: string | undefined;

    setSavingSignature(true);
    setSignatureFeedback(null);

    try {
      if (pad && !pad.isEmpty()) {
        const blob = await pad.toBlob();
        if (blob) {
          signatureUrl = await uploadSignature(blob, token);
        }
      } else if (removeSignature) {
        // String vazia remove a assinatura no backend.
        signatureUrl = '';
      }

      if (signatureUrl === undefined) {
        setSignatureFeedback({
          type: 'error',
          message: 'Desenhe uma nova assinatura antes de salvar.',
        });
        return;
      }

      const updated = await apiRequest<Profile>('/users/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ signatureUrl }),
      });
      setProfile(updated);
      setRemoveSignature(false);
      pad?.clear();
      setSignatureFeedback({
        type: 'success',
        message: updated.signatureUrl
          ? 'Assinatura atualizada com sucesso.'
          : 'Assinatura removida com sucesso.',
      });
    } catch (err) {
      setSignatureFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Erro ao salvar a assinatura.',
      });
    } finally {
      setSavingSignature(false);
    }
  };

  const canManageSignature =
    profile?.role === 'ADMIN' || profile?.role === 'PROFESSOR';

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Meu perfil
          </motion.h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie as configurações da sua conta
          </p>
        </div>

        {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando perfil...</p>
        ) : profile ? (
          <>
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Dados da conta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      className="h-11"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      className="h-11"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Perfil</Label>
                    <Input
                      className="h-11"
                      value={roleLabels[profile.role]}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Membro desde</Label>
                    <Input
                      className="h-11"
                      value={new Date(profile.createdAt).toLocaleDateString('pt-BR')}
                      disabled
                    />
                  </div>
                </div>
                <FeedbackText feedback={accountFeedback} />
                <Button
                  className="gap-2"
                  onClick={handleSaveAccount}
                  disabled={savingAccount}
                >
                  <Save className="h-4 w-4" /> Salvar alterações
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Alterar senha
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Senha atual</Label>
                    <Input
                      className="h-11"
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nova senha</Label>
                    <Input
                      className="h-11"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar nova senha</Label>
                    <Input
                      className="h-11"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </div>
                </div>
                <FeedbackText feedback={passwordFeedback} />
                <Button
                  className="gap-2"
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                >
                  <KeyRound className="h-4 w-4" /> Alterar senha
                </Button>
              </CardContent>
            </Card>

            {canManageSignature ? (
              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Assinatura
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Sua assinatura é exibida nos certificados dos cursos em que
                    você é instrutor.
                  </p>
                  {profile.signatureUrl && !removeSignature ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={profile.signatureUrl}
                        alt="Assinatura atual"
                        className="h-12 rounded-md border border-border bg-white p-1"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRemoveSignature(true)}
                        disabled={savingSignature}
                      >
                        <Trash2 className="h-4 w-4" /> Remover assinatura
                      </Button>
                    </div>
                  ) : null}
                  <div className="max-w-xl space-y-2">
                    <SignaturePad ref={signaturePadRef} disabled={savingSignature} />
                    <p className="text-xs text-muted-foreground">
                      {profile.signatureUrl && !removeSignature
                        ? 'Desenhe para substituir a assinatura atual.'
                        : 'Desenhe a assinatura com o mouse ou o dedo. O fundo é removido automaticamente e a imagem é salva em WebP.'}
                    </p>
                  </div>
                  <FeedbackText feedback={signatureFeedback} />
                  <Button
                    className="gap-2"
                    onClick={handleSaveSignature}
                    disabled={savingSignature}
                  >
                    <PenLine className="h-4 w-4" /> Salvar assinatura
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
