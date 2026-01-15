/**
 * Mock transaction data for TransactionTimeline component testing
 * Includes a variety of expenses and income across multiple dates
 */

// Helper to generate dates relative to today
const getDate = (daysAgo, hours = 12, minutes = 0) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

export const mockTransactions = [
  // Today's transactions
  {
    id: '1',
    date: getDate(0, 9, 30),
    description: 'Morning Coffee',
    amount: 4.50,
    type: 'expense',
    category: 'food'
  },
  {
    id: '2',
    date: getDate(0, 12, 15),
    description: 'Lunch at Restaurant',
    amount: 18.90,
    type: 'expense',
    category: 'food'
  },
  {
    id: '3',
    date: getDate(0, 14, 0),
    description: 'Freelance Payment',
    amount: 850.00,
    type: 'income',
    category: 'freelance'
  },
  {
    id: '4',
    date: getDate(0, 16, 45),
    description: 'Grocery Shopping',
    amount: 67.35,
    type: 'expense',
    category: 'groceries'
  },

  // Yesterday's transactions
  {
    id: '5',
    date: getDate(1, 8, 0),
    description: 'Monthly Salary',
    amount: 3500.00,
    type: 'income',
    category: 'salary'
  },
  {
    id: '6',
    date: getDate(1, 10, 30),
    description: 'Electric Bill',
    amount: 85.20,
    type: 'expense',
    category: 'utilities'
  },
  {
    id: '7',
    date: getDate(1, 15, 20),
    description: 'Netflix Subscription',
    amount: 15.99,
    type: 'expense',
    category: 'subscription'
  },
  {
    id: '8',
    date: getDate(1, 18, 0),
    description: 'Gift from Parent',
    amount: 200.00,
    type: 'income',
    category: 'gift'
  },

  // 2 days ago
  {
    id: '9',
    date: getDate(2, 9, 0),
    description: 'Gym Membership',
    amount: 45.00,
    type: 'expense',
    category: 'gym'
  },
  {
    id: '10',
    date: getDate(2, 11, 30),
    description: 'Public Transport',
    amount: 12.50,
    type: 'expense',
    category: 'transport'
  },
  {
    id: '11',
    date: getDate(2, 14, 45),
    description: 'Investment Dividend',
    amount: 125.00,
    type: 'income',
    category: 'investment'
  },

  // 3 days ago
  {
    id: '12',
    date: getDate(3, 10, 0),
    description: 'Internet Bill',
    amount: 49.99,
    type: 'expense',
    category: 'internet'
  },
  {
    id: '13',
    date: getDate(3, 13, 0),
    description: 'New Headphones',
    amount: 89.99,
    type: 'expense',
    category: 'electronics'
  },
  {
    id: '14',
    date: getDate(3, 16, 30),
    description: 'Side Project Payment',
    amount: 450.00,
    type: 'income',
    category: 'freelance'
  },

  // 4 days ago
  {
    id: '15',
    date: getDate(4, 8, 30),
    description: 'Breakfast Takeout',
    amount: 12.50,
    type: 'expense',
    category: 'food'
  },
  {
    id: '16',
    date: getDate(4, 12, 0),
    description: 'Doctor Visit',
    amount: 75.00,
    type: 'expense',
    category: 'healthcare'
  },
  {
    id: '17',
    date: getDate(4, 14, 15),
    description: 'Car Insurance',
    amount: 125.00,
    type: 'expense',
    category: 'insurance'
  },

  // 5 days ago
  {
    id: '18',
    date: getDate(5, 9, 45),
    description: 'Phone Bill',
    amount: 35.00,
    type: 'expense',
    category: 'phone'
  },
  {
    id: '19',
    date: getDate(5, 11, 0),
    description: 'Online Course',
    amount: 29.99,
    type: 'expense',
    category: 'education'
  },
  {
    id: '20',
    date: getDate(5, 15, 30),
    description: 'Referral Bonus',
    amount: 50.00,
    type: 'income',
    category: 'gift'
  },

  // 6 days ago
  {
    id: '21',
    date: getDate(6, 10, 0),
    description: 'Concert Tickets',
    amount: 120.00,
    type: 'expense',
    category: 'entertainment'
  },
  {
    id: '22',
    date: getDate(6, 14, 0),
    description: 'Monthly Rent',
    amount: 1200.00,
    type: 'expense',
    category: 'rent'
  },

  // 7 days ago
  {
    id: '23',
    date: getDate(7, 9, 0),
    description: 'Spotify Premium',
    amount: 9.99,
    type: 'expense',
    category: 'subscription'
  },
  {
    id: '24',
    date: getDate(7, 12, 30),
    description: 'Clothing Purchase',
    amount: 89.50,
    type: 'expense',
    category: 'clothing'
  },
  {
    id: '25',
    date: getDate(7, 16, 0),
    description: 'Consulting Fee',
    amount: 300.00,
    type: 'income',
    category: 'freelance'
  },

  // Additional older transactions for scrolling test
  {
    id: '26',
    date: getDate(8, 11, 0),
    description: 'Home Supplies',
    amount: 45.80,
    type: 'expense',
    category: 'household'
  },
  {
    id: '27',
    date: getDate(8, 14, 30),
    description: 'Tax Refund',
    amount: 750.00,
    type: 'income',
    category: 'other'
  },
  {
    id: '28',
    date: getDate(9, 10, 15),
    description: 'Haircut',
    amount: 35.00,
    type: 'expense',
    category: 'personal'
  },
  {
    id: '29',
    date: getDate(9, 15, 0),
    description: 'Uber Ride',
    amount: 22.50,
    type: 'expense',
    category: 'transport'
  },
  {
    id: '30',
    date: getDate(10, 9, 0),
    description: 'Water Bill',
    amount: 42.00,
    type: 'expense',
    category: 'utilities'
  },
  {
    id: '31',
    date: getDate(10, 13, 45),
    description: 'Book Purchase',
    amount: 24.99,
    type: 'expense',
    category: 'education'
  },
  {
    id: '32',
    date: getDate(11, 10, 30),
    description: 'Coffee Machine',
    amount: 199.00,
    type: 'expense',
    category: 'electronics'
  },
  {
    id: '33',
    date: getDate(11, 16, 0),
    description: 'Stock Dividend',
    amount: 85.50,
    type: 'income',
    category: 'investment'
  },
  {
    id: '34',
    date: getDate(12, 8, 45),
    description: 'Pet Food',
    amount: 55.00,
    type: 'expense',
    category: 'household'
  },
  {
    id: '35',
    date: getDate(12, 14, 20),
    description: 'Loan Repayment',
    amount: 250.00,
    type: 'expense',
    category: 'loan'
  },
  {
    id: '36',
    date: getDate(13, 11, 0),
    description: 'Movie Night',
    amount: 35.00,
    type: 'expense',
    category: 'entertainment'
  },
  {
    id: '37',
    date: getDate(13, 15, 30),
    description: 'Birthday Gift Received',
    amount: 100.00,
    type: 'income',
    category: 'gift'
  },
  {
    id: '38',
    date: getDate(14, 9, 15),
    description: 'Pharmacy',
    amount: 28.50,
    type: 'expense',
    category: 'healthcare'
  },
  {
    id: '39',
    date: getDate(14, 12, 0),
    description: 'Gas Station',
    amount: 65.00,
    type: 'expense',
    category: 'transport'
  },
  {
    id: '40',
    date: getDate(14, 17, 0),
    description: 'Side Hustle Income',
    amount: 175.00,
    type: 'income',
    category: 'freelance'
  }
]

// Generate large dataset for performance testing
export const generateLargeDataset = (count = 1000) => {
  const categories = {
    expense: ['food', 'groceries', 'transport', 'utilities', 'entertainment', 'healthcare', 'shopping', 'subscription', 'rent', 'insurance'],
    income: ['salary', 'freelance', 'investment', 'gift', 'other']
  }

  const descriptions = {
    expense: {
      food: ['Coffee', 'Lunch', 'Dinner', 'Breakfast', 'Snacks'],
      groceries: ['Weekly Groceries', 'Supermarket', 'Fresh Produce', 'Pantry Items'],
      transport: ['Uber', 'Bus Pass', 'Gas', 'Metro Card', 'Taxi'],
      utilities: ['Electric Bill', 'Water Bill', 'Gas Bill', 'Heating'],
      entertainment: ['Movie Tickets', 'Concert', 'Streaming Service', 'Gaming'],
      healthcare: ['Doctor Visit', 'Pharmacy', 'Dental', 'Eye Care'],
      shopping: ['Clothing', 'Electronics', 'Home Goods', 'Online Shopping'],
      subscription: ['Netflix', 'Spotify', 'Amazon Prime', 'Cloud Storage'],
      rent: ['Monthly Rent', 'Rent Payment'],
      insurance: ['Car Insurance', 'Health Insurance', 'Home Insurance']
    },
    income: {
      salary: ['Monthly Salary', 'Bonus', 'Overtime Pay'],
      freelance: ['Client Payment', 'Project Fee', 'Consulting'],
      investment: ['Stock Dividend', 'Interest Income', 'Crypto Gains'],
      gift: ['Birthday Gift', 'Holiday Gift', 'Cash Gift'],
      other: ['Refund', 'Reimbursement', 'Other Income']
    }
  }

  const transactions = []

  for (let i = 0; i < count; i++) {
    const type = Math.random() > 0.7 ? 'income' : 'expense'
    const categoryList = categories[type]
    const category = categoryList[Math.floor(Math.random() * categoryList.length)]
    const descList = descriptions[type][category]
    const description = descList[Math.floor(Math.random() * descList.length)]

    const daysAgo = Math.floor(i / 5) // ~5 transactions per day
    const hours = 8 + Math.floor(Math.random() * 12)
    const minutes = Math.floor(Math.random() * 60)

    const amount = type === 'income'
      ? Math.floor(Math.random() * 3000) + 50
      : Math.floor(Math.random() * 200) + 5

    transactions.push({
      id: `gen-${i}`,
      date: getDate(daysAgo, hours, minutes),
      description,
      amount: parseFloat(amount.toFixed(2)),
      type,
      category
    })
  }

  return transactions
}

export default mockTransactions
