import { createRoot } from 'react-dom/client'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import App from 'App'
import { HashRouter } from 'react-router-dom'
import { HelmetProvider } from "react-helmet-async"
// provider
import AppProvider from 'modules'

const emotionCache = createCache({
	key: 'lyra',
	nonce: undefined,
	prepend: true,
});
emotionCache.compat = true;

const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
	<CacheProvider value={emotionCache}>
		<HashRouter>
			<AppProvider>
				<HelmetProvider>
					<App />
				</HelmetProvider>
			</AppProvider>
		</HashRouter>
	</CacheProvider>
);
