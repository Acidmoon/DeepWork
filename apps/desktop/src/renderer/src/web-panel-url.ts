import { normalizeWebPanelUrl, type WebPanelUrlValidationError, type WebPanelUrlValidationResult } from '@ai-workbench/core/desktop/web-panels'
import { getUiText, type SupportedLocale } from './i18n'

export function validateWebPanelUrl(rawUrl: string): WebPanelUrlValidationResult {
  return normalizeWebPanelUrl(rawUrl)
}

export function getWebPanelUrlValidationMessage(
  error: WebPanelUrlValidationError | null,
  locale: SupportedLocale
): string {
  const ui = getUiText(locale)

  switch (error) {
    case 'empty':
      return ui.webUrlEmpty
    case 'unsupported-protocol':
      return ui.webUrlUnsupportedProtocol
    case 'invalid':
    default:
      return ui.webUrlInvalid
  }
}
