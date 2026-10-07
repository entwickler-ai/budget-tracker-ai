// BudgetTrackerAi/tailwind.config.js
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/**/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5',
        secondary: '#10B981',
        background: '#F9FAFB',
        text: '#1F2937',
        muted: '#6B7280',
        error: '#EF4444',
        accent: '#007AFF'
      }
    }
  },
  plugins: []
};