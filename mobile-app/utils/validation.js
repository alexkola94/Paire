/**
 * Validation utility for form fields (ported from frontend).
 * Used by FormField and other components.
 */

export function validateField(value, rules = []) {
  if (!rules || rules.length === 0) {
    return { isValid: true, message: '', type: 'success' };
  }
  for (const rule of rules) {
    const { type, params = [], message } = rule;
    let result;
    switch (type) {
      case 'required':
        result =
          value !== null &&
          value !== undefined &&
          value !== '' &&
          (!Array.isArray(value) || value.length > 0);
        if (!result) return { isValid: false, message: message || 'This field is required', type: 'error' };
        break;
      case 'minLength':
        result = !value || value.length >= (params[0] || 0);
        if (!result)
          return {
            isValid: false,
            message: message || `Minimum length is ${params[0]} characters`,
            type: 'error',
          };
        break;
      case 'maxLength':
        result = !value || value.length <= (params[0] || Infinity);
        if (!result)
          return {
            isValid: false,
            message: message || `Maximum length is ${params[0]} characters`,
            type: 'error',
          };
        break;
      case 'email':
        if (!value) break;
        result = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        if (!result)
          return { isValid: false, message: message || 'Please enter a valid email', type: 'error' };
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
