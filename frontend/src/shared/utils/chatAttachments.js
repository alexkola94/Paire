/**
 * Utilities for chat attachments: convert file to base64, read text, extract PDF text.
 * Used by Chatbot and TravelChatbot to build attachment payloads for the AI API.
 */
import * as pdfjsLib from 'pdfjs-dist'

/**
 * Convert a File to base64 data URL string (without the data:...;base64, prefix for API).
 * @param {File} file
 * @returns {Promise<string>} Base64 string
 */
export function fileToBase64 (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
        const base64 = dataUrl.split(',')[1] || ''
        resolve(base64)
      } else {
        reject(new Error('Failed to read file as base64'))
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Read a text file as string.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsText (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/**
 * Extract text from a PDF file using PDF.js.
 * @param {File} file
 * @returns {Promise<string>} Extracted text (plain)
 */
export async function extractPdfText (file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const numPages = pdf.numPages
    const parts = []
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const text = content.items.map(item => item.str).join(' ')
      parts.push(text)
    }
    return parts.join('\n\n').trim() || '(No text extracted from PDF)'
  } catch (err) {
    console.warn('PDF text extraction failed:', err)
    return '(Could not extract text from PDF)'
  }
}

/**
 * Build API attachment payload from chat attachment list (File + type).
 * Images -> base64; PDF/txt -> extracted text.
 * @param {Array<{ file: File, type: string, name: string }>} attachments
 * @returns {Promise<Array<{ type: string, data: string, name?: string }>>}
 */
export async function buildAttachmentsPayload (attachments) {
  if (!attachments?.length) return []
  const payload = []
  for (const att of attachments) {
    try {
      if (att.type === 'image') {
        const data = await fileToBase64(att.file)
        payload.push({ type: 'image', data, name: att.name })
      } else if (att.type === 'document') {
        const isPdf = att.file.name.toLowerCase().endsWith('.pdf')
        const text = isPdf
          ? await extractPdfText(att.file)
          : await readFileAsText(att.file)
        if (text) payload.push({ type: 'text', data: text, name: att.name })
      }
    } catch (err) {
      console.warn('Failed to process attachment:', att.name, err)
    }
  }
  return payload
}
