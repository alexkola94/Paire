/**
 * Validation utility for form fields (ported from frontend).
 * Used by FormField and other components.
 * When rule does not provide a custom message, returns messageKey and messageParams
 * so the UI can translate via t(messageKey, { field: label, ...messageParams }).
 */

export function validateField(value, rules = []) {
  if (!rules || rules.length === 0) {
    return { isValid: true, message: '', type: 'success' };
  }
  for (const rule of rules) {
    const { type, params = [], message, messageKey, messageParams = {} } = rule;
    let result;
    switch (type) {
      case 'required':
        result =
          value !== null &&
          value !== undefined &&
          value !== '' &&
          (!Array.isArray(value) || value.length > 0);
        if (!result) {
          if (message) return { isValid: false, message, type: 'error' };
          return {
            isValid: false,
            messageKey: messageKey || 'validation.required',
            messageParams,
            type: 'error',
          };
        }
        break;
      case 'minLength':
        result = !value || value.length >= (params[0] || 0);
        if (!result) {
          if (message)
            return { isValid: false, message, type: 'error' };
          return {
            isValid: false,
            messageKey: messageKey || 'validation.minLength',
            messageParams: { ...messageParams, min: params[0] || 0 },
            type: 'error',
          };
        }
        break;
      case 'maxLength':
        result = !value || value.length <= (params[0] || Infinity);
        if (!result) {
          if (message)
            return { isValid: false, message, type: 'error' };
          return {
            isValid: false,
            messageKey: messageKey || 'validation.maxLength',
            messageParams: { ...messageParams, max: params[0] },
            type: 'error',
          };
        }
        break;
      case 'email':
        if (!value) break;
        result = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        if (!result) {
          if (message) return { isValid: false, message, type: 'error' };
          return {
            isValid: false,
            messageKey: messageKey || 'validation.email',
            messageParams,
            type: 'error',
          };
        }
        break;
      default:
        break;
    }
  }
  return { isValid: true, message: '', type: 'success' };
}

export function getCharacterCount(value) {
  return value ? value.length : 0;
}

export function getWordCount(value) {
  if (!value || !value.trim()) return 0;
  return value.trim().split(/\s+/).length;
}
