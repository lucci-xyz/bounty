export function goBackOrPush(router, fallback = '/') {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back();
  } else {
    router.push(fallback);
  }
}

export function redirectToGithubSignIn(returnTo = '/') {
  if (typeof window === 'undefined') {
    return;
  }
  window.location.href = `/api/oauth/github?returnTo=${encodeURIComponent(returnTo)}`;
}

