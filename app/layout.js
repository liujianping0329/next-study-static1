export const metadata = { title: 'Study', description: 'Static study pages' };
export default function RootLayout({ children }) {
  return <html lang="zh-CN"><body style={{ margin: 0 }}>{children}</body></html>;
}