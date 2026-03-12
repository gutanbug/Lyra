import { StrictMode } from 'react'
import ReactDOM from 'react-dom'
import App from 'App'
import * as serviceWorker from './serviceWorker'
import { HashRouter } from 'react-router-dom'
import { HelmetProvider } from "react-helmet-async"
// provider
import AppProvider from 'modules'

ReactDOM.render(
	<StrictMode>
		<HashRouter>
			<AppProvider>
				<HelmetProvider>
					<App />
				</HelmetProvider>
			</AppProvider>
		</HashRouter>
	</StrictMode>, 
	document.getElementById('root')
);

serviceWorker.unregister();