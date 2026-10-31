import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        skin: {
          DEFAULT: '#F5E8DC',
          light: '#FAF2EB',
        },
        kiwi: {
          DEFAULT: '#9ABC05',
        },
        lime: {
          DEFAULT: '#B5F800',
        },
        blue: {
          DEFAULT: '#0036FF',
        },
        green: {
          DEFAULT: '#1EA854',
          civic: '#1EA854',
          resolved: '#9ABC05',
        },
      },
      fontFamily: {
        anton: ['Anton', 'sans-serif'],
        archivo: ['"Archivo Variable"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
