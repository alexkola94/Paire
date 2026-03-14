import { apiRequest } from '../../../shared/services/apiClient'

export const currencyService = {
  async getCurrencies() {
    return await apiRequest('/api/currency/list')
  },
  async getRates(baseCurrency) {
    return await apiRequest(`/api/currency/rates?baseCurrency=${baseCurrency}`)
  },
  async convert(from, to, amount) {
    return await apiRequest(`/api/currency/convert?from=${from}&to=${to}&amount=${amount}`)
  }
}
