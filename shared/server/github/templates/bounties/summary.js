import { getNEArrowIconSVG } from '@/shared/components/Icons';

export function renderBountySummaryComment({
  iconUrl,
  amountFormatted,
  tokenSymbol,
  networkName,
  deadlineDate,
  txUrl,
  linkWalletUrl,
  brandSignature
}) {
  const arrowIcon = getNEArrowIconSVG(12, "currentColor");
  return `## <img src="${iconUrl}" alt="BountyPay Icon" width="20" height="20" /> Bounty: ${amountFormatted} ${tokenSymbol} on ${networkName} · Open · Deadline: ${deadlineDate}

Open a PR that fixes this issue.
On merge, payment is sent automatically.

New here? <a href="${linkWalletUrl}" target="_blank" rel="noopener noreferrer">Create account & link wallet.</a>
<a href="${txUrl}" target="_blank" rel="noopener noreferrer">**Tx** ${arrowIcon}</a>

${brandSignature}`;
}

