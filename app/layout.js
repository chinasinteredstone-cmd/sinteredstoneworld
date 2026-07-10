// Force rebuild: refine layout structure
export const metadata = {
  title: 'Wharton Building Material',
  description: 'Foshan Wharton Building Material Co., Ltd.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
