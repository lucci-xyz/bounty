import { logger } from '@/lib/logger';
import { App } from 'octokit';
import { CONFIG } from '@/server/config.js';
import { extractClosedIssues, extractMentionedIssues } from './issueRefs.js';

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

  logger.info('GitHub App initialized');
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

/**
 * Remove a label from an issue
 */
export async function removeLabel(octokit, owner, repo, issueNumber, labelName) {
  try {
    await octokit.rest.issues.removeLabel({
      owner,
      repo,
      issue_number: issueNumber,
      name: labelName
    });
  } catch (error) {
    // Label might not exist or already be removed - non-critical
    if (error.status !== 404) {
      throw error;
    }
  }
}

/**
 * Get all labels on an issue
 */
export async function getIssueLabels(octokit, owner, repo, issueNumber) {
  const { data } = await octokit.rest.issues.listLabelsOnIssue({
    owner,
    repo,
    issue_number: issueNumber
  });
  return data;
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

// Issue-reference parsing lives in ./issueRefs.js (pure, dependency-free).
// Re-exported here for backwards compatibility with existing imports.
export { extractClosedIssues, extractMentionedIssues };

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
