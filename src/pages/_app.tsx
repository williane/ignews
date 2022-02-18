import { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { Header } from "../components/Header";

import "../styles/global.scss";

interface AppSessionProps extends AppProps {
  session: any;
}

function MyApp({ session, Component, pageProps }: AppSessionProps) {
  return (
    <SessionProvider session={session}>
      <Header />
      <Component {...pageProps} />
    </SessionProvider>
  );
}

export default MyApp;
