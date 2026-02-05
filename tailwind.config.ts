import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#007BFF",
                secondary: "#A8D5BA",
                success: "#28A745",
                warning: "#FFC107",
                background: "#F8F9FA",
                foreground: "#212529",
            },
        },
    },
    plugins: [],
};
export default config;
