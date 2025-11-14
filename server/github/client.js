import { App } from 'octokit';
import { CONFIG } from '../config.js';

let githubApp;

/**
 * Initialize GitHub App client
 */
export function initGitHubApp() {
  githubApp = new App({
    appId: CONFIG.github.appId,
    privateKey: CONFIG.github.privateKey,
    webhooks: {
      secret: CONFIG.github.webhookSecret
    }
  });

  console.log('GitHub App initialized');
  return githubApp;
}

/**
 * Get GitHub App instance
 */
export function getGitHubApp() {
  if (!githubApp) {
    throw new Error('GitHub App not initialized');
  }
  return githubApp;
}

/**
 * Get Octokit instance for a specific installation
 */
export async function getOctokit(installationId) {
  if (!githubApp) {
    throw new Error('GitHub App not initialized. Check your GitHub App configuration.');
  }
  return await githubApp.getInstallationOctokit(installationId);
}

/**
 * Post a comment on an issue
 */
export async function postIssueComment(octokit, owner, repo, issueNumber, body) {
  const { data } = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body
  });
  return data;
}

/**
 * Update an existing comment
 */
export async function updateComment(octokit, owner, repo, commentId, body) {
  const { data } = await octokit.rest.issues.updateComment({
    owner,
    repo,
    comment_id: commentId,
    body
  });
  return data;
}

/**
 * Pin a comment to an issue
 */
export async function pinComment(octokit, owner, repo, commentId) {
  try {
    // Note: Pinning is done via GraphQL, this is a placeholder
    // For now, we'll just mark it in our DB
    return true;
  } catch (error) {
    console.error('Error pinning comment:', error);
    return false;
  }
}

/**
 * Add label to an issue
 */
export async function addLabels(octokit, owner, repo, issueNumber, labels) {
  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels
  });
}

export async function ensureLabel(octokit, owner, repo, name, color, description = '') {
  const normalizedColor = color.replace('#', '').toLowerCase();
  try {
    const { data: existing } = await octokit.rest.issues.getLabel({
      owner,
      repo,
      name
    });

    if (existing.color?.toLowerCase() !== normalizedColor || (description && existing.description !== description)) {
      await octokit.rest.issues.updateLabel({
        owner,
        repo,
        name,
        color: normalizedColor,
        description
      });
    }
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }

    await octokit.rest.issues.createLabel({
      owner,
      repo,
      name,
      color: normalizedColor,
      description
    });
  }
}

/**
 * Get PR details
 */
export async function getPR(octokit, owner, repo, prNumber) {
  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber
  });
  return data;
}

/**
 * Check if PR closes an issue (parse PR body for "Closes #123")
 */
export function extractClosedIssues(prBody) {
  if (!prBody) return [];
  
  // Match variations: Closes #123, Fixes #456, Resolves #789
  const regex = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
  const matches = [...prBody.matchAll(regex)];
  
  return matches.map(match => parseInt(match[1]));
}

/**
 * Extract ALL issue numbers mentioned in PR title or body
 */
export function extractMentionedIssues(prTitle, prBody) {
  const text = `${prTitle} ${prBody || ''}`;
  if (!text) return [];
  
  // Match any #123 pattern
  const regex = /#(\d+)/g;
  const matches = [...text.matchAll(regex)];
  
  // Return unique issue numbers
  return [...new Set(matches.map(match => parseInt(match[1])))];
}

/**
 * Get user details
 */
export async function getUser(octokit, username) {
  const { data } = await octokit.rest.users.getByUsername({
    username
  });
  return data;
}

export { githubApp };
