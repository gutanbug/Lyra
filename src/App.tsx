import { useState } from 'react'
import { Switch, Route } from 'react-router-dom'
// Pages
import LayoutPage from 'pages/LayoutPage'
import SplashScreen from 'components/common/SplashScreen'

const App = () => {
	const [showSplash, setShowSplash] = useState(true);

	return (
		<>
			{showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
			<Switch>
				<Route path="/" component={LayoutPage} />
			</Switch>
		</>
	);
}

export default App