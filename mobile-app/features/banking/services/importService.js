/**
 * Bank Statement Import Service
 */

import { request } from '../../../shared/services/apiClient';

function normalizeImportHistoryItem(item) {
  if (!item) return null;
  return {
    id: item.id ?? item.Id,
    fileName: item.fileName ?? item.FileName,
    importDate: item.importDate ?? item.ImportDate,
    transactionCount: item.transactionCount ?? item.TransactionCount ?? 0,
    totalAmount: item.totalAmount ?? item.TotalAmount ?? 0,
  };
}

export const importService = {
  async getImportHistory() {
    const data = await request('get', '/api/imports');
    const list = Array.isArray(data) ? data : [];
    return list.map(normalizeImportHistoryItem).filter(Boolean);
  },
  async revertImport(id) { await request('delete', `/api/imports/${id}`); },
  async importTransactions(fileAsset) {
    const formData = new FormData();
    formData.append('file', {
      uri: fileAsset.uri,
      name: fileAsset.name || 'statement.csv',
      type: fileAsset.mimeType || 'text/csv',
    });
    return request('post', '/api/transactions/import', formData);
  },
};
