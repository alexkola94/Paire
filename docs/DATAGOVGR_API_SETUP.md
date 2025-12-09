# 📊 data.gov.gr API Setup Guide

## Overview

This guide explains how to configure the Greece Economic Data service to fetch real data from data.gov.gr.

---

## 🔑 Step 1: Get Your API Key

1. **Register at data.gov.gr:**
   - Visit: https://new.data.gov.gr/
   - Create an account or log in
   - Navigate to API settings or developer section
   - Request an API key
   - You'll receive the API key via email

2. **Add API Key to Configuration:**
   - Open `backend/YouAndMeExpensesAPI/appsettings.json`
   - Find the `DataGovGr` section
   - Replace `YOUR_API_KEY_HERE` with your actual API key:
   ```json
   "DataGovGr": {
     "ApiKey": "your-actual-api-key-here"
   }
   ```

---

## 🔍 Step 2: Find Dataset IDs

### API Endpoint Structure

The data.gov.gr API uses this structure:
```
https://data.gov.gr/api/v1/query/{dataset_id}?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
```

### How to Find Dataset IDs

1. **Visit data.gov.gr:**
   - Go to: https://new.data.gov.gr/
   - Browse or search for datasets

2. **For CPI (Consumer Price Index):**
   - Search for: "Consumer Price Index" or "CPI" or "Δείκτης Τιμών Καταναλωτή"
   - Look for ELSTAT datasets
   - Note the dataset identifier (e.g., `mcp_gr`, `cpi`, `consumer_price_index`)

3. **For Food Prices:**
   - Search for: "food prices" or "supermarket prices" or "τιμές τροφίμων"
   - Look for Ministry of Administrative Reform datasets
   - Note the dataset identifier

4. **For Economic Indicators:**
   - **GDP:** Search for "GDP" or "Gross Domestic Product" or "ΑΕΠ"
   - **Unemployment:** Search for "unemployment" or "ανεργία"
   - **Inflation:** Search for "inflation" or "πληθωρισμός"
   - **Household Income:** Search for "household income" or "εισόδημα νοικοκυριού"

---

## ⚙️ Step 3: Update Service Implementation

Once you have the dataset IDs, update the service:

### File: `backend/YouAndMeExpensesAPI/Services/GreeceEconomicDataService.cs`

1. **Update CPI Dataset ID:**
   ```csharp
   // Line ~50
   const string DATASET_ID_CPI = "your_cpi_dataset_id_here";
   ```

2. **Update Food Prices Dataset ID:**
   ```csharp
   // Line ~200
   const string DATASET_ID_FOOD_PRICES = "your_food_prices_dataset_id_here";
   ```

3. **Update Economic Indicators Dataset IDs:**
   ```csharp
   // Line ~280
   const string DATASET_ID_GDP = "your_gdp_dataset_id_here";
   const string DATASET_ID_UNEMPLOYMENT = "your_unemployment_dataset_id_here";
   const string DATASET_ID_INFLATION = "your_inflation_dataset_id_here";
   const string DATASET_ID_HOUSEHOLD_INCOME = "your_household_income_dataset_id_here";
   ```

---

## 🧪 Step 4: Test the API

### Test Individual Endpoints

You can test the API endpoints directly:

```bash
# Replace YOUR_API_KEY and DATASET_ID with actual values
curl -H "X-Api-Key: YOUR_API_KEY" \
  "https://data.gov.gr/api/v1/query/DATASET_ID?date_from=2024-01-01&date_to=2024-12-31"
```

### Check Response Structure

The API typically returns JSON arrays like:
```json
[
  {
    "date": "2024-01-01",
    "value": 2.5,
    "category": "CPI"
  },
  ...
]
```

### Update Parsing Logic if Needed

If the API response structure is different, update the parsing logic in:
- `GetCPIDataAsync()` - Lines ~60-170
- `GetFoodPricesAsync()` - Lines ~200-280
- `FetchIndicatorAsync()` - Lines ~320-380

---

## 📝 Example Dataset IDs (To Be Discovered)

Based on common patterns, dataset IDs might be:
- CPI: `mcp_gr`, `cpi`, `consumer_price_index`, `dtk`
- Food Prices: `food_prices`, `supermarket_prices`, `timi_trofimon`
- GDP: `gdp`, `aep`, `gross_domestic_product`
- Unemployment: `unemployment`, `anergia`, `unemployment_rate`
- Inflation: `inflation`, `plithorismos`, `inflation_rate`
- Household Income: `household_income`, `eisodima_noikokiriou`

**Note:** These are examples. You must verify the actual IDs on data.gov.gr.

---

## 🔧 Troubleshooting

### Error: "Failed to fetch data: 401"
- **Solution:** Check that your API key is correctly set in `appsettings.json`
- Verify the API key is valid and not expired

### Error: "Failed to fetch data: 404"
- **Solution:** The dataset ID is incorrect
- Verify the dataset ID exists on data.gov.gr
- Check the dataset is publicly available

### Error: "Unexpected API response format"
- **Solution:** The API response structure is different than expected
- Check the actual API response using curl or Postman
- Update the parsing logic in the service to match the actual structure

### Error: "Network error"
- **Solution:** Check internet connection
- Verify data.gov.gr is accessible
- Check firewall/proxy settings

---

## 📚 Additional Resources

- **data.gov.gr Portal:** https://new.data.gov.gr/
- **API Documentation:** https://new.data.gov.gr/data-service/
- **Python Client (for reference):** https://github.com/ilias-ant/pydatagovgr
- **Tutorial (Greek):** https://stesiam.com/el/posts/tutorial-govgr-api/

---

## ✅ Checklist

- [ ] Registered at data.gov.gr
- [ ] Received API key
- [ ] Added API key to `appsettings.json`
- [ ] Found CPI dataset ID
- [ ] Found food prices dataset ID
- [ ] Found GDP dataset ID
- [ ] Found unemployment dataset ID
- [ ] Found inflation dataset ID
- [ ] Found household income dataset ID
- [ ] Updated all dataset IDs in `GreeceEconomicDataService.cs`
- [ ] Tested API endpoints
- [ ] Verified response parsing works correctly
- [ ] Tested frontend integration

---

**Status:** Ready for configuration once dataset IDs are discovered.

