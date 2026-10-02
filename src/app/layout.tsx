import type { Metadata } from "next";
import wporgStyles from "@/wporg-styles.json";
import "./globals.css";

export const metadata: Metadata = {
  title: "Try WordPress",
  description: "Explore a live WordPress site right in your browser. No sign-up, no hosting.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-US">
      <head>
        {/* wordpress.org's vendored theme, block, and font CSS (see scripts/vendor-wporg.py). */}
        {wporgStyles.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      {/* wordpress.org's body classes, so its global styles and design tokens apply. */}
      <body className="wp-singular page-template page-template-page-download page wp-embed-responsive wp-theme-wporg-parent-2021 wp-child-theme-wporg-main-2022">
        {children}
      </body>
    </html>
  );
}
