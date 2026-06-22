import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../features/auth/useAuthStore';
import { useUiStore } from '../../store';
import { isSupabaseConfigured } from '../../lib/supabase';

const OPEN_AUTH_EVENT = 'open-auth-popover';

export function requestAuthPopover() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_AUTH_EVENT));
  }
}

export function AuthButton() {
  const language = useUiStore((state) => state.language);
  const authUser = useAuthStore((store) => store.user);
  const authStatus = useAuthStore((store) => store.status);
  const authError = useAuthStore((store) => store.error);
  const signInWithPassword = useAuthStore((store) => store.signInWithPassword);
  const signUp = useAuthStore((store) => store.signUp);
  const resendVerificationEmail = useAuthStore((store) => store.resendVerificationEmail);
  const signOut = useAuthStore((store) => store.signOut);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [info, setInfo] = useState('');
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cn = language === 'cn';
  const errorId = 'auth-modal-error';
  const infoId = 'auth-modal-info';

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_AUTH_EVENT, handler);
    return () => window.removeEventListener(OPEN_AUTH_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!open) {
      setLocalError('');
      setInfo('');
      setNeedsEmailVerification(false);
      setPassword('');
      setConfirmPassword('');
      return;
    }
    // Escape 关闭 + Tab 焦点陷阱
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    // 打开时自动聚焦对话框
    const focusTimer = window.setTimeout(() => {
      const firstInput = dialogRef.current?.querySelector<HTMLElement>('input, button');
      firstInput?.focus();
    }, 50);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
      // 关闭时恢复焦点到触发按钮
      triggerRef.current?.focus();
    };
  }, [open]);

  if (!isSupabaseConfigured) {
    return null;
  }

  const handleSubmit = async () => {
    setLocalError('');
    setInfo('');
    if (!email.trim().includes('@')) {
      setLocalError(cn ? '请输入有效邮箱。' : 'Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setLocalError(cn ? '密码至少 6 位。' : 'Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setLocalError(cn ? '两次输入的密码不一致。' : 'Passwords do not match.');
      return;
    }
    try {
      if (mode === 'signin') {
        await signInWithPassword(email.trim(), password);
        if (!useAuthStore.getState().error) {
          setOpen(false);
        }
      } else {
        await signUp(email.trim(), password);
        setInfo(cn ? '注册成功，请检查邮箱（包括垃圾邮件）并完成验证后再登录。' : 'Signed up. Check your inbox (and spam) to verify before signing in.');
        setNeedsEmailVerification(true);
        setMode('signin');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'VERIFY_EMAIL') {
        setInfo(cn ? '注册成功，请检查邮箱（包括垃圾邮件）并完成验证后再登录。' : 'Signed up. Check your inbox (and spam) to verify before signing in.');
        setNeedsEmailVerification(true);
        setMode('signin');
      } else {
        setLocalError(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };

  const handleResendVerification = async () => {
    setLocalError('');
    setInfo('');
    if (!email.trim().includes('@')) {
      setLocalError(cn ? '请输入有效邮箱。' : 'Enter a valid email address.');
      return;
    }
    await resendVerificationEmail(email.trim());
    if (!useAuthStore.getState().error) {
      setInfo(cn ? '验证邮件已重新发送，请检查邮箱（包括垃圾邮件）。' : 'Verification email resent. Check your inbox (and spam).');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  const label = authUser ? authUser.email ?? authUser.id : cn ? '登录/注册' : 'Sign in / Sign up';
  const describedBy = [localError || authError ? errorId : null, info ? infoId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="auth-button-wrap">
      <button
        type="button"
        className="auth-button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="auth-modal"
        ref={triggerRef}
      >
        <span className="auth-button-label" title={authUser ? authUser.email ?? authUser.id : undefined}>{label}</span>
      </button>
      {open && (
        <div className="auth-modal-overlay" onClick={() => setOpen(false)}>
          <div
            id="auth-modal"
            ref={dialogRef}
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            aria-describedby={describedBy}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="auth-modal-close" onClick={() => setOpen(false)} aria-label={cn ? '关闭' : 'Close'}>×</button>

            {authUser ? (
              <>
                <h2 id="auth-modal-title" className="auth-modal-title">{cn ? '账号信息' : 'Account'}</h2>
                <div className="auth-modal-id">
                  <small>{cn ? '专属用户 ID' : 'User ID'}</small>
                  <strong>{authUser.id}</strong>
                  {authUser.email && <span>{authUser.email}</span>}
                </div>
                <button type="button" className="auth-modal-action" onClick={handleSignOut} disabled={authStatus === 'loading'}>
                  {authStatus === 'loading' ? (cn ? '处理中…' : 'Working…') : cn ? '退出登录' : 'Sign out'}
                </button>
              </>
            ) : (
              <>
                <h2 id="auth-modal-title" className="auth-modal-title">{mode === 'signin' ? (cn ? '登录' : 'Sign in') : (cn ? '注册' : 'Sign up')}</h2>
                <p className="auth-modal-hint">{cn ? '登录后可创建专属关系空间' : 'Sign in to create a private relationship space'}</p>
                <input
                  className="auth-modal-input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={cn ? '邮箱' : 'Email'}
                  type="email"
                  aria-label={cn ? '邮箱' : 'Email'}
                />
                <input
                  className="auth-modal-input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={cn ? '密码（至少 6 位）' : 'Password (min 6 chars)'}
                  type="password"
                  aria-label={cn ? '密码' : 'Password'}
                />
                {mode === 'signup' && (
                  <input
                    className="auth-modal-input"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={cn ? '确认密码' : 'Confirm password'}
                    type="password"
                    aria-label={cn ? '确认密码' : 'Confirm password'}
                  />
                )}
                <button type="button" className="auth-modal-action" onClick={handleSubmit} disabled={authStatus === 'loading'}>
                  {authStatus === 'loading' ? (cn ? '处理中…' : 'Working…') : mode === 'signin' ? (cn ? '登录' : 'Sign in') : (cn ? '注册' : 'Sign up')}
                </button>
                <div className="auth-modal-switch">
                  {mode === 'signin' ? (
                    <span>{cn ? '还没有账号？' : 'No account?'} <button type="button" onClick={() => { setMode('signup'); setLocalError(''); setInfo(''); }}>{cn ? '去注册' : 'Sign up'}</button></span>
                  ) : (
                    <span>{cn ? '已有账号？' : 'Have an account?'} <button type="button" onClick={() => { setMode('signin'); setLocalError(''); setInfo(''); }}>{cn ? '去登录' : 'Sign in'}</button></span>
                  )}
                </div>
                {(localError || authError) && (
                  <small id={errorId} className="auth-modal-error" role="alert">
                    {localError || (authError && /invalid login credentials/i.test(authError)
                      ? (cn
                          ? '邮箱或密码错误。若刚注册，请检查邮箱验证邮件并完成验证后再登录。'
                          : 'Invalid email or password. If you just signed up, please verify your email first.')
                      : authError)}
                  </small>
                )}
                {needsEmailVerification && mode === 'signin' && (
                  <button type="button" className="auth-modal-resend" onClick={handleResendVerification} disabled={authStatus === 'loading'}>
                    {authStatus === 'loading' ? (cn ? '发送中…' : 'Sending…') : (cn ? '重新发送验证邮件' : 'Resend verification email')}
                  </button>
                )}
                {info && <small id={infoId} className="auth-modal-info">{info}</small>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
