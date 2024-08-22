/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "custom-dark-blue": "rgb(34, 40, 49)", // Darker shade
        "custom-light-blue": "rgb(85, 95, 104)", // Lighter shade
      },
      backgroundImage: {
        "custom-gradient":
          "linear-gradient(to bottom, rgb(34, 40, 49), rgb(85, 95, 104))",
      },
    },
  },
  plugins: [],
};
