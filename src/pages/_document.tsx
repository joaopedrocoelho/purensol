import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" type="image/png" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="48x48" href="/favicon-48x48.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/favicon-72x72.png" />
        <link rel="apple-touch-icon" sizes="96x96" href="/favicon-96x96.png" />
        <link
          rel="apple-touch-icon"
          sizes="256x256"
          href="/favicon-256x256.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="384x384"
          href="/favicon-384x384.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="512x512"
          href="/favicon-512x512.png"
        />
        <link
          rel="manifest"
          href="/manifest.webmanifest"
          crossOrigin="anonymous"
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
