import {
  sendPasswordReset, signInWithEmail, signInWithGoogle, signUpWithEmail
} from './firebase.js';

let mode = 'login';
let authMessage = '';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const brandIcon = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 6 1.5 1.5L8 5M11 6h9M4 12l1.5 1.5L8 11m3 1h9M4 18l1.5 1.5L8 17m3 1h9"/></svg>';

function readableError(error) {
  const code = error?.code || '';
  if (code.includes('unauthorized-domain')) return 'This address is not authorized yet. Add localhost in Firebase Authentication → Settings → Authorized domains.';
  if (code.includes('operation-not-allowed')) return code.includes('email') ? 'Enable Email/Password in Firebase Authentication → Sign-in method.' : 'Enable Google in Firebase Authentication → Sign-in method.';
  if (code.includes('email-already-in-use')) return 'An account already uses this email. Switch to Log in instead.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'That email and password do not match an account.';
  if (code.includes('weak-password')) return 'Choose a password with at least 6 characters.';
  if (code.includes('invalid-email')) return 'Enter a valid email address.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Wait a little while and try again.';
  if (code.includes('popup-closed')) return 'The Google sign-in window was closed before finishing.';
  return error?.message || 'Could not complete sign-in. Please try again.';
}

function busy(value) {
  const submit = $('#auth-submit'), google = $('#google-sign-in');
  if (submit) { submit.disabled = value; submit.textContent = value ? (mode === 'signup' ? 'Creating account…' : 'Logging in…') : (mode === 'signup' ? 'Create account' : 'Log in'); }
  if (google) { google.disabled = value; google.innerHTML = `${googleMark()}${value ? 'Connecting…' : 'Continue with Google'}`; }
}

function googleMark() {
  return '<svg class="google-mark" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.15A11 11 0 0 0 1 12c0 1.78.43 3.46 1.15 4.95l3.69-2.84Z"/><path fill="#EA4335" d="M12 5.36c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.85 6.05l3.69 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"/></svg>';
}

export function renderAuthPage() {
  const signup = mode === 'signup';
  document.body.classList.add('auth-view');
  $('#app').innerHTML = `<main class="auth-page">
    <header class="auth-topbar"><a class="auth-brand" href="#/">${brandIcon}<span>TaskFlow</span></a><div class="auth-top-note">${signup ? 'Already have an account?' : 'New to TaskFlow?'} <button class="auth-switch-inline" data-auth-mode="${signup ? 'login' : 'signup'}">${signup ? 'Log in' : 'Create account'}</button></div></header>
    <div class="auth-layout"><section class="auth-story"><div class="eyebrow"><span class="eyebrow-dot"></span> YOUR WORK, IN FLOW</div><h1>${signup ? 'Build a calmer way to work.' : 'Make room for what matters.'}</h1><p class="auth-lead">Plan projects, move tasks forward, and keep your whole workspace in sync.</p>
      <div class="auth-preview" aria-label="TaskFlow workspace preview"><div class="preview-top"><div><span class="preview-kicker">YOUR WORKSPACE</span><h2>Today at a glance</h2></div><span class="preview-live"><i></i> Live</span></div><div class="preview-stats"><div><span>Open tasks</span><strong>12</strong></div><div><span>In progress</span><strong>4</strong></div><div><span>Completed</span><strong>8</strong></div></div><div class="preview-progress-head"><span>Website Redesign</span><strong>68%</strong></div><div class="preview-progress"><i></i></div><div class="preview-task"><span class="preview-check">✓</span><span>Review homepage concepts</span><span class="preview-tag">Today</span></div><div class="preview-task"><span class="preview-check pending"></span><span>Share the design update</span><span class="preview-tag">Tomorrow</span></div><div class="preview-footer"><span class="avatar-stack"><i>S</i><i>A</i><i>M</i></span><span>One focused workspace, all in sync.</span></div></div><div class="auth-footnote">Secure sign-in · Your workspace belongs to you</div>
    </section><section class="auth-panel-wrap"><div class="auth-panel"><div class="auth-panel-heading"><span class="auth-panel-mark">${brandIcon}</span><p class="auth-overline">${signup ? 'GET STARTED' : 'WELCOME BACK'}</p><h2>${signup ? 'Create your account' : 'Log in to TaskFlow'}</h2><p class="auth-panel-sub">${signup ? 'A clear place for everything you want to move forward.' : 'Pick up where you left off and keep your day in flow.'}</p></div>
      <div class="auth-tabs" role="tablist" aria-label="Account access"><button class="auth-tab ${!signup ? 'active' : ''}" role="tab" aria-selected="${!signup}" data-auth-mode="login">Log in</button><button class="auth-tab ${signup ? 'active' : ''}" role="tab" aria-selected="${signup}" data-auth-mode="signup">Sign up</button></div>
      <form id="auth-form" class="auth-form" novalidate><label class="auth-field"><span>Email address</span><input class="input" id="auth-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required></label><label class="auth-field"><span>Password</span><span class="password-wrap"><input class="input" id="auth-password" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" placeholder="${signup ? 'At least 6 characters' : 'Enter your password'}" required><button type="button" class="password-toggle" id="password-toggle" aria-label="Show password">Show</button></span></label>${signup ? '<label class="auth-field"><span>Confirm password</span><input class="input" id="auth-confirm" name="confirm" type="password" autocomplete="new-password" minlength="6" placeholder="Enter your password again" required></label>' : '<button class="forgot-link" type="button" id="forgot-password">Forgot password?</button>'}${authMessage ? `<div class="auth-error" role="alert">${escapeHtml(authMessage)}</div>` : ''}<button class="btn primary auth-submit auth-primary" id="auth-submit" type="submit">${signup ? 'Create account' : 'Log in'}</button></form>
      <div class="auth-divider"><span></span><small>or continue with</small><span></span></div><button class="btn auth-google" id="google-sign-in" type="button">${googleMark()}Continue with Google</button><p class="auth-legal">Secure sign-in · Your workspace belongs to you</p>
    </div></section></div>
  </main>`;

  $$('[data-auth-mode]').forEach(button => button.onclick = () => { mode = button.dataset.authMode; authMessage = ''; renderAuthPage(); });
  $('#password-toggle').onclick = () => { const input = $('#auth-password'), reveal = input.type === 'password'; input.type = reveal ? 'text' : 'password'; $('#password-toggle').textContent = reveal ? 'Hide' : 'Show'; $('#password-toggle').setAttribute('aria-label', reveal ? 'Hide password' : 'Show password'); };
  $('#google-sign-in').onclick = async () => { authMessage = ''; busy(true); try { await signInWithGoogle(); } catch (error) { authMessage = readableError(error); renderAuthPage(); } };
  $('#forgot-password')?.addEventListener('click', async () => { const email = $('#auth-email').value.trim(); if (!email) { authMessage = 'Enter your email address first, then choose Forgot password.'; renderAuthPage(); $('#auth-email')?.focus(); return; } try { await sendPasswordReset(email); authMessage = 'Password reset email sent. Check your inbox.'; renderAuthPage(); } catch (error) { authMessage = readableError(error); renderAuthPage(); } });
  $('#auth-form').onsubmit = async event => {
    event.preventDefault();
    const email = $('#auth-email').value.trim(), password = $('#auth-password').value;
    authMessage = '';
    if (signup && password !== $('#auth-confirm').value) { authMessage = 'Your passwords do not match.'; renderAuthPage(); return; }
    busy(true);
    try {
      if (signup) await signUpWithEmail(email, password);
      else await signInWithEmail(email, password);
    } catch (error) { authMessage = readableError(error); renderAuthPage(); }
  };
}
